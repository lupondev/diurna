import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { postToMultiplePages } from '@/lib/facebook'
import { distributeArticle } from '@/lib/distribution'
import { systemLog } from '@/lib/system-log'
import { validateOrigin } from '@/lib/csrf'
import { z } from 'zod'

const UpdateArticleSchema = z.object({
  title: z.string().min(1).max(200).optional().transform((v) => (v == null ? undefined : v.replace(/<[^>]*>/g, '').trim())),
  content: z.any().optional(),
  excerpt: z.string().optional(),
  status: z.enum(['DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']).optional(),
  categoryId: z.string().nullable().optional(),
  scheduledAt: z.string().nullable().optional(),
  slug: z.string().min(1).max(200).optional(),
  tagIds: z.array(z.string()).optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  featuredImage: z.string().url().optional().nullable().or(z.literal('')).transform((v) => (v === '' ? null : v)),
  subtitle: z.string().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const article = await prisma.article.findFirst({
      where: { id: params.id, deletedAt: null, site: { organizationId: session.user.organizationId } },
      include: {
        category: true,
        site: true,
        aiRevisions: {
          orderBy: { version: 'desc' },
          take: 5,
          select: { id: true, version: true, prompt: true, model: true, tokensIn: true, tokensOut: true, createdAt: true },
        },
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
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = UpdateArticleSchema.parse(body)

    const existing = await prisma.article.findFirst({
      where: { id: params.id, site: { organizationId: session.user.organizationId } },
      select: { status: true, siteId: true, title: true, slug: true, content: true, site: { select: { domain: true, slug: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (data.content || data.title) {
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
          savedBy: session.user.id,
          version: (lastVersion?.version || 0) + 1,
        },
      })
    }

    let slugUpdate: string | undefined
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await prisma.article.findFirst({
        where: { siteId: existing.siteId, slug: data.slug, id: { not: params.id } },
      })
      if (slugExists) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
      }
      slugUpdate = data.slug
    }

    if (data.tagIds) {
      await prisma.articleTag.deleteMany({ where: { articleId: params.id } })
      if (data.tagIds.length > 0) {
        await prisma.articleTag.createMany({
          data: data.tagIds.map((tagId) => ({ articleId: params.id, tagId })),
        })
      }
    }

    const { tagIds, scheduledAt: scheduledAtStr, slug: _slug, subtitle: _subtitle, ...updateFields } = data

    const article = await prisma.article.update({
      where: { id: params.id },
      data: {
        ...updateFields,
        ...(slugUpdate && { slug: slugUpdate }),
        ...(scheduledAtStr !== undefined && { scheduledAt: scheduledAtStr ? new Date(scheduledAtStr) : null }),
        ...(data.featuredImage !== undefined && { featuredImage: data.featuredImage }),
        ...(data.subtitle !== undefined && { excerpt: data.subtitle }),
        publishedAt: data.status === 'PUBLISHED' ? new Date() : undefined,
      },
      // Bug D fix: include versions in PATCH response so client doesn't need extra GET
      include: {
        versions: { orderBy: { version: 'desc' }, take: 20 },
      },
    })

    if (data.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
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
            await systemLog('warn', 'system', 'Facebook auto-post partial failures', { failures })
          }
        }
      } catch (fbError) {
        console.error('Facebook auto-post error:', fbError)
      }

      distributeArticle(params.id).catch(err => console.error('Distribution error:', err))
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
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const article = await prisma.article.findFirst({
      where: { id: params.id, site: { organizationId: session.user.organizationId } },
    })
    if (!article) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

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
