import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDefaultSite } from '@/lib/db'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ImportArticleSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(500),
  content: z.string(),
  excerpt: z.string().optional().default(''),
  status: z.enum(['DRAFT', 'PUBLISHED', 'IN_REVIEW', 'SCHEDULED', 'ARCHIVED']).optional().default('DRAFT'),
  publishedAt: z.string().nullable().optional(),
  author: z.string().optional().default(''),
  categories: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  featuredImage: z.string().nullable().optional(),
})

const ImportSchema = z.object({
  articles: z.array(ImportArticleSchema).min(1).max(500),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const site = await getDefaultSite(session.user.organizationId)
    if (!site) {
      return NextResponse.json({ error: 'No site found' }, { status: 404 })
    }

    const body = await req.json()
    const { articles } = ImportSchema.parse(body)

    // Build category map - find existing or create new
    const allCategoryNames = new Set<string>()
    articles.forEach((a) => a.categories.forEach((c) => allCategoryNames.add(c)))

    const existingCategories = await prisma.category.findMany({
      where: { siteId: site.id, deletedAt: null },
    })

    const categoryMap = new Map<string, string>()
    existingCategories.forEach((c) => {
      categoryMap.set(c.name.toLowerCase(), c.id)
    })

    // Create missing categories
    const newCategoryNames = Array.from(allCategoryNames).filter(
      (name) => !categoryMap.has(name.toLowerCase())
    )
    for (const name of newCategoryNames) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const cat = await prisma.category.create({
        data: {
          siteId: site.id,
          name,
          slug,
          order: existingCategories.length + newCategoryNames.indexOf(name),
        },
      })
      categoryMap.set(name.toLowerCase(), cat.id)
    }

    // Build tag map
    const allTagNames = new Set<string>()
    articles.forEach((a) => a.tags.forEach((t) => allTagNames.add(t)))

    const existingTags = await prisma.tag.findMany({
      where: { siteId: site.id },
    })

    const tagMap = new Map<string, string>()
    existingTags.forEach((t) => {
      tagMap.set(t.name.toLowerCase(), t.id)
    })

    const newTagNames = Array.from(allTagNames).filter(
      (name) => !tagMap.has(name.toLowerCase())
    )
    for (const name of newTagNames) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const tag = await prisma.tag.create({
        data: { siteId: site.id, name, slug },
      })
      tagMap.set(name.toLowerCase(), tag.id)
    }

    const existingSlugs = await prisma.article.findMany({
      where: { siteId: site.id, deletedAt: null },
      select: { slug: true },
    })
    const slugSet = new Set(existingSlugs.map((a) => a.slug))

    let imported = 0
    let skipped = 0
    const results: Array<{ title: string; slug: string; status: string }> = []

    for (const article of articles) {
      // Deduplicate slug
      let slug = article.slug
      if (slugSet.has(slug)) {
        let i = 2
        while (slugSet.has(`${slug}-${i}`)) i++
        slug = `${slug}-${i}`
      }
      slugSet.add(slug)

      // Convert HTML content to Tiptap JSON
      const tiptapContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: article.content
              ? [{ type: 'text', text: article.content.substring(0, 50000) }]
              : [],
          },
        ],
      }

      const categoryId = article.categories[0]
        ? categoryMap.get(article.categories[0].toLowerCase()) || null
        : null

      try {
        const created = await prisma.article.create({
          data: {
            siteId: site.id,
            title: article.title,
            slug,
            content: tiptapContent,
            excerpt: article.excerpt || null,
            status: article.status as 'DRAFT' | 'PUBLISHED' | 'IN_REVIEW' | 'SCHEDULED' | 'ARCHIVED',
            publishedAt: article.publishedAt ? new Date(article.publishedAt) : null,
            categoryId,
            authorId: session.user.id || null,
          },
        })

        // Link tags
        const articleTags = article.tags
          .map((t) => tagMap.get(t.toLowerCase()))
          .filter(Boolean) as string[]

        if (articleTags.length > 0) {
          await prisma.articleTag.createMany({
            data: articleTags.map((tagId) => ({
              articleId: created.id,
              tagId,
            })),
            skipDuplicates: true,
          })
        }

        imported++
        results.push({ title: article.title, slug, status: 'imported' })
      } catch (err) {
        skipped++
        results.push({ title: article.title, slug, status: 'failed' })
      }
    }

    return NextResponse.json({ imported, skipped, total: articles.length, results })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Import error:', error)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
