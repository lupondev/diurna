import { prisma } from './prisma'

export interface TrendingTopic {
  id: string
  title: string
  score: number
  sources: string[]
  sourcesCount: number
  category: 'Sport' | 'Politics' | 'Tech' | 'Business' | 'Entertainment' | 'General'
  suggestedType: 'breaking' | 'report' | 'analysis' | 'preview'
  velocity: 'rising' | 'peaked' | 'falling'
  estimatedViews: string
  traffic: string
  recency: number
}

interface RawItem {
  title: string
  source: string
  traffic: string
  link: string
  pubDate?: string
}

const cache = new Map<string, { data: TrendingTopic[]; expires: number }>()
const CACHE_TTL = 10 * 60 * 1000

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Sport: ['football', 'soccer', 'match', 'goal', 'player', 'league', 'champions', 'world cup', 'nba', 'nfl', 'tennis', 'f1', 'racing', 'olympics', 'premier league', 'la liga', 'bundesliga', 'serie a', 'transfer', 'coach', 'stadium', 'team', 'athlete', 'sport', 'game', 'utakmica', 'fudbal', 'košarka'],
  Politics: ['election', 'president', 'minister', 'parliament', 'government', 'vote', 'law', 'policy', 'senate', 'congress', 'political', 'trump', 'biden', 'eu', 'nato', 'diplomacy', 'war', 'conflict', 'sanction', 'izbori', 'vlada'],
  Tech: ['ai', 'apple', 'google', 'microsoft', 'openai', 'tesla', 'crypto', 'bitcoin', 'startup', 'software', 'app', 'iphone', 'android', 'tech', 'hack', 'data', 'chip', 'semiconductor', 'robot', 'spacex'],
  Business: ['stock', 'market', 'economy', 'trade', 'bank', 'finance', 'company', 'investment', 'revenue', 'profit', 'merger', 'acquisition', 'ceo', 'industry', 'inflation', 'gdp'],
  Entertainment: ['movie', 'film', 'music', 'celebrity', 'show', 'concert', 'album', 'actor', 'singer', 'netflix', 'oscar', 'grammy', 'tv', 'series', 'premiere', 'star', 'pop', 'rock', 'viral', 'tiktok', 'instagram'],
}

function detectCategory(title: string): TrendingTopic['category'] {
  const lower = title.toLowerCase()
  let bestMatch: TrendingTopic['category'] = 'General'
  let bestScore = 0

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const hits = keywords.filter(k => lower.includes(k)).length
    if (hits > bestScore) {
      bestScore = hits
      bestMatch = cat as TrendingTopic['category']
    }
  }

  return bestMatch
}

function detectArticleType(title: string, category: string): TrendingTopic['suggestedType'] {
  const lower = title.toLowerCase()
  if (lower.includes('breaking') || lower.includes('urgent') || lower.includes('just in')) return 'breaking'
  if (lower.includes('preview') || lower.includes('upcoming') || lower.includes('vs')) return 'preview'
  if (lower.includes('analysis') || lower.includes('why') || lower.includes('how') || lower.includes('deep')) return 'analysis'
  if (category === 'Sport' && (lower.includes('vs') || lower.includes('match'))) return 'preview'
  return 'report'
}

function estimateViews(score: number): string {
  if (score >= 90) return 'Could get 50K+ views based on similar topics'
  if (score >= 75) return 'Could get 15K-30K views based on similar topics'
  if (score >= 60) return 'Could get 5K-15K views based on similar topics'
  if (score >= 40) return 'Could get 1K-5K views based on similar topics'
  return 'Could get 500-1K views based on similar topics'
}

function parseTrafficNumber(traffic: string): number {
  if (!traffic) return 0
  const clean = traffic.replace(/[+,]/g, '').trim()
  if (clean.endsWith('K')) return parseFloat(clean) * 1000
  if (clean.endsWith('M')) return parseFloat(clean) * 1000000
  return parseInt(clean) || 0
}

async function fetchGoogleTrends(geos: string[]): Promise<RawItem[]> {
  const items: RawItem[] = []

  await Promise.all(geos.map(async (geo) => {
    try {
      const url = `https://trends.google.com/trending/rss?geo=${geo}`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Diurna/1.0' },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) return

      const xml = await res.text()
      const itemRegex = /<item>([\s\S]*?)<\/item>/g
      let match
      while ((match = itemRegex.exec(xml)) !== null && items.length < 50) {
        const block = match[1]
        const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
          || block.match(/<title>(.*?)<\/title>/)?.[1] || ''
        const traffic = block.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/)?.[1] || ''
        const link = block.match(/<link>(.*?)<\/link>/)?.[1] || ''

        if (title.trim()) {
          items.push({
            title: title.trim(),
            source: `Google Trends (${geo})`,
            traffic,
            link,
          })
        }
      }
    } catch {}
  }))

  return items
}

