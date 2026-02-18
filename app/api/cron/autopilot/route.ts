import { NextRequest, NextResponse } from 'next/server'
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

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const configs = await prisma.autopilotConfig.findMany({
      where: { isActive: true },
      include: {
        categories: { orderBy: { sortOrder: 'asc' } },
        leagues: { where: { isActive: true } },
        topics: { where: { isActive: true } },
      },
    })

    const results: { orgId: string; action: string; articleId?: string }[] = []

    for (const config of configs) {
      if (!shouldGenerateNow(config)) {
        results.push({ orgId: config.orgId, action: 'outside_schedule' })
        continue
      }

      const site = await prisma.site.findFirst({
        where: { organizationId: config.orgId },
      })

      if (!site) {
        results.push({ orgId: config.orgId, action: 'no_site' })
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

      const task = await getNextTask(config, site.id, todayCount)

      if (!task) {
        results.push({ orgId: config.orgId, action: 'no_task_available' })
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
        results.push({ orgId: config.orgId, action: 'parse_error' })
        continue
      }

      const title = parsed.title || task.title
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
        action: `generated_${task.priority}`,
        articleId: article.id,
      })
    }

    return NextResponse.json({ processed: configs.length, results })
  } catch (error) {
    console.error('Autopilot cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
