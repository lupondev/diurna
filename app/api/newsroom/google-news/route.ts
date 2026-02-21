import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Parser from 'rss-parser'

const parser = new Parser()

let cache: { data: unknown; ts: number; query: string } | null = null
const CACHE_TTL = 5 * 60 * 1000

const EXCLUDE_KEYWORDS = [
  'college', 'ncaa', 'big 12', 'big ten', 'sec ', 'nfl', 'mls draft', 'nwsl', 'uswnt', 'usmnt', 'high school',
  'rugby', 'rugby league', 'cricket', 'baseball', 'basketball', 'tennis', 'golf', 'padel',
  'boxing', 'fury', 'usyk', 'tyson', 'canelo', 'ufc', 'mma', 'wrestling',
  'f1', 'formula 1', 'nascar', 'motogp', 'cycling', 'tour de france',
  'nba', 'nhl', 'mlb', 'afl',
  'olympic', 'olympics', 'swimming', 'athletics', 'gymnastics',
  'hockey', 'ice hockey', 'field hockey',
  'handball', 'volleyball', 'badminton', 'table tennis',
  'esports', 'gaming',
  'trivia', 'quiz', 'podcast recap', 'daily discussion', 'monday moan', 'free talk',
  'arizona soccer', 'naval academy',
  'hull kr', 'super league', 'hull kingston',
  'podcast', 'mailbag', 'q&a', 'ask me anything',
  'fantasy football', 'fantasy premier league', 'fpl',
  'betting tips', 'betting odds', 'prediction:',
  'livescore', 'live stream', 'livestream', 'how to watch', 'where to watch',
  'highlights video', 'watch:', 'video:',
]

function isFootballArticle(title: string): boolean {
  const lower = title.toLowerCase()
  return !EXCLUDE_KEYWORDS.some(kw => lower.includes(kw))
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const q = req.nextUrl.searchParams.get('q') || '"Premier League" OR "Champions League" OR "La Liga" OR "Serie A" OR "Bundesliga" OR "Europa League" OR "football transfer"'
    const hl = req.nextUrl.searchParams.get('hl') || 'en'

    if (cache && cache.query === q && Date.now() - cache.ts < CACHE_TTL) {
      return NextResponse.json(cache.data)
    }

    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${hl}`
    const feed = await parser.parseURL(url)

    const items = (feed.items || []).slice(0, 50).map((item) => ({
      title: item.title || '',
      source: item.creator || item['dc:creator'] || extractSource(item.title || ''),
      link: item.link || '',
      pubDate: item.pubDate || item.isoDate || '',
    })).filter(item => isFootballArticle(item.title)).slice(0, 30)

    const result = { items, total: items.length, query: q, fetchedAt: new Date().toISOString() }
    cache = { data: result, ts: Date.now(), query: q }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Google News error:', error)
    const q = req.nextUrl.searchParams.get('q') || ''
    return NextResponse.json({ items: [], total: 0, query: q || 'football', source: 'error', fetchedAt: new Date().toISOString() })
  }
}

function extractSource(title: string): string {
  const match = title.match(/ - ([^-]+)$/)
  return match ? match[1].trim() : 'Unknown'
}

