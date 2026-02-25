import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// TODO: Full calendar integration pending — fixtures from MatchResult/API-Football could be merged into timeline

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = session.user.organizationId
  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')

  const site = await prisma.site.findFirst({
    where: { organizationId: orgId, ...(siteId ? { id: siteId } : {}) },
  })

  if (!site) {
    return NextResponse.json({ scheduled: [], missed: [], total: 0 })
  }

  const now = new Date()
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const scheduled = await prisma.article.findMany({
    where: {
      siteId: site.id,
      status: 'SCHEDULED',
      scheduledAt: { gte: now, lte: nextWeek },
    },
    orderBy: { scheduledAt: 'asc' },
    include: {
      category: { select: { name: true } },
    },
  })

  const missed = await prisma.article.findMany({
    where: {
      siteId: site.id,
      status: 'SCHEDULED',
      scheduledAt: { lt: now },
    },
    orderBy: { scheduledAt: 'desc' },
    take: 10,
    include: {
      category: { select: { name: true } },
    },
  })

  return NextResponse.json({
    scheduled,
    missed,
    total: scheduled.length,
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { articleId?: string; scheduledAt?: string }
  const { articleId, scheduledAt } = body

  if (!articleId || !scheduledAt) {
    return NextResponse.json({ error: 'articleId and scheduledAt are required' }, { status: 400 })
  }

  const article = await prisma.article.update({
    where: { id: articleId },
    data: {
      status: 'SCHEDULED',
      scheduledAt: new Date(scheduledAt),
    },
  })

  return NextResponse.json({ article })
}
