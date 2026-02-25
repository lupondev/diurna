import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { captureApiError } from '@/lib/sentry'
import Parser from 'rss-parser'
import crypto from 'crypto'

// ── Auth helper ───────────────────────────────────────────────────────────────
function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // not configured → allow (dev mode)

  // Method 1: Vercel cron / cron-job.org with Authorization header
  const authHeader = req.headers.get('authorization')
  if (authHeader === `Bearer ${secret}`) return true

  // Method 2: Query param — cron-job.org free plan fallback
  // Usage: /api/cron/fetch-feeds?secret=YOUR_CRON_SECRET
  try {
    const url = new URL(req.url)
    const secretParam = url.searchParams.get('secret')
    if (secretParam && secretParam === secret) return true
  } catch (err) {
    console.error('Cron fetch-feeds URL/secret check:', err)
  }

  // Method 3: x-cron-secret header (used by newsroom "Fetch now" button)
  const cronHeader = req.headers.get('x-cron-secret')
  if (cronHeader === secret) return true

  return false
}

const parser = new Parser({
  timeout: 5000,
  headers: { 'User-Agent': 'Diurna/1.0 Sports Newsroom Bot' },
})

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

function extractSourceDomain(feedName: string, link: string): string {
  try {
    const url = new URL(link)
    return url.hostname.replace('www.', '')
  } catch {
    return feedName.toLowerCase().replace(/\s+/g, '') + '.com'
  }
}

function normalizeUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl)
    const stripParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
                         'ref', 'source', 'fbclid', 'gclid', 'mc_cid', 'mc_eid']
    stripParams.forEach(p => u.searchParams.delete(p))
    u.hash = ''
    const path = u.pathname.replace(/\/+$/, '')
    return u.origin + path + (u.search || '')
  } catch {
    return rawUrl
  }
}

function generateContentHash(title: string, source: string): string {
  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => w.length > 3)
    .sort()
    .join(' ')
  return crypto
    .createHash('md5')
    .update(normalized + '|' + source.toLowerCase())
    .digest('hex')
}

function getCategory(feedCategory: string, title: string): string {
  const lower = title.toLowerCase()
  if (lower.includes('transfer') || lower.includes('sign') || lower.includes('deal') || lower.includes('bid') || lower.includes('loan')) return 'transfer'
  if (lower.includes('preview') || lower.includes('predicted') || lower.includes('lineup')) return 'preview'
  if (lower.includes('result') || lower.includes('score') || lower.includes('beat') || lower.includes('defeat')) return 'result'
  if (lower.includes('analysis') || lower.includes('tactical') || lower.includes('why')) return 'analysis'
  return feedCategory || 'breaking'
}

