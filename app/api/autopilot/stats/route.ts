import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const site = await prisma.site.findFirst({
    where: { organizationId: session.user.organizationId },
  })

  if (!site) {
    return NextResponse.json({ today: 0, published: 0, scheduled: 0, live: 0, drafts: 0 })
  }

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)

  const [published, scheduled, drafts, todayTotal] = await Promise.all([
    prisma.article.count({
      where: {
        siteId: site.id,
        status: 'PUBLISHED',
        publishedAt: { gte: startOfDay, lte: endOfDay },
      },
    }),
    prisma.article.count({
      where: {
        siteId: site.id,
        status: 'SCHEDULED',
        scheduledAt: { gte: startOfDay, lte: endOfDay },
      },
    }),
    prisma.article.count({
      where: {
        siteId: site.id,
        status: 'DRAFT',
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    }),
    prisma.article.count({
      where: {
        siteId: site.id,
        OR: [
          { publishedAt: { gte: startOfDay, lte: endOfDay } },
          { scheduledAt: { gte: startOfDay, lte: endOfDay } },
          { status: 'DRAFT', createdAt: { gte: startOfDay, lte: endOfDay } },
        ],
      },
    }),
  ])

  return NextResponse.json({
    today: todayTotal,
    published,
    scheduled,
    live: 0,
    drafts,
  })
}
