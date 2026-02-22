import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { distributeArticle } from '@/lib/distribution'
import { slugify } from '@/lib/autopilot'
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

export async function POST(req: NextRequest) {
  try {
    let userId: string | undefined
    let orgId: string | undefined

    const mcpSecret = req.headers.get('x-mcp-secret')
    if (mcpSecret && mcpSecret === process.env.MCP_SECRET) {
      const headerUserId = req.headers.get('x-user-id')
      if (headerUserId) {
        userId = headerUserId
      } else {
        const firstOrg = await prisma.organization.findFirst()
        if (firstOrg) {
          const membership = await prisma.userOnOrganization.findFirst({ where: { organizationId: firstOrg.id } })
          userId = membership?.userId
          orgId = firstOrg.id
        }
      }
    } else {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = session.user.id
      orgId = session.user.organizationId ?? undefined
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = CreateArticleSchema.parse(body)

    if (orgId) {
      const site = await prisma.site.findFirst({
        where: { id: data.siteId, organizationId: orgId, deletedAt: null },
      })
      if (!site) {
        return NextResponse.json({ error: 'Forbidden: site does not belong to your organization' }, { status: 403 })
      }
    }

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
        authorId: userId,
        aiGenerated: data.aiGenerated,
        aiModel: data.aiModel,
        aiPrompt: data.aiPrompt,
        publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
      },
    })

    if (data.status === 'PUBLISHED') {
      distributeArticle(article.id).catch(err => console.error('Distribution error:', err))
    }

    return NextResponse.json(article, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Create article error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    let orgId: string | undefined

    const mcpSecret = req.headers.get('x-mcp-secret')
    if (mcpSecret && mcpSecret === process.env.MCP_SECRET) {
      const headerOrgId = req.headers.get('x-org-id')
      if (headerOrgId) {
        orgId = headerOrgId
      } else {
        const firstOrg = await prisma.organization.findFirst()
        orgId = firstOrg?.id
      }
    } else {
      const session = await getServerSession(authOptions)
      if (!session?.user?.organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      orgId = session.user.organizationId
    }

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = req.nextUrl
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20))
    const skip = (page - 1) * limit
    const statusParam = searchParams.get('status')
    const qParam = searchParams.get('q')?.trim()
    // Bug fix: honour isTest param — 'false' excludes test articles from lists
    const isTestParam = searchParams.get('isTest')

    const where: Record<string, unknown> = {
      deletedAt: null,
      site: { organizationId: orgId },
    }
    if (statusParam && ['DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'].includes(statusParam)) {
      where.status = statusParam
    }
    if (qParam) {
      where.title = { contains: qParam, mode: 'insensitive' }
    }
    if (isTestParam === 'false') {
      where.isTest = false
    } else if (isTestParam === 'true') {
      where.isTest = true
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: {
          category: { select: { name: true } },
          site: { select: { name: true } },
          tags: { include: { tag: { select: { id: true, name: true } } } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.article.count({ where }),
    ])

    return NextResponse.json({
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get articles error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
