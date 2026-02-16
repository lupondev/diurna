import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateArticleSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.any().default({}),
  excerpt: z.string().optional(),
  status: z.enum(['DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  categoryId: z.string().optional(),
  siteId: z.string(),
  aiGenerated: z.boolean().default(false),
  aiModel: z.string().optional(),
  aiPrompt: z.string().optional(),
})

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 100)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = CreateArticleSchema.parse(body)

    const session = await getServerSession(authOptions)

    // Generate unique slug
    let slug = slugify(data.title)
    const existing = await prisma.article.findFirst({
      where: { siteId: data.siteId, slug },
    })
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    const article = await prisma.article.create({
      data: {
        title: data.title,
        slug,
        content: data.content,
        excerpt: data.excerpt,
        status: data.status,
        siteId: data.siteId,
        categoryId: data.categoryId || null,
        authorId: session?.user?.id || null,
        aiGenerated: data.aiGenerated,
        aiModel: data.aiModel,
        aiPrompt: data.aiPrompt,
        publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
      },
    })

    return NextResponse.json(article, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Create article error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const orgId = session?.user?.organizationId

    const articles = await prisma.article.findMany({
      where: {
        deletedAt: null,
        ...(orgId && { site: { organizationId: orgId } }),
      },
      include: {
        category: { select: { name: true } },
        site: { select: { name: true } },
        tags: { include: { tag: { select: { id: true, name: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json(articles)
  } catch (error) {
    console.error('Get articles error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
