import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function getPeriodBounds(period: string): { from: Date; prevFrom: Date; prevTo: Date } {
  const now = new Date()
  let from: Date
  let prevFrom: Date
  let prevTo: Date

  switch (period) {
    case 'today':
      from = new Date(now); from.setHours(0, 0, 0, 0)
      prevFrom = new Date(from); prevFrom.setDate(prevFrom.getDate() - 1)
      prevTo = new Date(from)
      break
    case 'week':
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      prevFrom = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      prevTo = from
      break
    case 'month':
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      prevFrom = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      prevTo = from
      break
    case 'year':
      from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      prevFrom = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000)
      prevTo = from
      break
    default:
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      prevFrom = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      prevTo = from
  }

  return { from, prevFrom, prevTo }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = session.user.organizationId
    const period = req.nextUrl.searchParams.get('period') || 'week'
    const { from, prevFrom, prevTo } = getPeriodBounds(period)

    // Get all sites for this org
    const sites = await prisma.site.findMany({
      where: { organizationId: orgId, deletedAt: null },
      select: { id: true, name: true, slug: true, gaId: true },
    })
    const siteIds = sites.map(s => s.id)
    const hasGa = sites.some(s => s.gaId)

    // Published articles in period
    const [published, publishedPrev] = await Promise.all([
      prisma.article.count({
        where: { siteId: { in: siteIds }, status: 'PUBLISHED', publishedAt: { gte: from }, deletedAt: null },
      }),
      prisma.article.count({
        where: { siteId: { in: siteIds }, status: 'PUBLISHED', publishedAt: { gte: prevFrom, lt: prevTo }, deletedAt: null },
      }),
    ])

    // AI vs Manual
    const [aiCount, manualCount] = await Promise.all([
      prisma.article.count({
        where: { siteId: { in: siteIds }, status: 'PUBLISHED', publishedAt: { gte: from }, aiGenerated: true, deletedAt: null },
      }),
      prisma.article.count({
        where: { siteId: { in: siteIds }, status: 'PUBLISHED', publishedAt: { gte: from }, aiGenerated: false, deletedAt: null },
      }),
    ])

    // Total articles (all time)
    const totalArticles = await prisma.article.count({
      where: { siteId: { in: siteIds }, deletedAt: null },
    })

    // Drafts
    const drafts = await prisma.article.count({
      where: { siteId: { in: siteIds }, status: 'DRAFT', deletedAt: null },
    })

    // Subscribers
    const subscribers = await prisma.subscriber.count({
      where: { siteId: { in: siteIds }, isActive: true },
    })

    // Top articles (most recent published in period)
    const topArticles = await prisma.article.findMany({
      where: { siteId: { in: siteIds }, status: 'PUBLISHED', publishedAt: { gte: from }, deletedAt: null },
      orderBy: { publishedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        aiGenerated: true,
        publishedAt: true,
        category: { select: { name: true } },
        site: { select: { slug: true } },
      },
    })

    // Articles by day (for chart)
    const dailyArticles = await prisma.article.groupBy({
      by: ['publishedAt'],
      where: { siteId: { in: siteIds }, status: 'PUBLISHED', publishedAt: { gte: from }, deletedAt: null },
      _count: { id: true },
    })

    // Bucket by day
    const dayMap: Record<string, { ai: number; manual: number }> = {}
    const articlesInPeriodForChart = await prisma.article.findMany({
      where: { siteId: { in: siteIds }, status: 'PUBLISHED', publishedAt: { gte: from }, deletedAt: null },
      select: { publishedAt: true, aiGenerated: true },
    })
    for (const a of articlesInPeriodForChart) {
      if (!a.publishedAt) continue
      const day = a.publishedAt.toISOString().split('T')[0]
      if (!dayMap[day]) dayMap[day] = { ai: 0, manual: 0 }
      if (a.aiGenerated) dayMap[day].ai++
      else dayMap[day].manual++
    }
    const dailyChart = Object.entries(dayMap)
      .map(([day, counts]) => ({ day, ...counts, total: counts.ai + counts.manual }))
      .sort((a, b) => a.day.localeCompare(b.day))

    // Category breakdown
    const categoryBreakdown = await prisma.article.groupBy({
      by: ['categoryId'],
      where: { siteId: { in: siteIds }, status: 'PUBLISHED', publishedAt: { gte: from }, deletedAt: null },
      _count: { id: true },
    })
    const categoryIds = categoryBreakdown.map(c => c.categoryId).filter(Boolean) as string[]
    const categories = categoryIds.length > 0
      ? await prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true, icon: true } })
      : []
    const categoryStats = categoryBreakdown.map(c => ({
      name: categories.find(cat => cat.id === c.categoryId)?.name || 'Uncategorized',
      icon: categories.find(cat => cat.id === c.categoryId)?.icon || '📰',
      count: c._count.id,
    })).sort((a, b) => b.count - a.count)

    // Autopilot config
    const apConfig = await prisma.autopilotConfig.findUnique({
      where: { orgId },
      select: { dailyTarget: true, isActive: true, autoPublish: true },
    })

    // Today's autopilot articles
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const todayAiArticles = await prisma.article.count({
      where: { siteId: { in: siteIds }, aiGenerated: true, createdAt: { gte: todayStart }, deletedAt: null },
    })

    // Change calculation
    const publishedChange = publishedPrev > 0
      ? Math.round(((published - publishedPrev) / publishedPrev) * 100)
      : published > 0 ? 100 : 0

    return NextResponse.json({
      period,
      from: from.toISOString(),
      hasGa,
      sites: sites.map(s => ({ id: s.id, name: s.name, slug: s.slug, hasGa: !!s.gaId })),
      published,
      publishedPrev,
      publishedChange,
      aiCount,
      manualCount,
      totalArticles,
      drafts,
      subscribers,
      topArticles,
      dailyChart,
      categoryStats,
      autopilot: apConfig
        ? { dailyTarget: apConfig.dailyTarget, isActive: apConfig.isActive, todayCount: todayAiArticles }
        : null,
    })
  } catch (error) {
    console.error('Analytics stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
