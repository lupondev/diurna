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
        const json = await res.json()
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
    return NextResponse.json({ posts: getMockRedditPosts(), total: 8, source: 'mock', fetchedAt: new Date().toISOString() })
  }
}

function getMockRedditPosts() {
  return [
    { title: 'Salah breaks Premier League assist record with stunning through ball', score: 12400, comments: 1823, link: 'https://reddit.com/r/soccer/comments/abc123', subreddit: 'soccer', pubDate: new Date(Date.now() - 1800000).toISOString(), selftext: 'Mohamed Salah has broken the Premier League assist record with his 21st assist of the season, a perfectly weighted through ball to set up the winning goal.', flair: 'Stats', url: 'https://reddit.com' },
    { title: '[Fabrizio Romano] Arsenal complete signing of midfielder — here we go confirmed', score: 9800, comments: 2105, link: 'https://reddit.com/r/soccer/comments/def456', subreddit: 'soccer', pubDate: new Date(Date.now() - 3600000).toISOString(), selftext: '', flair: 'Transfer', url: 'https://twitter.com/FabrizioRomano/status/123' },
    { title: 'Post Match Thread: Real Madrid 3-2 Barcelona [La Liga]', score: 8200, comments: 4521, link: 'https://reddit.com/r/soccer/comments/ghi789', subreddit: 'soccer', pubDate: new Date(Date.now() - 7200000).toISOString(), selftext: 'FT: Real Madrid 3-2 Barcelona\n\nGoals: Vinicius Jr 12\', 67\', Bellingham 45+2\' — Yamal 34\', Lewandowski 78\'\n\nRed card: Araujo 55\' (second yellow)', flair: 'Post Match Thread', url: 'https://reddit.com' },
    { title: 'VAR decision in City vs Liverpool sparks massive debate', score: 7600, comments: 3200, link: 'https://reddit.com/r/PremierLeague/comments/jkl012', subreddit: 'PremierLeague', pubDate: new Date(Date.now() - 10800000).toISOString(), selftext: 'The VAR decision to disallow Liverpool\'s equalizer has caused huge controversy. The ball appeared to be still in play when the whistle was blown.', flair: 'Discussion', url: 'https://streamable.com/abc' },
    { title: 'Haaland scores hat-trick to go top of Golden Boot race', score: 6100, comments: 890, link: 'https://reddit.com/r/PremierLeague/comments/mno345', subreddit: 'PremierLeague', pubDate: new Date(Date.now() - 14400000).toISOString(), selftext: 'Erling Haaland has scored his third hat-trick of the season, taking his tally to 28 goals in 25 Premier League appearances.', flair: 'Stats', url: 'https://reddit.com' },
    { title: 'Bayern Munich sack manager after Champions League exit', score: 5400, comments: 1450, link: 'https://reddit.com/r/soccer/comments/pqr678', subreddit: 'soccer', pubDate: new Date(Date.now() - 18000000).toISOString(), selftext: '', flair: 'News', url: 'https://fcbayern.com/en/news' },
    { title: 'Newcastle announce record-breaking sponsorship deal', score: 3200, comments: 670, link: 'https://reddit.com/r/PremierLeague/comments/stu901', subreddit: 'PremierLeague', pubDate: new Date(Date.now() - 21600000).toISOString(), selftext: 'Newcastle United have announced a record-breaking sponsorship deal reportedly worth £40m per year.', flair: 'News', url: 'https://nufc.co.uk' },
    { title: 'Compilation of all red cards this season — the worst tackles', score: 2800, comments: 520, link: 'https://reddit.com/r/football/comments/vwx234', subreddit: 'football', pubDate: new Date(Date.now() - 43200000).toISOString(), selftext: 'A compilation of every red card in the top 5 European leagues this season. Some truly shocking tackles in here.', flair: 'Media', url: 'https://youtube.com/watch?v=abc123' },
  ]
}
