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

  const now = new Date()
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
  const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))

  let published = 0
  let scheduled = 0
  let drafts = 0
  let todayTotal = 0

  let aiPublishedToday = 0
  let aiDraftsToday = 0

  if (site) {
    const [p, s, d, total, aiPub, aiDraft] = await Promise.all([
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
      prisma.article.count({
        where: { siteId: site.id, status: 'PUBLISHED', aiGenerated: true, publishedAt: { gte: startOfDay, lte: endOfDay } },
      }),
      prisma.article.count({
        where: { siteId: site.id, status: 'DRAFT', aiGenerated: true, createdAt: { gte: startOfDay, lte: endOfDay } },
      }),
    ])
    published = p
    scheduled = s
    drafts = d
    todayTotal = total
    aiPublishedToday = aiPub
    aiDraftsToday = aiDraft
  }

  return NextResponse.json({
    // Legacy fields
    today: todayTotal,
    published,
    scheduled,
    live: 0,
    drafts,
    // Fields expected by copilot page (AI-only for Today's Status)
    articlesWrittenToday: aiPublishedToday,
    inReviewToday: aiDraftsToday,
    isActive: config?.isActive ?? false,
    dailyTarget: config?.dailyTarget ?? 10,
  })
}
