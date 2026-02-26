import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const [totalSources, activeSources, totalItems, recentItems, todayItems, totalClusters, recentClusters, sites] = await Promise.all([
    prisma.feedSource.count(),
    prisma.feedSource.count({ where: { active: true } }),
    prisma.newsItem.count(),
    prisma.newsItem.count({ where: { createdAt: { gte: oneHourAgo } } }),
    prisma.newsItem.count({ where: { createdAt: { gte: oneDayAgo } } }),
    prisma.storyCluster.count(),
    prisma.storyCluster.count({ where: { updatedAt: { gte: oneHourAgo } } }),
    prisma.site.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, domain: true },
      take: 10,
    }),
  ])

  const perSite = await Promise.all(
    sites.map(async (site) => ({
      site: site.name || site.domain || site.id,
      sources: await prisma.feedSource.count({ where: { siteId: site.id } }),
      items24h: await prisma.newsItem.count({
        where: { siteId: site.id, createdAt: { gte: oneDayAgo } },
      }),
      clusters: await prisma.storyCluster.count({ where: { siteId: site.id } }),
    }))
  )

  const healthy = activeSources > 0 && todayItems > 0

  const diagnosis: string[] = []
  if (!healthy) {
    if (activeSources === 0) diagnosis.push('NO_ACTIVE_SOURCES: Nema aktivnih feed source-ova')
    if (todayItems === 0) diagnosis.push('NO_RECENT_ITEMS: Nema news item-a u zadnjih 24h — cron ne radi ili feedovi ne vraćaju podatke')
    if (totalClusters === 0) diagnosis.push('NO_CLUSTERS: Clustering ne radi ili nema dovoljno item-a za klasteriranje')
  }

  return NextResponse.json({
    status: healthy ? 'HEALTHY' : 'UNHEALTHY',
    timestamp: now.toISOString(),
    feedSources: { total: totalSources, active: activeSources },
    newsItems: { total: totalItems, lastHour: recentItems, last24h: todayItems },
    clusters: { total: totalClusters, lastHour: recentClusters },
    perSite,
    diagnosis,
  })
}
