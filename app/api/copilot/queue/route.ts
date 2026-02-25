import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const PatchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['approved', 'rejected']),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return NextResponse.json([], { status: 401 })
  }

  const site = await prisma.site.findFirst({
    where: { organizationId: session.user.organizationId },
    select: { id: true },
  })
  if (!site) return NextResponse.json([])

  const articles = await prisma.article.findMany({
    where: {
      siteId: site.id,
      deletedAt: null,
      isTest: false,
      status: { in: ['DRAFT', 'IN_REVIEW', 'SCHEDULED'] },
    },
    select: {
      id: true,
      title: true,
      status: true,
      scheduledAt: true,
      createdAt: true,
      aiGenerated: true,
      category: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return NextResponse.json(
    articles.map((a) => ({
      id: a.id,
      title: a.title,
      category: a.category?.name || 'Uncategorized',
      suggestedTime: (a.scheduledAt || a.createdAt).toISOString().slice(11, 16),
      confidence: a.aiGenerated ? 85 : 70,
      status: a.status === 'IN_REVIEW' ? 'pending' : a.status === 'SCHEDULED' ? 'approved' : 'pending',
    }))
  )
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = PatchSchema.parse(body)

    if (data.status === 'approved') {
      await prisma.article.update({
        where: { id: data.id },
        data: { status: 'SCHEDULED' },
      })
    } else if (data.status === 'rejected') {
      await prisma.article.update({
        where: { id: data.id },
        data: { status: 'DRAFT' },
      })
    }

    return NextResponse.json({ ok: true, id: data.id, status: data.status })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
