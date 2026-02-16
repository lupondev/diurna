import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { postToMultiplePages } from '@/lib/facebook'
import { z } from 'zod'

const UpdateArticleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.any().optional(),
  excerpt: z.string().optional(),
  status: z.enum(['DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']).optional(),
  categoryId: z.string().nullable().optional(),
  scheduledAt: z.string().nullable().optional(),
  slug: z.string().min(1).max(200).optional(),
  tagIds: z.array(z.string()).optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const article = await prisma.article.findFirst({
      where: { id: params.id, deletedAt: null },
      include: {
        category: true,
        site: true,
        aiRevisions: { orderBy: { version: 'desc' }, take: 5 },
        versions: { orderBy: { version: 'desc' }, take: 20 },
        tags: { include: { tag: true } },
      },
    })
    if (!article) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(article)
  } catch (error) {
    console.error('Get article error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const data = UpdateArticleSchema.parse(body)
    const session = await getServerSession(authOptions)

    // Check if this is transitioning to PUBLISHED (need old status)
    const existing = await prisma.article.findUnique({
      where: { id: params.id },
      select: { status: true, siteId: true, title: true, slug: true, content: true, site: { select: { domain: true, slug: true } } },
    })

    // Create a version snapshot before updating
    if (existing && (data.content || data.title)) {
      const lastVersion = await prisma.articleVersion.findFirst({
        where: { articleId: params.id },
        orderBy: { version: 'desc' },
        select: { version: true },
      })
      await prisma.articleVersion.create({
        data: {
          articleId: params.id,
          title: existing.title,
          content: existing.content || {},
          savedBy: session?.user?.id || null,
          version: (lastVersion?.version || 0) + 1,
        },
      })
    }

    // Handle slug uniqueness
    let slugUpdate: string | undefined
    if (data.slug && existing && data.slug !== existing.slug) {
      const slugExists = await prisma.article.findFirst({
        where: { siteId: existing.siteId, slug: data.slug, id: { not: params.id } },
      })
      if (slugExists) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
      }
      slugUpdate = data.slug
    }

    // Handle tags
    if (data.tagIds) {
      await prisma.articleTag.deleteMany({ where: { articleId: params.id } })
      if (data.tagIds.length > 0) {
        await prisma.articleTag.createMany({
          data: data.tagIds.map((tagId) => ({ articleId: params.id, tagId })),
        })
      }
    }

    const { tagIds, scheduledAt: scheduledAtStr, slug: _slug, ...updateFields } = data

    const article = await prisma.article.update({
      where: { id: params.id },
      data: {
        ...updateFields,
        ...(slugUpdate && { slug: slugUpdate }),
        ...(scheduledAtStr !== undefined && { scheduledAt: scheduledAtStr ? new Date(scheduledAtStr) : null }),
        publishedAt: data.status === 'PUBLISHED' ? new Date() : undefined,
      },
    })

    // Auto-post to ALL active Facebook pages when publishing for the first time
    if (data.status === 'PUBLISHED' && existing && existing.status !== 'PUBLISHED') {
      try {
        const fbConnection = await prisma.socialConnection.findUnique({
          where: { siteId_provider: { siteId: existing.siteId, provider: 'facebook' } },
          include: { pages: { where: { isActive: true } } },
        })
        if (fbConnection && fbConnection.pages.length > 0) {
          const baseUrl = existing.site?.domain
            ? (existing.site.domain.startsWith('http') ? existing.site.domain : `https://${existing.site.domain}`)
            : process.env.NEXTAUTH_URL || 'http://localhost:3000'
          const articleUrl = `${baseUrl}/${existing.site?.slug}/${existing.slug}`
          const title = data.title || existing.title
          const results = await postToMultiplePages(fbConnection.pages, title, articleUrl)
          const failures = results.filter((r) => !r.success)
          if (failures.length > 0) {
            console.warn('Facebook auto-post partial failures:', failures)
          }
        }
      } catch (fbError) {
        // Don't fail the publish if FB post fails
        console.error('Facebook auto-post error:', fbError)
      }
    }

    return NextResponse.json(article)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Update article error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Soft delete
    await prisma.article.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete article error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
