import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPrimarySite } from '@/lib/site-resolver'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = session.user.organizationId

  const [site, config] = await Promise.all([
    getPrimarySite(orgId),
    prisma.autopilotConfig.findUnique({ where: { orgId } }),
  ])

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)

  let published = 0
  let scheduled = 0
  let drafts = 0
  let todayTotal = 0

  if (site) {
    ;[published, scheduled, drafts, todayTotal] = await Promise.all([
      prisma.article.count({
        where: { siteId: site.id, status: 'PUBLISHED', publishedAt: { gte: startOfDay, lte: endOfDay } },
      }),
      prisma.article.count({
        where: { siteId: site.id, status: 'SCHEDULED', scheduledAt: { gte: startOfDay, lte: endOfDay } },
      }),
      prisma.article.count({
        where: { siteId: site.id, status: 'DRAFT', createdAt: { gte: startOfDay, lte: endOfDay } },
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
  }

  return NextResponse.json({
    // Legacy fields
    today: todayTotal,
    published,
    scheduled,
    live: 0,
    drafts,
    // Fields expected by copilot page
    articlesWrittenToday: published,
    isActive: config?.isActive ?? false,
    dailyTarget: config?.dailyTarget ?? 10,
  })
}
