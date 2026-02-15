import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    const article = await prisma.article.update({
      where: { id: params.id },
      data: {
        ...data,
        publishedAt: data.status === 'PUBLISHED' ? new Date() : undefined,
      },
    })

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
