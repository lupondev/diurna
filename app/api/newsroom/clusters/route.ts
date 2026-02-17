import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const limit = Math.min(50, parseInt(url.searchParams.get('limit') || '20', 10))
  const eventType = url.searchParams.get('eventType') || undefined
  const minArticles = parseInt(url.searchParams.get('minArticles') || '2', 10)

  const clusters = await prisma.storyCluster.findMany({
    where: {
      expiresAt: { gt: new Date() },
      articleCount: { gte: minArticles },
      ...(eventType ? { eventType } : {}),
    },
    orderBy: [{ avgDis: 'desc' }, { lastUpdated: 'desc' }],
    take: limit,
    include: {
      summaries: {
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  })

  const enriched = await Promise.all(
    clusters.map(async (cluster) => {
      const articles = await prisma.newsItem.findMany({
        where: { clusterId: cluster.clusterKey },
        orderBy: { dis: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          source: true,
          sourceDomain: true,
          sourceUrl: true,
          pubDate: true,
          tier: true,
          dis: true,
          category: true,
        },
      })

      return {
        id: cluster.id,
        clusterKey: cluster.clusterKey,
        title: cluster.title,
        summary: cluster.summaries[0]?.text || cluster.summary || '',
        eventType: cluster.eventType,
        entityNames: cluster.entityNames,
        articleCount: cluster.articleCount,
        sourceCount: cluster.sourceCount,
        dis: cluster.avgDis,
        maxDis: cluster.maxDis,
        velocity: Math.round(cluster.velocity * 100) / 100,
        acceleration: Math.round(cluster.acceleration * 100) / 100,
        firstSeen: cluster.firstSeen,
        lastUpdated: cluster.lastUpdated,
        articles,
      }
    })
  )

  return NextResponse.json({
    clusters: enriched,
    count: enriched.length,
    timestamp: new Date().toISOString(),
  })
}
