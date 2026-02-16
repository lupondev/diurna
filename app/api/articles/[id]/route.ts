import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { postToPage } from '@/lib/facebook'
import { z } from 'zod'

const UpdateArticleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.any().optional(),
  excerpt: z.string().optional(),
  status: z.enum(['DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']).optional(),
  categoryId: z.string().nullable().optional(),
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

    // Check if this is transitioning to PUBLISHED (need old status)
    const existing = await prisma.article.findUnique({
      where: { id: params.id },
      select: { status: true, siteId: true, title: true, slug: true, site: { select: { domain: true, slug: true } } },
    })

    const article = await prisma.article.update({
      where: { id: params.id },
      data: {
        ...data,
        publishedAt: data.status === 'PUBLISHED' ? new Date() : undefined,
      },
    })

    // Auto-post to Facebook when publishing for the first time
    if (data.status === 'PUBLISHED' && existing && existing.status !== 'PUBLISHED') {
      try {
        const fbConnection = await prisma.socialConnection.findUnique({
          where: { siteId_provider: { siteId: existing.siteId, provider: 'facebook' } },
        })
        if (fbConnection?.pageId && fbConnection.accessToken) {
          const baseUrl = existing.site?.domain
            ? (existing.site.domain.startsWith('http') ? existing.site.domain : `https://${existing.site.domain}`)
            : process.env.NEXTAUTH_URL || 'http://localhost:3000'
          const articleUrl = `${baseUrl}/${existing.site?.slug}/${existing.slug}`
          const title = data.title || existing.title
          await postToPage(fbConnection.pageId, fbConnection.accessToken, title, articleUrl)
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
