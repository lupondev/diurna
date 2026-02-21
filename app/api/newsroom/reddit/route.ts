import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const SUBREDDITS = ['soccer', 'PremierLeague', 'football']

let cache: { data: unknown; ts: number } | null = null
const CACHE_TTL = 5 * 60 * 1000

type RedditChild = {
  data: {
    title: string
    score: number
    num_comments: number
    permalink: string
    selftext: string
    link_flair_text: string | null
    url: string
    subreddit: string
    created_utc: number
    stickied: boolean
    thumbnail: string
    over_18: boolean
  }
}

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
      selftext: string
      flair: string
      url: string
    }[] = []

    for (const sub of SUBREDDITS) {
      try {
        const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=15`, {
          headers: { 'User-Agent': 'Diurna/1.0 (newsroom aggregator)' },
        })
        if (!res.ok) continue
        const json = await res.json() as { data?: { children?: RedditChild[] } }
        const children: RedditChild[] = json?.data?.children || []

        for (const child of children) {
          const d = child.data
          if (d.stickied || d.over_18) continue
          allPosts.push({
            title: d.title,
            score: d.score,
            comments: d.num_comments,
            link: `https://www.reddit.com${d.permalink}`,
            subreddit: d.subreddit,
            pubDate: new Date(d.created_utc * 1000).toISOString(),
            selftext: (d.selftext || '').slice(0, 500),
            flair: d.link_flair_text || '',
            url: d.url || '',
          })
        }
      } catch (e) {
        console.error(`Reddit r/${sub} error:`, e)
      }
    }

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
    return NextResponse.json({ posts: [], total: 0, source: 'error', fetchedAt: new Date().toISOString() })
  }
}