async function fetchCompetitorFeeds(organizationId: string): Promise<RawItem[]> {
  const site = await prisma.site.findFirst({
    where: { organization: { id: organizationId } },
    select: { competitorFeeds: true },
  })

  const feeds = site?.competitorFeeds || []
  if (feeds.length === 0) return []

  const items: RawItem[] = []

  await Promise.all(feeds.map(async (url) => {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Diurna/1.0' },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) return

      const xml = await res.text()
      const channelTitle = xml.match(/<channel>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
        || xml.match(/<channel>[\s\S]*?<title>(.*?)<\/title>/)?.[1]
        || new URL(url).hostname

      const itemRegex = /<item>([\s\S]*?)<\/item>/g
      let match
      let count = 0
      while ((match = itemRegex.exec(xml)) !== null && count < 10) {
        const block = match[1]
        const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
          || block.match(/<title>(.*?)<\/title>/)?.[1] || ''
        const link = block.match(/<link>(.*?)<\/link>/)?.[1] || ''
        const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''

        if (title.trim()) {
          items.push({ title: title.trim(), source: channelTitle, traffic: '', link, pubDate })
          count++
        }
      }
    } catch {}
  }))

  return items
}

async function fetchFootballTrends(): Promise<RawItem[]> {
  const items: RawItem[] = []
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/football?action=today`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return items

    const data = await res.json()
    const matches = data.matches || data.response || []
    for (const m of matches.slice(0, 10)) {
      const home = m.teams?.home?.name || m.homeTeam || ''
      const away = m.teams?.away?.name || m.awayTeam || ''
      if (home && away) {
        items.push({
          title: `${home} vs ${away}`,
          source: 'Live Football',
          traffic: '',
          link: '',
        })
      }
    }
  } catch {}
  return items
}

function normalize(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

function areSimilar(a: string, b: string): boolean {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return true

  const wordsA = new Set(na.split(' ').filter(w => w.length > 3))
  const wordsB = new Set(nb.split(' ').filter(w => w.length > 3))
  if (wordsA.size === 0 || wordsB.size === 0) return false

  let overlap = 0
  Array.from(wordsA).forEach(w => {
    if (wordsB.has(w)) overlap++
  })

  const similarity = overlap / Math.min(wordsA.size, wordsB.size)
  return similarity >= 0.6
}

function deduplicateAndScore(items: RawItem[]): TrendingTopic[] {
  const groups: { title: string; sources: Set<string>; traffic: number; items: RawItem[] }[] = []

  for (const item of items) {
    let matched = false
    for (const group of groups) {
      if (areSimilar(item.title, group.title)) {
        group.sources.add(item.source)
        group.traffic = Math.max(group.traffic, parseTrafficNumber(item.traffic))
        group.items.push(item)
        matched = true
        break
      }
    }
    if (!matched) {
      groups.push({
        title: item.title,
        sources: new Set([item.source]),
        traffic: parseTrafficNumber(item.traffic),
        items: [item],
      })
    }
  }

  return groups.map((group, i) => {
    let score = 20
    score += Math.min(group.sources.size * 10, 30)

    if (group.traffic >= 1000000) score += 25
    else if (group.traffic >= 500000) score += 20
    else if (group.traffic >= 100000) score += 15
    else if (group.traffic >= 10000) score += 10
    else if (group.traffic > 0) score += 5

    const now = Date.now()
    let newestAge = Infinity
    for (const item of group.items) {
      if (item.pubDate) {
        const age = (now - new Date(item.pubDate).getTime()) / (1000 * 60 * 60)
        newestAge = Math.min(newestAge, age)
      }
    }
    if (newestAge < 1) score += 15
    else if (newestAge < 3) score += 12
    else if (newestAge < 6) score += 8
    else if (newestAge < 24) score += 4

    if (i < 3) score += 10
    else if (i < 10) score += 5

    score = Math.min(score, 100)

    const category = detectCategory(group.title)
    const suggestedType = detectArticleType(group.title, category)

    let velocity: TrendingTopic['velocity'] = 'rising'
    if (group.traffic >= 500000) velocity = 'peaked'
    if (newestAge > 12) velocity = 'falling'

    const trafficStr = group.traffic > 0
      ? (group.traffic >= 1000000 ? `${(group.traffic / 1000000).toFixed(1)}M+` : group.traffic >= 1000 ? `${Math.floor(group.traffic / 1000)}K+` : `${group.traffic}`)
      : ''

    return {
      id: `t-${i}-${normalize(group.title).slice(0, 20).replace(/\s/g, '-')}`,
      title: group.title,
      score,
      sources: Array.from(group.sources),
      sourcesCount: group.sources.size,
      category,
      suggestedType,
      velocity,
      estimatedViews: estimateViews(score),
      traffic: trafficStr,
      recency: newestAge === Infinity ? 0 : Math.round(newestAge),
    }
  }).sort((a, b) => b.score - a.score)
}

export async function getTrendingTopics(organizationId: string): Promise<TrendingTopic[]> {
  const cacheKey = `smart-${organizationId}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() < cached.expires) return cached.data

  const geos = ['BA', 'US', 'GB', 'HR', 'RS', 'DE']

  const [googleTrends, competitorItems, footballItems] = await Promise.all([
    fetchGoogleTrends(geos),
    fetchCompetitorFeeds(organizationId),
    fetchFootballTrends(),
  ])

  const allItems = [...googleTrends, ...competitorItems, ...footballItems]
  const topics = deduplicateAndScore(allItems).slice(0, 50)

  cache.set(cacheKey, { data: topics, expires: Date.now() + CACHE_TTL })
  return topics
}
