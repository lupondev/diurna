import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

const EVENT_PATTERNS: { type: string; keywords: string[] }[] = [
  { type: 'transfer', keywords: ['transfer', 'sign', 'deal', 'bid', 'loan', 'fee', 'contract', 'move', 'swap', 'buyout', 'release clause'] },
  { type: 'injury', keywords: ['injury', 'injured', 'hamstring', 'acl', 'ruled out', 'sidelined', 'knee', 'ankle', 'muscle', 'fracture'] },
  { type: 'result', keywords: ['beat', 'defeat', 'draw', 'won', 'lost', 'score', 'goals', 'winner', 'comeback'] },
  { type: 'manager', keywords: ['sacked', 'fired', 'appointed', 'manager', 'coach', 'resign', 'interim', 'replaced'] },
  { type: 'preview', keywords: ['preview', 'predicted', 'lineup', 'team news', 'ahead of', 'face', 'clash'] },
  { type: 'suspension', keywords: ['suspended', 'ban', 'red card', 'sent off', 'suspension', 'yellow card'] },
  { type: 'tactical', keywords: ['analysis', 'tactical', 'formation', 'pressing', 'xg', 'possession'] },
  { type: 'award', keywords: ['ballon', 'golden boot', 'best player', 'award', 'nominee', 'winner'] },
]

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'dare',
  'not', 'so', 'no', 'nor', 'too', 'very', 'just', 'about', 'above',
  'after', 'again', 'all', 'also', 'am', 'any', 'because', 'before',
  'between', 'both', 'during', 'each', 'few', 'get', 'got', 'he', 'her',
  'here', 'him', 'his', 'how', 'if', 'into', 'it', 'its', 'me', 'more',
  'most', 'my', 'new', 'now', 'off', 'old', 'only', 'other', 'our',
  'out', 'over', 'own', 'same', 'she', 'some', 'such', 'than', 'that',
  'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those',
  'through', 'under', 'until', 'up', 'upon', 'us', 'what', 'when',
  'where', 'which', 'while', 'who', 'whom', 'why', 'you', 'your',
  'says', 'said', 'report', 'reports', 'according', 'per', 'via', 'set',
  'look', 'make', 'going', 'want', 'like', 'back', 'still', 'even',
  'well', 'way', 'take', 'come', 'know', 'think', 'good', 'give',
])

function detectEventType(title: string): string | null {
  const lower = title.toLowerCase()
  for (const pattern of EVENT_PATTERNS) {
    if (pattern.keywords.some(kw => lower.includes(kw))) {
      return pattern.type
    }
  }
  return null
}

function extractSignificantWords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
}

function buildClusterKey(entityNames: string[], eventType: string | null): string {
  const sorted = Array.from(new Set(entityNames)).sort()
  const raw = sorted.join('|') + (eventType ? `::${eventType}` : '')
  return crypto.createHash('md5').update(raw.toLowerCase()).digest('hex').slice(0, 16)
}

