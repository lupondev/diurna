import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { detectCategoryFromTitle } from '@/lib/newsroom-categories'
import { rateLimit } from '@/lib/rate-limit'

const publicLimiter = rateLimit({ interval: 60_000 })

export async function GET(req: NextRequest) {
  const mcpSecret = req.headers.get('x-mcp-secret')
  if (mcpSecret && mcpSecret !== process.env.MCP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  try {
    await publicLimiter.check(60, `public:${ip}`)
  } catch {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '80')
  const eventType = searchParams.get('eventType') || undefined
  const minDis = parseInt(searchParams.get('minDis') || '0')
  const timeFilter = searchParams.get('timeFilter') || 'ALL'
  const siteId = searchParams.get('siteId') || undefined

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

  const enriched = clusters.map(c => ({
    ...c,
    category: c.category || detectCategoryFromTitle(c.title),
  }))

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
