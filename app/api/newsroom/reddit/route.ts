import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Parser from 'rss-parser'

const parser = new Parser()

const SUBREDDITS = ['soccer', 'PremierLeague', 'football']

let cache: { data: unknown; ts: number } | null = null
const CACHE_TTL = 5 * 60 * 1000

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return NextResponse.json(cache.data)
    }

    const allPosts: {
      title: string
      score: number
      comments: number
      link: string
      subreddit: string
      pubDate: string
    }[] = []

    for (const sub of SUBREDDITS) {
      try {
        const feed = await parser.parseURL(`https://www.reddit.com/r/${sub}/hot.rss`)
        for (const item of (feed.items || []).slice(0, 15)) {
          const scoreMatch = item.contentSnippet?.match(/(\d+)\s*(?:points?|upvotes?)/i)
          const commentMatch = item.contentSnippet?.match(/(\d+)\s*comments?/i)

          allPosts.push({
            title: (item.title || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
            score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
            comments: commentMatch ? parseInt(commentMatch[1]) : 0,
            link: item.link || '',
            subreddit: sub,
            pubDate: item.pubDate || item.isoDate || '',
          })
        }
      } catch (e) {
        console.error(`Reddit r/${sub} error:`, e)
      }
    }

    // Sort by score descending
    allPosts.sort((a, b) => b.score - a.score)

    const result = {
      posts: allPosts.slice(0, 30),
      total: allPosts.length,
      fetchedAt: new Date().toISOString(),
    }

    cache = { data: result, ts: Date.now() }
    return NextResponse.json(result)
  } catch (error) {
    console.error('Reddit error:', error)
    return NextResponse.json({ error: 'Failed to fetch Reddit' }, { status: 500 })
  }
}
