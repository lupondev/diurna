import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { detectCategoryFromTitle } from '@/lib/newsroom-categories'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '80')
  const eventType = searchParams.get('eventType') || undefined
  const minDis = parseInt(searchParams.get('minDis') || '0')
  const timeFilter = searchParams.get('timeFilter') || 'ALL'
  const siteId = searchParams.get('siteId') || undefined

  // Calculate cutoff time based on timeFilter
  let cutoffDate: Date | undefined
  const now = new Date()

  if (timeFilter === '1H') {
    cutoffDate = new Date(now.getTime() - 1 * 60 * 60 * 1000)
  } else if (timeFilter === '6H') {
    cutoffDate = new Date(now.getTime() - 6 * 60 * 60 * 1000)
  } else if (timeFilter === '12H') {
    cutoffDate = new Date(now.getTime() - 12 * 60 * 60 * 1000)
  } else if (timeFilter === '24H') {
    cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  }
  // ALL / SVE = no cutoff

  const where = {
    ...(eventType ? { eventType } : {}),
    dis: { gte: minDis },
    ...(siteId ? { siteId } : {}),
    ...(cutoffDate ? { firstSeen: { gte: cutoffDate } } : {}),
  }

  const clusters = await prisma.storyCluster.findMany({
    where,
    include: {
      summary: true,
    },
    orderBy: [
      { dis: 'desc' },
      { firstSeen: 'desc' },
    ],
    take: limit,
  })

  // Add category detection if missing
  const enriched = clusters.map(c => ({
    ...c,
    category: c.category || detectCategoryFromTitle(c.title),
  }))

  // Stats
  const total = clusters.length
  const spiking = clusters.filter(c => c.trend === 'SPIKING').length
  const tier1 = clusters.filter(c => c.tier1Count > 0).length

  return NextResponse.json({
    clusters: enriched,
    count: total,
    stats: {
      total,
      spiking,
      tier1,
      filtered: total,
    },
  })
}
