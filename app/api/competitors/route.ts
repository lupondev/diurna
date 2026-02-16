import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface FeedItem {
  title: string
  link: string
  pubDate: string
  source: string
}

async function parseFeed(url: string): Promise<FeedItem[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Diurna/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []

    const xml = await res.text()
    const items: FeedItem[] = []

    // Extract channel title for source name
    const channelTitle = xml.match(/<channel>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
      || xml.match(/<channel>[\s\S]*?<title>(.*?)<\/title>/)?.[1]
      || new URL(url).hostname

    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match
    while ((match = itemRegex.exec(xml)) !== null && items.length < 10) {
      const block = match[1]
      const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
        || block.match(/<title>(.*?)<\/title>/)?.[1] || ''
      const link = block.match(/<link>(.*?)<\/link>/)?.[1] || ''
      const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''

      if (title) {
        items.push({ title: title.trim(), link, pubDate, source: channelTitle })
      }
    }

    return items
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const site = await prisma.site.findFirst({
      where: { organization: { id: session.user.organizationId } },
      select: { competitorFeeds: true },
    })

    const feeds = site?.competitorFeeds || []
    if (feeds.length === 0) {
      return NextResponse.json({ articles: [], message: 'No competitor feeds configured' })
    }

    // Fetch all feeds in parallel
    const results = await Promise.all(feeds.map((url) => parseFeed(url)))
    const allArticles = results
      .flat()
      .sort((a, b) => {
        const da = a.pubDate ? new Date(a.pubDate).getTime() : 0
        const db = b.pubDate ? new Date(b.pubDate).getTime() : 0
        return db - da
      })
      .slice(0, 30)

    return NextResponse.json({ articles: allArticles })
  } catch (error) {
    console.error('Competitors error:', error)
    return NextResponse.json({ error: 'Failed to fetch competitor feeds' }, { status: 500 })
  }
}
