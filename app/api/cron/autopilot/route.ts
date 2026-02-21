import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateContent } from '@/lib/ai/client'
import { Prisma } from '@prisma/client'
import {
  shouldGenerateNow,
  getNextTask,
  buildPromptContext,
  htmlToTiptap,
  injectWidgets,
  slugify,
} from '@/lib/autopilot'

export const maxDuration = 60

async function authenticate(req: NextRequest): Promise<{ ok: true; orgId?: string } | { ok: false; response: NextResponse }> {
  // Method 1: Bearer token (cron jobs)
  const authHeader = req.headers.get('authorization')
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return { ok: true }
  }

  // Method 2: Session cookie (admin UI)
  const session = await getServerSession(authOptions)
  if (session?.user?.organizationId && (session.user.role === 'ADMIN' || session.user.role === 'OWNER')) {
    return { ok: true, orgId: session.user.organizationId }
  }

  return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
}

export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth.ok) return auth.response

  const force = req.nextUrl.searchParams.get('force') === 'true'

  try {
    // If session-based, only process the user's org
    const where: { isActive: boolean; orgId?: string } = { isActive: true }
    if (auth.orgId) where.orgId = auth.orgId

    const configs = await prisma.autopilotConfig.findMany({
      where,
      include: {
        categories: { orderBy: { sortOrder: 'asc' } },
        leagues: { where: { isActive: true } },
        topics: { where: { isActive: true } },
      },
    })

    const results: {
      orgId: string
      action: string
      articleId?: string
      title?: string
      category?: string
      status?: string
      reason?: string
    }[] = []

    for (const config of configs) {
      if (!force && !shouldGenerateNow(config)) {
        results.push({ orgId: config.orgId, action: 'skipped', reason: 'Outside active schedule' })
        continue
      }

      const site = await prisma.site.findFirst({
        where: { organizationId: config.orgId },
      })

      if (!site) {
        results.push({ orgId: config.orgId, action: 'skipped', reason: 'No site configured' })
        continue
      }

      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const todayCount = await prisma.article.count({
        where: {
          siteId: site.id,
          aiGenerated: true,
          createdAt: { gte: startOfDay },
        },
      })

      // ── Force mode: fetch top 5 unprocessed stories and generate for each ──
      if (force) {
        // Get cluster IDs already covered today
        const coveredToday = await prisma.article.findMany({
          where: {
            siteId: site.id,
            aiGenerated: true,
            createdAt: { gte: startOfDay },
            aiPrompt: { not: null },
          },
          select: { aiPrompt: true },
        })
        const coveredClusterIds = new Set<string>()
        for (const a of coveredToday) {
          if (typeof a.aiPrompt === 'string') {
            try {
              const p = JSON.parse(a.aiPrompt)
              if (p.clusterId) coveredClusterIds.add(p.clusterId)
            } catch {
              if (a.aiPrompt.length < 100) coveredClusterIds.add(a.aiPrompt)
            }
          }
        }

        // Fetch top cluster by DIS, exclude already covered (1 per invocation to fit in timeout)
        const topCluster = await prisma.storyCluster.findFirst({
          where: {
            latestItem: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            dis: { gte: 15 },
            ...(coveredClusterIds.size > 0
              ? { id: { notIn: Array.from(coveredClusterIds) } }
              : {}),
          },
          orderBy: { dis: 'desc' },
        })

        if (!topCluster) {
          results.push({
            orgId: config.orgId,
            action: 'skipped',
            reason: 'No news items or clusters available — run Feed Fetch first',
          })
          continue
        }

        {
          const newsItems = await prisma.newsItem.findMany({
            where: { clusterId: topCluster.id },
            orderBy: { pubDate: 'desc' },
            take: 5,
          })

          const catConfig = config.categories[0]
          const taskCategorySlug = catConfig?.slug || 'vijesti'
          const taskCategory = catConfig?.name || 'Vijesti'

          const promptData = buildPromptContext(
            {
              title: topCluster.title,
              eventType: topCluster.eventType,
              entities: topCluster.entities as string[],
              dis: topCluster.dis,
            },
            newsItems.map((n) => ({
              title: n.title,
              source: n.source,
              content: n.content || undefined,
            })),
            config
          )

          const maxTokens = Math.min(4000, Math.max(500, Math.round(config.defaultLength * 2.5)))
          let ai
          try {
            ai = await generateContent({
              system: promptData.system,
              prompt: promptData.prompt,
              maxTokens,
              temperature: 0.3,
            })
          } catch (aiErr) {
            results.push({ orgId: config.orgId, action: 'error', reason: `AI call failed: ${aiErr instanceof Error ? aiErr.message : 'unknown'}` })
            continue
          }

          let parsed: {
            title?: string; content?: string; excerpt?: string
            seo?: { slug?: string; metaTitle?: string; metaDescription?: string; keywords?: string[] }
            tags?: string[]
          }
          try {
            let cleaned = ai.text.trim()
            if (cleaned.startsWith('```')) {
              cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
            }
            parsed = JSON.parse(cleaned)
          } catch {
            results.push({ orgId: config.orgId, action: 'error', reason: `Failed to parse AI response for: ${topCluster.title}` })
            continue
          }

          const title = parsed.title || topCluster.title

          // Deduplication: skip only if exact slug already exists
          const candidateSlug = parsed.seo?.slug || slugify(title)
          const existingDupe = await prisma.article.findFirst({
            where: { siteId: site.id, slug: candidateSlug },
          })
          if (existingDupe) {
            results.push({ orgId: config.orgId, action: 'skipped', title, reason: `Duplicate slug: "${candidateSlug}"` })
            continue
          }

          const htmlContent = parsed.content || ''
          let tiptapContent = htmlToTiptap(htmlContent)

          if (catConfig) {
            tiptapContent = injectWidgets(tiptapContent, catConfig)
          }

          let category = await prisma.category.findFirst({
            where: { siteId: site.id, slug: taskCategorySlug },
          })
          if (!category) {
            category = await prisma.category.create({
              data: { siteId: site.id, name: taskCategory, slug: taskCategorySlug },
            })
          }

          const baseSlug = parsed.seo?.slug || slugify(title)
          let slug = baseSlug
          let slugSuffix = 1
          while (await prisma.article.findFirst({ where: { siteId: site.id, slug } })) {
            slug = `${baseSlug}-${slugSuffix++}`
          }

          const article = await prisma.article.create({
            data: {
              siteId: site.id,
              title,
              slug,
              content: tiptapContent as unknown as Prisma.InputJsonValue,
              excerpt: parsed.excerpt || '',
              status: config.autoPublish ? 'PUBLISHED' : 'DRAFT',
              publishedAt: config.autoPublish ? new Date() : null,
              categoryId: category.id,
              aiGenerated: true,
              aiModel: ai.model,
              aiPrompt: JSON.stringify({
                priority: 'top_story',
                clusterId: topCluster.id,
                sources: newsItems.map((n) => n.title),
              }),
              metaTitle: parsed.seo?.metaTitle || title,
              metaDescription: parsed.seo?.metaDescription || parsed.excerpt || '',
            },
          })

          if (parsed.tags && parsed.tags.length > 0) {
            for (const tagName of parsed.tags.slice(0, 5)) {
              const tagSlug = slugify(tagName)
              if (!tagSlug) continue
              let tag = await prisma.tag.findFirst({
                where: { siteId: site.id, slug: tagSlug },
              })
              if (!tag) {
                tag = await prisma.tag.create({
                  data: { siteId: site.id, name: tagName, slug: tagSlug },
                })
              }
              await prisma.articleTag
                .create({ data: { articleId: article.id, tagId: tag.id } })
                .catch(() => {})
            }
          }

          results.push({
            orgId: config.orgId,
            action: 'generated',
            articleId: article.id,
            title,
            category: taskCategory,
            status: config.autoPublish ? 'published' : 'draft',
            reason: `top_story: DIS ${topCluster.dis} — ${topCluster.title}`,
          })
        }
        continue
      }

      // ── Normal mode: single task via priority system ──
      const task = await getNextTask(config, site.id, todayCount, false)

      if (!task) {
        results.push({
          orgId: config.orgId,
          action: 'skipped',
          reason: 'All quotas met for current hour',
        })
        continue
      }

      // Build prompt from cluster data or task title
      const cluster = task.clusterId
        ? await prisma.storyCluster.findUnique({ where: { id: task.clusterId } })
        : null

      const promptData = buildPromptContext(
        cluster || {
          title: task.title,
          eventType: task.priority,
          entities: [],
          dis: 50,
        },
        task.sources,
        config
      )

      const maxTokens = Math.min(4000, Math.max(500, Math.round(task.wordCount * 2.5)))
      const ai = await generateContent({
        system: promptData.system,
        prompt: promptData.prompt,
        maxTokens,
        temperature: 0.3,
      })

      // Parse AI JSON response
      let parsed: {
        title?: string
        content?: string
        excerpt?: string
        seo?: {
          slug?: string
          metaTitle?: string
          metaDescription?: string
          keywords?: string[]
        }
        tags?: string[]
      }
      try {
        let cleaned = ai.text.trim()
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
        }
        parsed = JSON.parse(cleaned)
      } catch {
        results.push({ orgId: config.orgId, action: 'error', reason: 'Failed to parse AI response' })
        continue
      }

      const title = parsed.title || task.title

      // Deduplication: skip only if exact slug already exists
      const candidateSlug = parsed.seo?.slug || slugify(title)
      const existingDupe = await prisma.article.findFirst({
        where: {
          siteId: site.id,
          slug: candidateSlug,
        },
      })
      if (existingDupe) {
        results.push({ orgId: config.orgId, action: 'skipped', title, reason: `Duplicate slug: "${candidateSlug}"` })
        continue
      }

      const htmlContent = parsed.content || ''
      let tiptapContent = htmlToTiptap(htmlContent)

      // Inject widgets based on category config
      const catConfig = config.categories.find((c) => c.slug === task.categorySlug)
      if (catConfig) {
        tiptapContent = injectWidgets(tiptapContent, catConfig)
      }

      // Find or create category in site
      let category = await prisma.category.findFirst({
        where: { siteId: site.id, slug: task.categorySlug },
      })
      if (!category) {
        category = await prisma.category.create({
          data: {
            siteId: site.id,
            name: task.category,
            slug: task.categorySlug,
          },
        })
      }

      // Ensure unique slug
      const baseSlug = parsed.seo?.slug || slugify(title)
      let slug = baseSlug
      let slugSuffix = 1
      while (await prisma.article.findFirst({ where: { siteId: site.id, slug } })) {
        slug = `${baseSlug}-${slugSuffix++}`
      }

      const article = await prisma.article.create({
        data: {
          siteId: site.id,
          title,
          slug,
          content: tiptapContent as unknown as Prisma.InputJsonValue,
          excerpt: parsed.excerpt || '',
          status: config.autoPublish ? 'PUBLISHED' : 'DRAFT',
          publishedAt: config.autoPublish ? new Date() : null,
          categoryId: category.id,
          aiGenerated: true,
          aiModel: ai.model,
          aiPrompt: JSON.stringify({
            priority: task.priority,
            clusterId: task.clusterId,
            matchId: task.matchId,
            sources: task.sources.map((s) => s.title),
          }),
          metaTitle: parsed.seo?.metaTitle || title,
          metaDescription: parsed.seo?.metaDescription || parsed.excerpt || '',
        },
      })

      // Create tags
      if (parsed.tags && parsed.tags.length > 0) {
        for (const tagName of parsed.tags.slice(0, 5)) {
          const tagSlug = slugify(tagName)
          if (!tagSlug) continue
          let tag = await prisma.tag.findFirst({
            where: { siteId: site.id, slug: tagSlug },
          })
          if (!tag) {
            tag = await prisma.tag.create({
              data: { siteId: site.id, name: tagName, slug: tagSlug },
            })
          }
          await prisma.articleTag
            .create({ data: { articleId: article.id, tagId: tag.id } })
            .catch(() => {})
        }
      }

      results.push({
        orgId: config.orgId,
        action: 'generated',
        articleId: article.id,
        title,
        category: task.category,
        status: config.autoPublish ? 'published' : 'draft',
        reason: `${task.priority}: ${task.category} (${task.categorySlug})`,
      })
    }

    // Return structured response
    const generated = results.filter(r => r.action === 'generated')
    const skipped = results.filter(r => r.action === 'skipped')

    return NextResponse.json({
      success: true,
      processed: configs.length,
      action: generated.length > 0 ? 'generated' : 'skipped',
      article: generated[0] ? {
        id: generated[0].articleId,
        title: generated[0].title,
        category: generated[0].category,
        status: generated[0].status,
      } : undefined,
      reason: generated.length > 0
        ? generated[0].reason
        : skipped[0]?.reason || 'No active configs',
      results,
    })
  } catch (error) {
    console.error('Autopilot cron error:', error)
    return NextResponse.json({
      success: false,
      action: 'error',
      reason: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}
