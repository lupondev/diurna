import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  // Auth: session or cron secret
  const authHeader = req.headers.get('authorization')
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`

  if (!isCron) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '5')
  const siteId = req.nextUrl.searchParams.get('siteId') || undefined

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  // Get cluster IDs already covered today
  const coveredToday = siteId
    ? await prisma.article.findMany({
        where: {
          siteId,
          aiGenerated: true,
          createdAt: { gte: startOfDay },
          aiPrompt: { not: null },
        },
        select: { aiPrompt: true },
      })
    : []

  const coveredClusterIds = new Set<string>()
  for (const a of coveredToday) {
    if (typeof a.aiPrompt === 'string') {
      try {
        const parsed = JSON.parse(a.aiPrompt)
        if (parsed.clusterId) coveredClusterIds.add(parsed.clusterId)
      } catch {
        // aiPrompt might contain cluster ID directly
        if (a.aiPrompt.length < 100) coveredClusterIds.add(a.aiPrompt)
      }
    }
  }

  // Fetch top clusters by DIS, exclude already covered
  const clusters = await prisma.storyCluster.findMany({
    where: {
      latestItem: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      dis: { gte: 15 },
      ...(coveredClusterIds.size > 0
        ? { id: { notIn: Array.from(coveredClusterIds) } }
        : {}),
    },
    include: { summary: true },
    orderBy: { dis: 'desc' },
    take: limit,
  })

  // For each cluster, fetch its top news items
  const stories = await Promise.all(
    clusters.map(async (cluster) => {
      const newsItems = await prisma.newsItem.findMany({
        where: { clusterId: cluster.id },
        orderBy: { pubDate: 'desc' },
        take: 5,
      })

      return {
        clusterId: cluster.id,
        title: cluster.title,
        eventType: cluster.eventType,
        entities: cluster.entities,
        dis: cluster.dis,
        trend: cluster.trend,
        sourceCount: cluster.sourceCount,
        latestItem: cluster.latestItem,
        summary: cluster.summary,
        newsItems: newsItems.map((n) => ({
          title: n.title,
          source: n.source,
          content: n.content,
          pubDate: n.pubDate,
        })),
      }
    })
  )

  return NextResponse.json({ stories, count: stories.length })
}
