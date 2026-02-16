import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Parser from 'rss-parser'

const parser = new Parser()

let cache: { data: unknown; ts: number; query: string } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 min

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const q = req.nextUrl.searchParams.get('q') || 'football soccer'
    const hl = req.nextUrl.searchParams.get('hl') || 'en'

    if (cache && cache.query === q && Date.now() - cache.ts < CACHE_TTL) {
      return NextResponse.json(cache.data)
    }

    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${hl}`
    const feed = await parser.parseURL(url)

    const items = (feed.items || []).slice(0, 30).map((item) => ({
      title: item.title || '',
      source: item.creator || item['dc:creator'] || extractSource(item.title || ''),
      link: item.link || '',
      pubDate: item.pubDate || item.isoDate || '',
    }))

    const result = { items, total: items.length, query: q, fetchedAt: new Date().toISOString() }
    cache = { data: result, ts: Date.now(), query: q }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Google News error:', error)
    return NextResponse.json({ error: 'Failed to fetch Google News' }, { status: 500 })
  }
}

function extractSource(title: string): string {
  const match = title.match(/ - ([^-]+)$/)
  return match ? match[1].trim() : 'Unknown'
}
