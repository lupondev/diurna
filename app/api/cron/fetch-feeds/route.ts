import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Parser from 'rss-parser'

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

function getCategory(feedCategory: string, title: string): string {
  const lower = title.toLowerCase()
  if (lower.includes('transfer') || lower.includes('sign') || lower.includes('deal') || lower.includes('bid') || lower.includes('loan')) return 'transfer'
  if (lower.includes('preview') || lower.includes('predicted') || lower.includes('lineup')) return 'preview'
  if (lower.includes('result') || lower.includes('score') || lower.includes('beat') || lower.includes('defeat')) return 'result'
  if (lower.includes('analysis') || lower.includes('tactical') || lower.includes('why')) return 'analysis'
  return feedCategory || 'breaking'
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('Cron: auth mismatch, proceeding anyway in dev')
  }

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
          const sourceUrl = item.link || item.guid || ''
          if (!sourceUrl) continue

          const pubDate = item.pubDate ? new Date(item.pubDate) : new Date()
          if (isNaN(pubDate.getTime())) continue
          if (Date.now() - pubDate.getTime() > 48 * 60 * 60 * 1000) continue

          try {
            await prisma.newsItem.upsert({
              where: { sourceUrl },
              update: {
                title: item.title || '',
                pubDate,
                updatedAt: new Date(),
              },
              create: {
                title: item.title || '',
                source: feed.name,
                sourceDomain: extractSourceDomain(feed.name, sourceUrl),
                sourceUrl,
                content: (item.contentSnippet || item.content || '').slice(0, 500),
                category: getCategory(feed.category, item.title || ''),
                pubDate,
                feedUrl: feed.url,
                tier: feed.tier,
              },
            })
            newCount++
          } catch {}
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

  const CLEANUP_KEYWORDS = ['rugby', 'boxing', 'fury', 'usyk', 'ufc', 'mma', 'trivia', 'quiz', 'hull kr', 'nba', 'nhl', 'cricket', 'wrestling', 'nascar', 'f1', 'formula 1', 'super league', 'hull kingston']
  await prisma.newsItem.deleteMany({
    where: {
      OR: CLEANUP_KEYWORDS.map(kw => ({
        title: { contains: kw, mode: 'insensitive' as const }
      }))
    },
  }).catch(() => {})

  await computeDIS()

  return NextResponse.json({
    fetched: feeds.length,
    tiers: tierFilter,
    newItems: totalNew,
    errors: totalErrors,
    timestamp: new Date().toISOString(),
  })
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
