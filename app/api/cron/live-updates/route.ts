import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateContent } from '@/lib/ai/client'
import { Prisma } from '@prisma/client'
import { htmlToTiptap } from '@/lib/autopilot'

export const maxDuration = 30

export async function GET(req: NextRequest) {
  // Dual auth: Bearer token (cron) or admin session (UI)
  const authHeader = req.headers.get('authorization')
  let sessionOrgId: string | undefined
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    sessionOrgId = session.user.organizationId
  }

  try {
    const where: { isActive: boolean; liveArticles: boolean; orgId?: string } = { isActive: true, liveArticles: true }
    if (sessionOrgId) where.orgId = sessionOrgId

    const configs = await prisma.autopilotConfig.findMany({
      where,
    })

    const results: {
      orgId: string
      action: string
      articleId?: string
      matchId?: string
    }[] = []

    for (const config of configs) {
      const site = await prisma.site.findFirst({
        where: { organizationId: config.orgId },
      })
      if (!site) continue

      const liveMatches = await prisma.matchResult.findMany({
        where: {
          status: { in: ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'] },
          matchDate: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
        },
        orderBy: { matchDate: 'asc' },
      })

      for (const match of liveMatches) {
        const existingArticle = await prisma.article.findFirst({
          where: {
            siteId: site.id,
            aiPrompt: { contains: match.id },
            aiGenerated: true,
          },
          orderBy: { createdAt: 'desc' },
        })

        const score =
          match.homeScore != null && match.awayScore != null
            ? `${match.homeScore}-${match.awayScore}`
            : '0-0'

        const matchNews = await prisma.newsItem.findMany({
          where: {
            OR: [
              { title: { contains: match.homeTeam, mode: 'insensitive' } },
              { title: { contains: match.awayTeam, mode: 'insensitive' } },
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
            system: `You are a live sports reporter. Output valid JSON only.
Write in ${lang}.

JSON format:
{
  "title": "Updated headline with current score",
  "content": "Updated HTML article with latest info. Keep it concise, 3-5 paragraphs.",
  "excerpt": "1-sentence update"
}`,
            prompt: `UPDATE this LIVE match article:

MATCH: ${match.homeTeam} ${score} ${match.awayTeam}
STATUS: ${match.status}
LEAGUE: ${match.league || 'Unknown'}
${match.events ? `EVENTS: ${JSON.stringify(match.events)}` : ''}
${latestUpdates ? `LATEST NEWS: ${latestUpdates}` : ''}

Keep all previous facts, add new updates at the top.`,
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
              matchId: match.id,
            })
          } catch {
            results.push({
              orgId: config.orgId,
              action: 'update_parse_error',
              matchId: match.id,
            })
          }
        } else {
          // ── Create new LIVE article ──
          const ai = await generateContent({
            system: `You are a live sports reporter. Output valid JSON only.
Write in ${lang}.

JSON format:
{
  "title": "LIVE: Home Team X-X Away Team — matchday coverage",
  "content": "HTML article. Start with current score and status. 3-4 paragraphs.",
  "excerpt": "1-sentence summary",
  "seo": {
    "slug": "url-safe-slug",
    "metaTitle": "max 60 chars",
    "metaDescription": "max 155 chars"
  }
}`,
            prompt: `Create a LIVE match article:

MATCH: ${match.homeTeam} ${score} ${match.awayTeam}
STATUS: ${match.status}
LEAGUE: ${match.league || 'Unknown'}
DATE: ${match.matchDate.toISOString()}
${match.events ? `EVENTS: ${JSON.stringify(match.events)}` : ''}
${latestUpdates ? `LATEST NEWS: ${latestUpdates}` : ''}`,
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
              `live-${match.homeTeam}-vs-${match.awayTeam}`
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

            const category = await prisma.category.findFirst({
              where: {
                siteId: site.id,
                slug: { in: ['live', 'matches', 'football'] },
              },
            })

            const article = await prisma.article.create({
              data: {
                siteId: site.id,
                title:
                  parsed.title || `LIVE: ${match.homeTeam} ${score} ${match.awayTeam}`,
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
                  matchId: match.id,
                }),
                metaTitle:
                  parsed.seo?.metaTitle ||
                  `LIVE: ${match.homeTeam} ${score} ${match.awayTeam}`,
                metaDescription: parsed.seo?.metaDescription || parsed.excerpt || '',
              },
            })

            results.push({
              orgId: config.orgId,
              action: 'created_live',
              articleId: article.id,
              matchId: match.id,
            })
          } catch {
            results.push({
              orgId: config.orgId,
              action: 'create_parse_error',
              matchId: match.id,
            })
          }
        }
      }

      if (liveMatches.length === 0) {
        results.push({ orgId: config.orgId, action: 'no_live_matches' })
      }
    }

    return NextResponse.json({ processed: configs.length, results })
  } catch (error) {
    console.error('Live updates cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
