import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category') || 'all'
  const hours = parseInt(req.nextUrl.searchParams.get('hours') || '24')
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50')

  const since = new Date(Date.now() - hours * 60 * 60 * 1000)

  const where: Record<string, unknown> = {
    pubDate: { gte: since },
  }

  if (category !== 'all') {
    where.category = category
  }

  const items = await prisma.newsItem.findMany({
    where,
    orderBy: { pubDate: 'desc' },
    take: Math.min(limit, 200),
  })

  return NextResponse.json({ items, count: items.length })
}