export async function GET(req: Request) {
  // Security: reject unauthorized requests
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
  const url = new URL(req.url)
  const tierParam = url.searchParams.get('tier')

  let tierFilter: number[]
  if (tierParam === 'all') {
    tierFilter = [1, 2, 3]
  } else if (tierParam) {
    tierFilter = tierParam.split(',').map(Number).filter(n => !isNaN(n))
  } else {
    const minute = new Date().getMinutes()
    if (minute % 5 === 0) {
      tierFilter = [1, 2, 3]
    } else if (minute % 3 === 0) {
      tierFilter = [1, 2]
    } else {
      tierFilter = [1]
    }
  }

  const take = tierParam === 'all' ? 65 : 20

  const feeds = await prisma.feedSource.findMany({
    where: {
      active: true,
      tier: { in: tierFilter },
    },
    orderBy: { lastFetch: 'asc' },
    take,
  })

  let totalNew = 0
  let totalErrors = 0

  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feed.url)
        const items = (parsed.items || [])
          .filter(item => item.title && isFootballArticle(item.title))
          .slice(0, 15)

        let newCount = 0
        for (const item of items) {
          const rawUrl = item.link || item.guid || ''
          if (!rawUrl) continue

          const pubDate = item.pubDate ? new Date(item.pubDate) : new Date()
          if (isNaN(pubDate.getTime())) continue
          if (Date.now() - pubDate.getTime() > 48 * 60 * 60 * 1000) continue

          const sourceUrl = normalizeUrl(rawUrl)
          const hash = generateContentHash(item.title || '', feed.name)

          try {
            await prisma.newsItem.upsert({
              where: { sourceUrl },
              update: {
                title: item.title || '',
                pubDate,
                contentHash: hash,
                updatedAt: new Date(),
              },
              create: {
                title: item.title || '',
                source: feed.name,
                sourceDomain: extractSourceDomain(feed.name, sourceUrl),
                sourceUrl,
                contentHash: hash,
                content: (item.contentSnippet || item.content || '').slice(0, 500),
                category: getCategory(feed.category, item.title || ''),
                pubDate,
                feedUrl: feed.url,
                tier: feed.tier,
              },
            })
            newCount++
          } catch (err) {
            console.error('Feed item create (duplicate or error):', err)
          }
        }

        await prisma.feedSource.update({
          where: { id: feed.id },
          data: {
            lastFetch: new Date(),
            itemCount: { increment: newCount },
            errorCount: 0,
          },
        })

        return { feed: feed.name, items: newCount }
      } catch (error) {
        await prisma.feedSource.update({
          where: { id: feed.id },
          data: { errorCount: { increment: 1 } },
        }).catch(() => {})

        totalErrors++
        return { feed: feed.name, error: String(error) }
      }
    })
  )

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value && 'items' in r.value) {
      totalNew += r.value.items as number
    }
  }

  await prisma.newsItem.deleteMany({
    where: { pubDate: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) } },
  }).catch(() => {})

  const CLEANUP_KEYWORDS = ['rugby', 'boxing', 'fury', 'usyk', 'ufc', 'mma', 'trivia', 'quiz', 'hull kr', 'nba', 'nhl', 'cricket', 'wrestling', 'nascar', 'f1', 'formula 1', 'super league', 'hull kingston', 'podcast', 'fantasy football', 'fantasy premier league', 'fpl', 'betting tips', 'betting odds', 'livescore', 'how to watch', 'where to watch']
  await prisma.newsItem.deleteMany({
    where: {
      OR: CLEANUP_KEYWORDS.map(kw => ({
        title: { contains: kw, mode: 'insensitive' as const }
      }))
    },
  }).catch(() => {})

  const dedupDeleted = await crossSourceDedup()

  await computeDIS()

  return NextResponse.json({
    fetched: feeds.length,
    tiers: tierFilter,
    newItems: totalNew,
    errors: totalErrors,
    deduplicated: dedupDeleted,
    timestamp: new Date().toISOString(),
  })
  } catch (error) {
    captureApiError(error, { route: '/api/cron/fetch-feeds', method: 'GET' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function crossSourceDedup(): Promise<number> {
  const items = await prisma.newsItem.findMany({
    where: { pubDate: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    orderBy: { pubDate: 'desc' },
  })

  const groups = new Map<string, typeof items>()
  for (const item of items) {
    const key = item.title
      .toLowerCase()
      .replace(/\s*[-–—]\s*\w.*$/, '')
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 8)
      .join(' ')
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }

  let deleted = 0
  for (const [, group] of Array.from(groups)) {
    if (group.length <= 1) continue
    group.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    })
    const toDelete = group.slice(1).map(i => i.id)
    if (toDelete.length > 0) {
      await prisma.newsItem.deleteMany({ where: { id: { in: toDelete } } })
      deleted += toDelete.length
    }
  }

  return deleted
}

async function computeDIS() {
  const recentItems = await prisma.newsItem.findMany({
    where: { pubDate: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    select: { id: true, title: true, source: true, pubDate: true, tier: true },
  })

  const clusters: { words: string; items: typeof recentItems }[] = []

  for (const item of recentItems) {
    const words = item.title.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    let matched = false
    for (const cluster of clusters) {
      const keyWords = cluster.words.split(' ')
      const overlap = words.filter(w => keyWords.includes(w)).length
      if (overlap >= 3) {
        cluster.items.push(item)
        matched = true
        break
      }
    }
    if (!matched) {
      clusters.push({ words: words.join(' '), items: [item] })
    }
  }

  const updates: { id: string; dis: number }[] = []

  for (const cluster of clusters) {
    const sourceCount = new Set(cluster.items.map(i => i.source)).size
    for (const item of cluster.items) {
      const hoursOld = (Date.now() - new Date(item.pubDate).getTime()) / 3600000
      const recencyBonus = Math.max(0, 50 - (hoursOld * 5))
      const sourceBonus = sourceCount * 8
      const tierBonus = item.tier === 1 ? 10 : item.tier === 2 ? 5 : 0
      const raw = recencyBonus + sourceBonus + tierBonus
      const dis = Math.min(100, Math.max(1, Math.round(raw)))
      updates.push({ id: item.id, dis })
    }
  }

  for (let i = 0; i < updates.length; i += 50) {
    const batch = updates.slice(i, i + 50)
    await Promise.allSettled(
      batch.map(u => prisma.newsItem.update({ where: { id: u.id }, data: { dis: u.dis } }))
    )
  }
}
