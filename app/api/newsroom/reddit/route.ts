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
    return NextResponse.json({ posts: getMockRedditPosts(), total: 8, source: 'mock', fetchedAt: new Date().toISOString() })
  }
}

function getMockRedditPosts() {
  return [
    { title: 'Salah breaks Premier League assist record with stunning through ball', score: 12400, comments: 1823, link: 'https://reddit.com', subreddit: 'soccer', pubDate: new Date(Date.now() - 1800000).toISOString() },
    { title: '[Fabrizio Romano] Arsenal complete signing of midfielder — here we go confirmed', score: 9800, comments: 2105, link: 'https://reddit.com', subreddit: 'soccer', pubDate: new Date(Date.now() - 3600000).toISOString() },
    { title: 'Post Match Thread: Real Madrid 3-2 Barcelona [La Liga]', score: 8200, comments: 4521, link: 'https://reddit.com', subreddit: 'soccer', pubDate: new Date(Date.now() - 7200000).toISOString() },
    { title: 'VAR decision in City vs Liverpool sparks massive debate', score: 7600, comments: 3200, link: 'https://reddit.com', subreddit: 'PremierLeague', pubDate: new Date(Date.now() - 10800000).toISOString() },
    { title: 'Haaland scores hat-trick to go top of Golden Boot race', score: 6100, comments: 890, link: 'https://reddit.com', subreddit: 'PremierLeague', pubDate: new Date(Date.now() - 14400000).toISOString() },
    { title: 'Bayern Munich sack manager after Champions League exit', score: 5400, comments: 1450, link: 'https://reddit.com', subreddit: 'soccer', pubDate: new Date(Date.now() - 18000000).toISOString() },
    { title: 'Newcastle announce record-breaking sponsorship deal', score: 3200, comments: 670, link: 'https://reddit.com', subreddit: 'PremierLeague', pubDate: new Date(Date.now() - 21600000).toISOString() },
    { title: 'Compilation of all red cards this season — the worst tackles', score: 2800, comments: 520, link: 'https://reddit.com', subreddit: 'football', pubDate: new Date(Date.now() - 43200000).toISOString() },
  ]
}
