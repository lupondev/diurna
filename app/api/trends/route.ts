import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const SUPPORTED_GEOS = ['BA', 'US', 'GB', 'DE', 'HR', 'RS']

interface TrendItem {
  title: string
  traffic: string
  link: string
}

// Simple in-memory cache: 15 min TTL
const cache = new Map<string, { data: TrendItem[]; expires: number }>()

async function fetchTrends(geo: string): Promise<TrendItem[]> {
  const cached = cache.get(geo)
  if (cached && Date.now() < cached.expires) return cached.data

  const url = `https://trends.google.com/trending/rss?geo=${geo}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Diurna/1.0' },
    next: { revalidate: 900 },
  })

  if (!res.ok) return []

  const xml = await res.text()
  const items: TrendItem[] = []

  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match
  while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
    const block = match[1]
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
      || block.match(/<title>(.*?)<\/title>/)?.[1] || ''
    const traffic = block.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/)?.[1] || ''
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] || ''

    if (title) {
      items.push({ title: title.trim(), traffic, link })
    }
  }

  cache.set(geo, { data: items, expires: Date.now() + 15 * 60 * 1000 })
  return items
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const geo = req.nextUrl.searchParams.get('geo')?.toUpperCase() || 'BA'
    if (!SUPPORTED_GEOS.includes(geo)) {
      return NextResponse.json({ error: 'Unsupported geo' }, { status: 400 })
    }

    const trends = await fetchTrends(geo)

    return NextResponse.json({ geo, trends })
  } catch (error) {
    console.error('Trends error:', error)
    return NextResponse.json({ error: 'Failed to fetch trends' }, { status: 500 })
  }
}
