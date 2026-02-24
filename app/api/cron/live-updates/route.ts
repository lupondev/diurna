import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateContent } from '@/lib/ai/client'
import { Prisma } from '@prisma/client'
import { htmlToTiptap } from '@/lib/autopilot'
import { getLiveMatches } from '@/lib/api-football'

export const maxDuration = 30

export async function GET(req: NextRequest) {
  // Dual auth: Bearer token (cron) or admin session (UI)
  const authHeader = req.headers.get('authorization')
  const cronHeader = req.headers.get('x-cron-secret')
  const secret = process.env.CRON_SECRET
  let sessionOrgId: string | undefined

  if (secret && authHeader !== `Bearer ${secret}` && cronHeader !== secret) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    sessionOrgId = session.user.organizationId
  }

  try {
    const where: { isActive: boolean; liveArticles: boolean; orgId?: string } = { isActive: true, liveArticles: true }
    if (sessionOrgId) where.orgId = sessionOrgId

    const configs = await prisma.autopilotConfig.findMany({ where })

    const results: {
      orgId: string
      action: string
      articleId?: string
      matchId?: string
    }[] = []

    // Fetch live matches from API-Football directly (no matchResult DB dependency)
    const liveMatches = await getLiveMatches()

    for (const config of configs) {
      const site = await prisma.site.findFirst({
        where: { organizationId: config.orgId, domain: { not: null } },
      }) || await prisma.site.findFirst({
        where: { organizationId: config.orgId },
      })
      if (!site) continue

      if (liveMatches.length === 0) {
        results.push({ orgId: config.orgId, action: 'no_live_matches' })
        continue
      }

      for (const match of liveMatches) {
        // Only process matches that are actually live (not scheduled/ft)
        if (match.status !== 'live') continue

        const matchId = match.id
        const homeTeam = match.home
        const awayTeam = match.away
        const score = `${match.homeScore ?? 0}-${match.awayScore ?? 0}`

        const existingArticle = await prisma.article.findFirst({
          where: {
            siteId: site.id,
            aiPrompt: { contains: matchId },
            aiGenerated: true,
          },
          orderBy: { createdAt: 'desc' },
        })

        // Get related news items for context
        const matchNews = await prisma.newsItem.findMany({
          where: {
            OR: [
              { title: { contains: homeTeam, mode: 'insensitive' } },
              { title: { contains: awayTeam, mode: 'insensitive' } },
            ],
            pubDate: { gte: new Date(Date.now() - 3 * 60 * 60 * 1000) },
          },
          orderBy: { pubDate: 'desc' },
          take: 3,
        })

        const latestUpdates = matchNews.map((n) => n.title).join('. ')
        const lang = config.translateLang === 'bs' ? 'Bosnian' : 'English'

        if (existingArticle) {
          // ── Update existing LIVE article ──
          const ai = await generateContent({
            system: `You are a live sports reporter. Output valid JSON only.\nWrite in ${lang}.\n\nJSON format:\n{\n  "title": "Updated headline with current score",\n  "content": "Updated HTML article with latest info. Keep it concise, 3-5 paragraphs.",\n  "excerpt": "1-sentence update"\n}`,
            prompt: `UPDATE this LIVE match article:\n\nMATCH: ${homeTeam} ${score} ${awayTeam}\nMINUTE: ${match.minute ?? '?'}'\n${latestUpdates ? `LATEST NEWS: ${latestUpdates}` : ''}\n\nKeep all previous facts, add new updates at the top.`,
            maxTokens: 2000,
            temperature: 0.2,
          })

          try {
            let cleaned = ai.text.trim()
            if (cleaned.startsWith('```')) {
              cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
            }
            const parsed = JSON.parse(cleaned)
            const tiptap = htmlToTiptap(parsed.content || '')

            await prisma.article.update({
              where: { id: existingArticle.id },
              data: {
                title: parsed.title || existingArticle.title,
                content: tiptap as unknown as Prisma.InputJsonValue,
                excerpt: parsed.excerpt || existingArticle.excerpt,
                updatedAt: new Date(),
              },
            })

            results.push({
              orgId: config.orgId,
              action: 'updated_live',
              articleId: existingArticle.id,
              matchId,
            })
          } catch {
            results.push({
              orgId: config.orgId,
              action: 'update_parse_error',
              matchId,
            })
          }
        } else {
          // ── Create new LIVE article ──
          const ai = await generateContent({
            system: `You are a live sports reporter. Output valid JSON only.\nWrite in ${lang}.\n\nJSON format:\n{\n  "title": "LIVE: Home Team X-X Away Team — matchday coverage",\n  "content": "HTML article. Start with current score and status. 3-4 paragraphs.",\n  "excerpt": "1-sentence summary",\n  "seo": {\n    "slug": "url-safe-slug",\n    "metaTitle": "max 60 chars",\n    "metaDescription": "max 155 chars"\n  }\n}`,
            prompt: `Create a LIVE match article:\n\nMATCH: ${homeTeam} ${score} ${awayTeam}\nMINUTE: ${match.minute ?? '?'}'\n${latestUpdates ? `LATEST NEWS: ${latestUpdates}` : ''}`,
            maxTokens: 2000,
            temperature: 0.2,
          })

          try {
            let cleaned = ai.text.trim()
            if (cleaned.startsWith('```')) {
              cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
            }
            const parsed = JSON.parse(cleaned)
            const tiptap = htmlToTiptap(parsed.content || '')

            const baseSlug =
              parsed.seo?.slug ||
              `live-${homeTeam}-vs-${awayTeam}`
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
            let slug = baseSlug
            let suffix = 1
            while (
              await prisma.article.findFirst({
                where: { siteId: site.id, slug },
              })
            ) {
              slug = `${baseSlug}-${suffix++}`
            }

            // Use vijesti category (consistent with autopilot)
            const category = await prisma.category.findFirst({
              where: { siteId: site.id, slug: 'vijesti' },
            })

            const article = await prisma.article.create({
              data: {
                siteId: site.id,
                title: parsed.title || `LIVE: ${homeTeam} ${score} ${awayTeam}`,
                slug,
                content: tiptap as unknown as Prisma.InputJsonValue,
                excerpt: parsed.excerpt || '',
                status: 'PUBLISHED',
                publishedAt: new Date(),
                categoryId: category?.id || null,
                aiGenerated: true,
                aiModel: ai.model,
                aiPrompt: JSON.stringify({
                  type: 'live_match',
                  matchId,
                }),
                metaTitle:
                  parsed.seo?.metaTitle ||
                  `LIVE: ${homeTeam} ${score} ${awayTeam}`,
                metaDescription: parsed.seo?.metaDescription || parsed.excerpt || '',
              },
            })

            results.push({
              orgId: config.orgId,
              action: 'created_live',
              articleId: article.id,
              matchId,
            })
          } catch {
            results.push({
              orgId: config.orgId,
              action: 'create_parse_error',
              matchId,
            })
          }
        }
      }
    }

    return NextResponse.json({ processed: configs.length, liveMatches: liveMatches.length, results })
  } catch (error) {
    console.error('Live updates cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