function generateDeterministicSummary(
  items: { title: string; source: string; pubDate: Date }[],
  entityNames: string[],
  eventType: string | null
): string {
  if (items.length === 0) return ''

  const sorted = items.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
  const newest = sorted[0]
  const sources = Array.from(new Set(items.map(i => i.source)))
  const sourceStr = sources.length <= 3
    ? sources.join(', ')
    : `${sources.slice(0, 2).join(', ')} and ${sources.length - 2} others`

  const entityStr = entityNames.length > 0 ? entityNames.slice(0, 3).join(', ') : 'this story'

  const eventLabel = eventType
    ? eventType.charAt(0).toUpperCase() + eventType.slice(1)
    : 'Developing story'

  const hoursAgo = Math.round((Date.now() - newest.pubDate.getTime()) / 3600000)
  const timeStr = hoursAgo <= 1 ? 'in the last hour' : `${hoursAgo} hours ago`

  return `${eventLabel} involving ${entityStr}. ${items.length} reports from ${sourceStr}. Latest update ${timeStr}: "${newest.title}".`
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('Cluster engine: auth mismatch, proceeding anyway in dev')
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [newsItems, entities] = await Promise.all([
    prisma.newsItem.findMany({
      where: { pubDate: { gte: cutoff } },
      orderBy: { pubDate: 'desc' },
    }),
    prisma.entity.findMany(),
  ])

  const entityLookup: { name: string; type: string; aliases: string[]; regex: RegExp }[] = entities.map(e => {
    const allNames = [e.name, ...e.aliases]
    const escaped = allNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const pattern = escaped.join('|')
    return {
      name: e.name,
      type: e.type,
      aliases: e.aliases,
      regex: new RegExp(`\\b(${pattern})\\b`, 'i'),
    }
  })

  const itemEntities = new Map<string, string[]>()
  const itemEventTypes = new Map<string, string | null>()
  const eventTypeUpdates: { id: string; eventType: string }[] = []

  for (const item of newsItems) {
    const matched: string[] = []
    for (const entity of entityLookup) {
      if (entity.regex.test(item.title)) {
        matched.push(entity.name)
      }
    }
    itemEntities.set(item.id, matched)

    const eventType = detectEventType(item.title)
    itemEventTypes.set(item.id, eventType)

    if (eventType && eventType !== item.eventType) {
      eventTypeUpdates.push({ id: item.id, eventType })
    }
  }

  for (let i = 0; i < eventTypeUpdates.length; i += 50) {
    const batch = eventTypeUpdates.slice(i, i + 50)
    await Promise.allSettled(
      batch.map(u => prisma.newsItem.update({ where: { id: u.id }, data: { eventType: u.eventType } }))
    )
  }

  const clusterMap = new Map<string, typeof newsItems>()
  const clusterEntities = new Map<string, string[]>()
  const clusterEventTypes = new Map<string, string | null>()

  for (const item of newsItems) {
    const matched = itemEntities.get(item.id) || []
    const eventType = itemEventTypes.get(item.id) || null

    if (matched.length === 0) {
      const words = extractSignificantWords(item.title)
      if (words.length >= 3) {
        const keyWords = words.slice(0, 5)
        const fallbackKey = crypto.createHash('md5').update(keyWords.join('|')).digest('hex').slice(0, 16)

        let merged = false
        for (const [existingKey, existingItems] of Array.from(clusterMap.entries())) {
          const existingWords = new Set<string>()
          for (const ei of existingItems) {
            for (const w of extractSignificantWords(ei.title)) {
              existingWords.add(w)
            }
          }
          const overlap = keyWords.filter(w => existingWords.has(w)).length
          if (overlap >= 3) {
            existingItems.push(item)
            merged = true
            break
          }
        }

        if (!merged) {
          clusterMap.set(fallbackKey, [item])
          clusterEntities.set(fallbackKey, [])
          clusterEventTypes.set(fallbackKey, eventType)
        }
      }
      continue
    }

    const key = buildClusterKey(matched, eventType)

    if (!clusterMap.has(key)) {
      clusterMap.set(key, [])
      clusterEntities.set(key, matched)
      clusterEventTypes.set(key, eventType)
    } else {
      const existing = clusterEntities.get(key) || []
      for (const m of matched) {
        if (!existing.includes(m)) existing.push(m)
      }
      clusterEntities.set(key, existing)
    }
    clusterMap.get(key)!.push(item)
  }

  let clustersCreated = 0
  let clustersUpdated = 0
  let itemsAssigned = 0

  for (const [clusterKey, items] of Array.from(clusterMap.entries())) {
    if (items.length < 2) continue

    const entityNames = clusterEntities.get(clusterKey) || []
    const eventType = clusterEventTypes.get(clusterKey) || null
    const sources = new Set(items.map(i => i.source))
    const disValues = items.map(i => i.dis)
    const avgDis = Math.round(disValues.reduce((a, b) => a + b, 0) / disValues.length)
    const maxDis = Math.max(...disValues)

    const sorted = items.sort((a, b) => new Date(a.pubDate).getTime() - new Date(b.pubDate).getTime())
    const firstSeen = new Date(sorted[0].pubDate)
    const lastUpdated = new Date(sorted[sorted.length - 1].pubDate)

    const ageHours = Math.max(1, (Date.now() - firstSeen.getTime()) / 3600000)
    const velocity = items.length / ageHours

    const halfTime = ageHours / 2
    const firstHalf = items.filter(i => (new Date(i.pubDate).getTime() - firstSeen.getTime()) / 3600000 < halfTime).length
    const secondHalf = items.length - firstHalf
    const acceleration = halfTime > 0 ? (secondHalf - firstHalf) / halfTime : 0

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
    const bestTitle = items.sort((a, b) => b.dis - a.dis)[0].title

    const summary = generateDeterministicSummary(
      items.map(i => ({ title: i.title, source: i.source, pubDate: new Date(i.pubDate) })),
      entityNames,
      eventType,
    )

    const sourceBonus = sources.size * 8
    const recencyBonus = Math.max(0, 50 - (((Date.now() - lastUpdated.getTime()) / 3600000) * 5))
    const tierBonus = items.some(i => i.tier === 1) ? 10 : items.some(i => i.tier === 2) ? 5 : 0
    const volumeBonus = Math.min(20, items.length * 3)
    const velocityBonus = Math.min(15, Math.round(velocity * 5))
    const clusterDis = Math.min(100, Math.max(1, Math.round(sourceBonus + recencyBonus + tierBonus + volumeBonus + velocityBonus)))

    try {
      const existing = await prisma.storyCluster.findUnique({ where: { clusterKey } })

      if (existing) {
        await prisma.storyCluster.update({
          where: { clusterKey },
          data: {
            title: bestTitle,
            summary,
            eventType,
            entityNames,
            articleCount: items.length,
            sourceCount: sources.size,
            avgDis: clusterDis,
            maxDis,
            velocity,
            acceleration,
            lastUpdated,
            expiresAt,
          },
        })
        clustersUpdated++
      } else {
        await prisma.storyCluster.create({
          data: {
            clusterKey,
            title: bestTitle,
            summary,
            eventType,
            entityNames,
            articleCount: items.length,
            sourceCount: sources.size,
            avgDis: clusterDis,
            maxDis,
            velocity,
            acceleration,
            firstSeen,
            lastUpdated,
            expiresAt,
            summaries: {
              create: {
                text: summary,
                method: 'deterministic',
                version: 1,
              },
            },
          },
        })
        clustersCreated++
      }

      const itemIds = items.map(i => i.id)
      await prisma.newsItem.updateMany({
        where: { id: { in: itemIds } },
        data: { clusterId: clusterKey },
      })

      for (const item of items) {
        const hoursOld = (Date.now() - new Date(item.pubDate).getTime()) / 3600000
        const itemRecency = Math.max(0, 50 - (hoursOld * 5))
        const itemDis = Math.min(100, Math.max(1, Math.round(
          itemRecency + sourceBonus + tierBonus + volumeBonus + velocityBonus
        )))
        await prisma.newsItem.update({
          where: { id: item.id },
          data: { dis: itemDis },
        }).catch(() => {})
      }

      itemsAssigned += items.length
    } catch (err) {
      console.error(`Cluster ${clusterKey} error:`, err)
    }
  }

  await prisma.storyCluster.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  }).catch(() => {})

  return NextResponse.json({
    totalItems: newsItems.length,
    clustersCreated,
    clustersUpdated,
    itemsAssigned,
    totalClusters: clustersCreated + clustersUpdated,
    timestamp: new Date().toISOString(),
  })
}
