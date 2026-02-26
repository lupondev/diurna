import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { generateContent } from '@/lib/ai/client'
import { Prisma } from '@prisma/client'
import { buildPromptContext, htmlToTiptap, injectWidgets, slugify, fetchUnsplashImage } from '@/lib/autopilot'
import { systemLog } from '@/lib/system-log'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    clusterId?: string
    title?: string
    dis?: number
    test?: boolean
  }

  if (body.test) {
    await systemLog('info', 'webhook', 'Breaking news webhook test ping')
    return NextResponse.json({ success: true, mode: 'test', message: 'Webhook endpoint is operational' })
  }

  if (!body.clusterId || !body.title) {
    return NextResponse.json({ error: 'Missing clusterId or title' }, { status: 400 })
  }

  try {
    const cluster = await prisma.storyCluster.findUnique({
      where: { id: body.clusterId },
      select: { siteId: true, title: true, eventType: true, entities: true, dis: true },
    })
    if (!cluster || !cluster.siteId) {
      return NextResponse.json({ success: false, reason: 'Cluster not found or has no site' })
    }

    const site = await prisma.site.findUnique({
      where: { id: cluster.siteId },
      select: { id: true, organizationId: true },
    })
    if (!site) {
      return NextResponse.json({ success: false, reason: 'Site not found' })
    }

    const config = await prisma.autopilotConfig.findFirst({
      where: { isActive: true, orgId: site.organizationId },
      include: { categories: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!config) {
      return NextResponse.json({ success: false, reason: 'No active autopilot config for this site' })
    }

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const alreadyCovered = await prisma.article.findFirst({
      where: {
        siteId: site.id,
        aiPrompt: { contains: body.clusterId },
        createdAt: { gte: startOfDay },
      },
    })
    if (alreadyCovered) {
      return NextResponse.json({ success: false, reason: 'Already covered today' })
    }

    // Fetch news items for this cluster
    const newsItems = await prisma.newsItem.findMany({
      where: { clusterId: body.clusterId },
      orderBy: { pubDate: 'desc' },
      take: 5,
    })

    const catConfig = config.categories.find(c => c.slug === 'breaking') || config.categories[0]
    const categorySlug = catConfig?.slug || 'vijesti'
    const categoryName = catConfig?.name || 'Vijesti'

    const promptData = buildPromptContext(
      {
        title: cluster.title,
        eventType: cluster.eventType,
        entities: cluster.entities as string[],
        dis: cluster.dis,
      },
      newsItems.map(n => ({
        title: n.title,
        source: n.source,
        content: n.content || undefined,
      })),
      config
    )

    const maxTokens = Math.min(4000, Math.max(500, Math.round(config.defaultLength * 2.5)))
    const ai = await generateContent({
      system: promptData.system,
      prompt: promptData.prompt,
      maxTokens,
      temperature: 0.3,
    })

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
      return NextResponse.json({ success: false, reason: 'Failed to parse AI response' }, { status: 500 })
    }

    const title = parsed.title || body.title

    // Ensure unique slug
    const baseSlug = parsed.seo?.slug || slugify(title)
    let slug = baseSlug
    let slugSuffix = 1
    while (await prisma.article.findFirst({ where: { siteId: site.id, slug } })) {
      slug = `${baseSlug}-${slugSuffix++}`
    }

    let tiptapContent = htmlToTiptap(parsed.content || '')
    if (catConfig) {
      tiptapContent = injectWidgets(tiptapContent, catConfig)
    }

    let category = await prisma.category.findFirst({
      where: { siteId: site.id, slug: categorySlug },
    })
    if (!category) {
      category = await prisma.category.create({
        data: { siteId: site.id, name: categoryName, slug: categorySlug },
      })
    }

    const featuredImage = await fetchUnsplashImage(title)

    const article = await prisma.article.create({
      data: {
        siteId: site.id,
        title,
        slug,
        content: tiptapContent as unknown as Prisma.InputJsonValue,
        excerpt: parsed.excerpt || '',
        featuredImage,
        status: config.autoPublish ? 'PUBLISHED' : 'DRAFT',
        publishedAt: config.autoPublish ? new Date() : null,
        categoryId: category.id,
        aiGenerated: true,
        aiModel: ai.model,
        aiPrompt: JSON.stringify({
          priority: 'webhook_breaking',
          clusterId: body.clusterId,
          dis: body.dis,
          sources: newsItems.map(n => n.title),
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
        let tag = await prisma.tag.findFirst({ where: { siteId: site.id, slug: tagSlug } })
        if (!tag) {
          tag = await prisma.tag.create({ data: { siteId: site.id, name: tagName, slug: tagSlug } })
        }
        await prisma.articleTag.create({ data: { articleId: article.id, tagId: tag.id } }).catch(() => {})
      }
    }

    // Revalidate public pages so article appears immediately
    try {
      revalidatePath('/', 'layout')
    } catch (e) {
      console.error('[Webhook] Revalidation failed:', e instanceof Error ? e.message : e)
    }

    await systemLog('info', 'webhook', `Breaking article generated: ${title} (DIS: ${body.dis})`, { articleId: article.id, slug, dis: body.dis })

    return NextResponse.json({
      success: true,
      articleId: article.id,
      articleSlug: slug,
      title,
      status: config.autoPublish ? 'published' : 'draft',
    })
  } catch (error) {
    console.error('[Breaking Webhook] Error:', error)
    await systemLog('error', 'webhook', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({
      success: false,
      reason: error instanceof Error ? error.message : 'Internal error',
    }, { status: 500 })
  }
}
