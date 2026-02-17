import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Parser from 'rss-parser'

const parser = new Parser()

let cache: { data: unknown; ts: number; query: string } | null = null
const CACHE_TTL = 5 * 60 * 1000

const EXCLUDE_KEYWORDS = ['college', 'ncaa', 'big 12', 'big ten', 'sec ', 'nfl', 'mls draft', 'nwsl', 'uswnt', 'usmnt', 'high school', 'padel', 'cricket', 'rugby', 'baseball', 'basketball', 'tennis', 'arizona soccer', 'naval academy']

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
    const mock = q.includes('transfer') ? getMockTransferNews() : getMockBreakingNews()
    return NextResponse.json({ items: mock, total: mock.length, query: q || 'football', source: 'mock', fetchedAt: new Date().toISOString() })
  }
}

function extractSource(title: string): string {
  const match = title.match(/ - ([^-]+)$/)
  return match ? match[1].trim() : 'Unknown'
}

function getMockBreakingNews(): { title: string; source: string; link: string; pubDate: string }[] {
  return [
    { title: 'Arsenal extend Premier League lead with dominant win over Wolves', source: 'BBC Sport', link: 'https://bbc.co.uk/sport/football', pubDate: new Date(Date.now() - 1800000).toISOString() },
    { title: 'Haaland scores hat-trick as Man City thrash Everton 5-0', source: 'Sky Sports', link: 'https://skysports.com/football', pubDate: new Date(Date.now() - 3600000).toISOString() },
    { title: 'Liverpool confirm Salah contract extension through 2027', source: 'ESPN', link: 'https://espn.com/soccer', pubDate: new Date(Date.now() - 5400000).toISOString() },
    { title: 'Real Madrid eye summer move for Premier League midfielder', source: 'The Guardian', link: 'https://theguardian.com/football', pubDate: new Date(Date.now() - 7200000).toISOString() },
    { title: 'Champions League draw: Barcelona face Bayern Munich in quarter-finals', source: 'ESPN FC', link: 'https://espn.com/soccer', pubDate: new Date(Date.now() - 9000000).toISOString() },
    { title: 'VAR controversy overshadows Manchester derby as City snatch late equalizer', source: 'BBC Sport', link: 'https://bbc.co.uk/sport/football', pubDate: new Date(Date.now() - 10800000).toISOString() },
    { title: 'Newcastle United announce record commercial deal worth £40m per year', source: 'Sky Sports', link: 'https://skysports.com/football', pubDate: new Date(Date.now() - 14400000).toISOString() },
    { title: 'Tottenham sack manager after five consecutive Premier League defeats', source: 'The Athletic', link: 'https://theathletic.com/football', pubDate: new Date(Date.now() - 18000000).toISOString() },
    { title: 'Mbappe suffers hamstring injury, could miss Champions League tie', source: 'Marca', link: 'https://marca.com', pubDate: new Date(Date.now() - 21600000).toISOString() },
    { title: 'Chelsea youngster breaks through with stunning debut goal against Aston Villa', source: 'ESPN', link: 'https://espn.com/soccer', pubDate: new Date(Date.now() - 25200000).toISOString() },
    { title: 'Premier League table: How the standings look after Matchday 28', source: 'BBC Sport', link: 'https://bbc.co.uk/sport/football', pubDate: new Date(Date.now() - 28800000).toISOString() },
    { title: 'Serie A roundup: Inter Milan maintain perfect home record', source: 'Reuters', link: 'https://reuters.com/sports', pubDate: new Date(Date.now() - 32400000).toISOString() },
    { title: 'Bundesliga: Dortmund close gap on Bayern with comeback victory', source: 'The Guardian', link: 'https://theguardian.com/football', pubDate: new Date(Date.now() - 36000000).toISOString() },
    { title: 'World Cup 2026 qualification: Key results from around the globe', source: 'ESPN FC', link: 'https://espn.com/soccer', pubDate: new Date(Date.now() - 43200000).toISOString() },
    { title: 'FA Cup semi-final draw: Arsenal to face Manchester United at Wembley', source: 'Sky Sports', link: 'https://skysports.com/football', pubDate: new Date(Date.now() - 50400000).toISOString() },
  ]
}

function getMockTransferNews(): { title: string; source: string; link: string; pubDate: string }[] {
  return [
    { title: '[Fabrizio Romano] Arsenal complete signing of Spain international — here we go confirmed', source: 'The Guardian', link: 'https://theguardian.com/football', pubDate: new Date(Date.now() - 3600000).toISOString() },
    { title: 'Manchester United agree £65m fee for Bundesliga striker', source: 'Sky Sports', link: 'https://skysports.com/football', pubDate: new Date(Date.now() - 7200000).toISOString() },
    { title: 'Chelsea target Ajax defender as Pochettino plans squad overhaul', source: 'ESPN', link: 'https://espn.com/soccer', pubDate: new Date(Date.now() - 10800000).toISOString() },
    { title: 'Liverpool identify La Liga winger as Salah long-term successor', source: 'The Athletic', link: 'https://theathletic.com/football', pubDate: new Date(Date.now() - 14400000).toISOString() },
    { title: 'Real Madrid to trigger €120m release clause for Premier League star', source: 'Marca', link: 'https://marca.com', pubDate: new Date(Date.now() - 18000000).toISOString() },
    { title: 'PSG offer Barcelona forward in swap deal for midfielder', source: 'ESPN FC', link: 'https://espn.com/soccer', pubDate: new Date(Date.now() - 21600000).toISOString() },
    { title: 'Tottenham close in on Serie A midfielder for £30m transfer', source: 'BBC Sport', link: 'https://bbc.co.uk/sport/football', pubDate: new Date(Date.now() - 25200000).toISOString() },
    { title: 'Aston Villa sign Brazilian full-back on five-year deal', source: 'Sky Sports', link: 'https://skysports.com/football', pubDate: new Date(Date.now() - 28800000).toISOString() },
    { title: 'Newcastle enter race for Napoli winger rated at €80m', source: 'The Guardian', link: 'https://theguardian.com/football', pubDate: new Date(Date.now() - 36000000).toISOString() },
    { title: 'Bayern Munich confirm departure of veteran midfielder on free transfer', source: 'ESPN', link: 'https://espn.com/soccer', pubDate: new Date(Date.now() - 43200000).toISOString() },
  ]
}
