import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { systemLog } from '@/lib/system-log'

export const dynamic = 'force-dynamic'

// ── Auth helper ───────────────────────────────────────────────────────────────
function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // not configured → allow (dev mode)

  // Method 1: Bearer header (Vercel cron)
  const authHeader = req.headers.get('authorization')
  if (authHeader === `Bearer ${secret}`) return true

  // Method 2: x-cron-secret header (QStash via Upstash-Forward-x-cron-secret)
  const cronHeader = req.headers.get('x-cron-secret')
  if (cronHeader === secret) return true

  // Method 3: ?secret= query param (fallback / manual trigger)
  try {
    const url = new URL(req.url)
    const secretParam = url.searchParams.get('secret')
    if (secretParam && secretParam === secret) return true
  } catch {}

  return false
}

const EVENT_TYPE_KEYWORDS: Record<string, string[]> = {
  TRANSFER: ['transfer', 'sign', 'signing', 'deal', 'bid', 'loan', 'fee', 'move', 'target', 'interested', 'approach', 'offer', 'swap', 'departure', 'arrival', 'replacement'],
  INJURY: ['injury', 'injured', 'out', 'ruled out', 'doubtful', 'hamstring', 'knee', 'ankle', 'setback', 'surgery', 'recovery', 'return date', 'sidelined', 'fitness'],
  MATCH_PREVIEW: ['preview', 'lineup', 'predicted', 'team news', 'ahead of', 'prepare', 'face', 'clash', 'fixture', 'key facts'],
  MATCH_RESULT: ['beat', 'defeat', 'draw', 'win', 'loss', 'score', 'result', 'victory', 'thriller', 'comeback', 'rout'],
  POST_MATCH_REACTION: ['praises', 'slams', 'reaction', 'responds', 'says after', 'post-match', 'pleased', 'disappointed', 'furious'],
  TACTICAL: ['tactics', 'formation', 'analysis', 'system', 'shape', 'pressing', 'counter-attack'],
  CONTRACT: ['contract', 'extension', 'renewal', 'clause', 'release clause', 'wages', 'salary', 'new deal', 'agrees terms'],
  MANAGERIAL: ['sacked', 'fired', 'appointed', 'hire', 'manager', 'coach', 'interim', 'replaced', 'steps down', 'resignation'],
  RECORD: ['record', 'milestone', 'first', 'most', 'all-time', 'historic', 'youngest', 'oldest', 'fastest', 'breaks record'],
  DISCIPLINE: ['ban', 'suspend', 'red card', 'fine', 'misconduct', 'violent conduct', 'elbow', 'stamp', 'controversy'],
  SCANDAL: ['scandal', 'investigation', 'probe', 'corruption', 'allegations', 'accused', 'cheat', 'match-fixing'],
}

const AMBIGUOUS_ALIASES: Record<string, string[]> = {
  'United': ['Manchester United', 'Newcastle United', 'Leeds United', 'West Ham United'],
  'City': ['Manchester City', 'Leicester City', 'Bristol City'],
  'Real': ['Real Madrid', 'Real Sociedad', 'Real Betis'],
  'Milan': ['AC Milan', 'Inter Milan'],
  'Sporting': ['Sporting CP', 'Sporting Kansas City'],
  'Athletic': ['Athletic Bilbao', 'Atletico Madrid'],
  'Inter': ['Inter Milan', 'Inter Miami'],
  'Palace': ['Crystal Palace'],
  'Forest': ['Nottingham Forest'],
  'Villa': ['Aston Villa'],
}

const SAFE_SHORT_ALIASES = new Set(['PSG', 'UCL', 'MLS', 'FIFA', 'UEFA', 'EPL', 'VAR', 'CL', 'EFL', 'BVB', 'CR7', 'KDB', 'VVD', 'TAA', 'FFP', 'RKM'])

interface MatchedEntity {
  name: string
  type: string
  matchedAlias: string
  position: number
  metadata: Record<string, unknown>
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function matchEntities(title: string, entities: { name: string; type: string; aliases: string[]; metadata: unknown }[]): MatchedEntity[] {
  const matched: MatchedEntity[] = []
  const titleLower = title.toLowerCase()

  for (const entity of entities) {
    const aliases = [entity.name, ...(entity.aliases || [])]
    let found = false

    for (const alias of aliases) {
      if (found) break
      const aliasLower = alias.toLowerCase()

      if (alias.length < 4 && !SAFE_SHORT_ALIASES.has(alias)) continue

      if (AMBIGUOUS_ALIASES[alias]) {
        const specificMatch = AMBIGUOUS_ALIASES[alias].some(specific =>
          titleLower.includes(specific.toLowerCase())
        )
        if (!specificMatch) continue
      }

      const regex = new RegExp(`\\b${escapeRegex(aliasLower)}\\b`, 'i')
      if (regex.test(title)) {
        matched.push({
          name: entity.name,
          type: entity.type,
          matchedAlias: alias,
          position: titleLower.indexOf(aliasLower),
          metadata: (entity.metadata as Record<string, unknown>) || {},
        })
        found = true
      }
    }
  }

  matched.sort((a, b) => a.position - b.position)
  return matched
}

function detectEventType(title: string): string {
  const titleLower = title.toLowerCase()
  for (const [eventType, keywords] of Object.entries(EVENT_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (titleLower.includes(keyword)) {
        return eventType
      }
    }
  }
  return 'BREAKING'
}

function getPrimaryEntity(matchedEntities: MatchedEntity[], eventType: string): { key: string; name: string; type: string } {
  if (matchedEntities.length === 0) {
    return { key: 'orphan', name: 'Unknown', type: 'UNKNOWN' }
  }

  if (['MATCH_PREVIEW', 'MATCH_RESULT', 'POST_MATCH_REACTION'].includes(eventType)) {
    const clubs = matchedEntities.filter(e => e.type === 'CLUB')
    if (clubs.length >= 2) {
      const sorted = [clubs[0].name, clubs[1].name].sort()
      const key = sorted.map(n => n.toLowerCase().replace(/\s+/g, '-')).join('-vs-')
      return { key, name: `${clubs[0].name} vs ${clubs[1].name}`, type: 'MATCH' }
    }
  }

  const priority = ['PLAYER', 'MANAGER', 'CLUB', 'COMPETITION', 'LEAGUE', 'VENUE', 'REFEREE', 'JOURNALIST', 'AGENT']
  for (const type of priority) {
    const match = matchedEntities.find(e => e.type === type)
    if (match) {
      return { key: match.name.toLowerCase().replace(/\s+/g, '-'), name: match.name, type: match.type }
    }
  }

  const first = matchedEntities[0]
  return { key: first.name.toLowerCase().replace(/\s+/g, '-'), name: first.name, type: first.type }
}

function buildClusterKey(primaryKey: string, eventType: string, date: Date): string {
  const day = date.toISOString().split('T')[0]
  return `${primaryKey}|${eventType.toLowerCase()}|${day}`
}

function calculateDIS(cluster: {
  tier1Count: number
  tier2Count: number
  tier3Count: number
  velocity30m: number
  velocityPrev30m: number
  consistency: number
  firstSeen: Date
}): { dis: number; acceleration: number; trend: string } {
  const weighted = (cluster.tier1Count * 3.0) + (cluster.tier2Count * 1.8) + (cluster.tier3Count * 1.0)
  const sourceComponent = Math.min(50, Math.log(weighted + 1) * 20)

  const acceleration = cluster.velocity30m / Math.max(1, cluster.velocityPrev30m)
  const velocityComponent = Math.min(30, Math.log(acceleration + 1) * 18)

  const consistencyComponent = (cluster.consistency || 1.0) * 10

  const tier1Bonus = Math.min(10, cluster.tier1Count * 3)

  let rawDis = sourceComponent + velocityComponent + consistencyComponent + tier1Bonus

  if (cluster.tier1Count === 0) {
    rawDis *= 0.75
  }

  const hoursOld = (Date.now() - new Date(cluster.firstSeen).getTime()) / 3600000
  const timeFactor = Math.exp(-hoursOld / 18)

  const finalDis = Math.round(Math.min(100, Math.max(1, rawDis * timeFactor)))

  let trend: string
  if (timeFactor < 0.3) trend = 'FADING'
  else if (acceleration > 2.0) trend = 'SPIKING'
  else if (acceleration > 1.0) trend = 'RISING'
  else trend = 'STABLE'

  return { dis: finalDis, acceleration, trend }
}

function generateDeterministicSummary(
  clusterItems: { title: string; source: string; tier: number }[],
  tier1Count: number,
  tier2Count: number,
  tier3Count: number,
) {
  const claims = clusterItems.map(item => ({
    claim: item.title.replace(/\s*[-–—]\s*[^-–—]+$/, '').trim(),
    sources: [item.source],
    tier: item.tier,
  }))

  const merged: typeof claims = []
  for (const claim of claims) {
    const existing = merged.find(m => {
      const claimWords = claim.claim.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3)
      const existWords = m.claim.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3)
      const overlap = claimWords.filter((w: string) => existWords.includes(w)).length
      return overlap / Math.max(1, Math.min(claimWords.length, existWords.length)) > 0.6
    })
    if (existing) {
      if (!existing.sources.includes(claim.sources[0])) {
        existing.sources.push(claim.sources[0])
      }
      if (claim.tier < existing.tier) existing.tier = claim.tier
    } else {
      merged.push({ ...claim })
    }
  }

  merged.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier
    return b.sources.length - a.sources.length
  })

  const topClaims = merged.slice(0, 5)

  const conflicts: { topic: string; versions: string[] }[] = []
  const moneyPattern = /[€£$]\s*(\d+(?:\.\d+)?)\s*m/gi
  const claimsWithMoney = topClaims
    .map(c => ({ ...c, money: Array.from(c.claim.matchAll(moneyPattern)).map(m => m[0]) }))
    .filter(c => c.money.length > 0)

  if (claimsWithMoney.length >= 2) {
    const amounts = claimsWithMoney.map(c => c.money[0])
    const unique = Array.from(new Set(amounts))
    if (unique.length > 1) {
      conflicts.push({
        topic: 'transfer fee',
        versions: claimsWithMoney.map(c => `${c.money[0]} (${c.sources[0]})`),
      })
    }
  }

  const positiveWords = ['agreed', 'confirmed', 'accepted', 'done deal', 'completed', 'set for']
  const negativeWords = ['rejected', 'denied', 'refused', 'collapsed', 'off', 'collapses', 'denies']
  const hasPositive = topClaims.some(c => positiveWords.some(w => c.claim.toLowerCase().includes(w)))
  const hasNegative = topClaims.some(c => negativeWords.some(w => c.claim.toLowerCase().includes(w)))

  if (hasPositive && hasNegative) {
    const posSources = topClaims
      .filter(c => positiveWords.some(w => c.claim.toLowerCase().includes(w)))
      .flatMap(c => c.sources)
    const negSources = topClaims
      .filter(c => negativeWords.some(w => c.claim.toLowerCase().includes(w)))
      .flatMap(c => c.sources)
    conflicts.push({
      topic: 'deal status',
      versions: [`Confirmed (${posSources.join(', ')})`, `Denied/Collapsed (${negSources.join(', ')})`],
    })
  }

  const mostCommonCount = Math.max(...topClaims.map(c => c.sources.length), 1)
  const totalSources = new Set(clusterItems.map(i => i.source)).size
  const consistency = mostCommonCount / Math.max(1, totalSources)

  let text = topClaims
    .slice(0, 3)
    .map(c => `${c.sources[0]} reports: ${c.claim}`)
    .join('. ')

  if (conflicts.length > 0) {
    text += `. Note: reports differ on ${conflicts[0].topic} — ${conflicts[0].versions.join(' vs ')}.`
  }

  const signalIntegrity = {
    tier1_count: tier1Count,
    tier2_count: tier2Count,
    tier3_count: tier3Count,
    conflicts: conflicts.length > 0,
    consistency: Math.round(consistency * 100) / 100,
    confidence: consistency > 0.8 ? 'HIGH' : consistency > 0.5 ? 'MEDIUM' : 'LOW',
  }

  return {
    mainClaims: topClaims.map(c => ({ claim: c.claim, sources: c.sources, tier: c.tier })),
    conflictingReports: conflicts.length > 0 ? conflicts : null,
    signalIntegrity,
    summaryText: text,
    confidence: signalIntegrity.confidence,
    consistency,
  }
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()

  try {
    const entities = await prisma.entity.findMany()

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const newsItems = await prisma.newsItem.findMany({
      where: { pubDate: { gte: since } },
      orderBy: { pubDate: 'desc' },
    })

    if (newsItems.length === 0) {
      return NextResponse.json({ message: 'No items to cluster', clusters: 0 })
    }

    const processedItems = newsItems.map(item => {
      const matchedEntities = matchEntities(item.title, entities)
      const eventType = detectEventType(item.title)
      const primary = getPrimaryEntity(matchedEntities, eventType)
      const clusterKey = buildClusterKey(primary.key, eventType, item.pubDate)

      return {
        ...item,
        matchedEntities,
        eventType,
        primaryEntity: primary,
        clusterKey,
      }
    })

    const clusterMap = new Map<string, typeof processedItems>()
    for (const item of processedItems) {
      const existing = clusterMap.get(item.clusterKey) || []
      existing.push(item)
      clusterMap.set(item.clusterKey, existing)
    }

    let clustersCreated = 0
    let clustersUpdated = 0
    let summariesCreated = 0
    let errors = 0

    for (const [clusterKey, items] of Array.from(clusterMap.entries())) {
      try {
        const primary = items[0].primaryEntity
        const allEntities = Array.from(new Set(items.flatMap(i => i.matchedEntities.map(e => e.name))))
        const uniqueSources = Array.from(new Set(items.map(i => i.source)))

        const tier1Count = items.filter(i => i.tier === 1).length
        const tier2Count = items.filter(i => i.tier === 2).length
        const tier3Count = items.filter(i => i.tier === 3).length

        const now = Date.now()
        const velocity30m = items.filter(i => (now - new Date(i.pubDate).getTime()) < 30 * 60 * 1000).length
        const velocityPrev30m = items.filter(i => {
          const age = now - new Date(i.pubDate).getTime()
          return age >= 30 * 60 * 1000 && age < 60 * 60 * 1000
        }).length

        const firstSeen = new Date(Math.min(...items.map(i => new Date(i.pubDate).getTime())))
        const latestItem = new Date(Math.max(...items.map(i => new Date(i.pubDate).getTime())))

        const bestItem = items.sort((a, b) => a.tier - b.tier)[0]
        const title = bestItem.title.replace(/\s*[-–—]\s*[^-–—]+$/, '').trim()

        const summary = generateDeterministicSummary(items, tier1Count, tier2Count, tier3Count)

        const { dis, acceleration, trend } = calculateDIS({
          tier1Count,
          tier2Count,
          tier3Count,
          velocity30m,
          velocityPrev30m,
          consistency: summary.consistency,
          firstSeen,
        })

        const existingCluster = await prisma.storyCluster.findUnique({ where: { key: clusterKey } })

        const clusterData = {
          title,
          eventType: items[0].eventType,
          primaryEntity: primary.name,
          primaryEntityType: primary.type,
          entities: allEntities,
          sourceCount: uniqueSources.length,
          tier1Count,
          tier2Count,
          tier3Count,
          hasConflicts: (summary.conflictingReports || []).length > 0,
          velocity30m,
          velocityPrev30m,
          acceleration,
          trend,
          consistency: summary.consistency,
          dis,
          peakDis: existingCluster ? Math.max(existingCluster.peakDis, dis) : dis,
          peakAt: (!existingCluster || dis > (existingCluster?.peakDis || 0)) ? new Date() : existingCluster?.peakAt,
          firstSeen,
          latestItem,
          newsItems: items.map(i => i.id),
        }

        const cluster = await prisma.storyCluster.upsert({
          where: { key: clusterKey },
          update: clusterData,
          create: { key: clusterKey, ...clusterData },
        })

        if (existingCluster) clustersUpdated++
        else clustersCreated++

        const conflictsValue = summary.conflictingReports
          ? (summary.conflictingReports as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull

        await prisma.clusterSummary.upsert({
          where: { clusterId: cluster.id },
          update: {
            mainClaims: summary.mainClaims as unknown as Prisma.InputJsonValue,
            conflictingReports: conflictsValue,
            signalIntegrity: summary.signalIntegrity as unknown as Prisma.InputJsonValue,
            summaryText: summary.summaryText,
            confidence: summary.confidence,
            generatedAt: new Date(),
          },
          create: {
            clusterId: cluster.id,
            mainClaims: summary.mainClaims as unknown as Prisma.InputJsonValue,
            conflictingReports: conflictsValue,
            signalIntegrity: summary.signalIntegrity as unknown as Prisma.InputJsonValue,
            summaryText: summary.summaryText,
            confidence: summary.confidence,
          },
        })
        summariesCreated++

        await prisma.newsItem.updateMany({
          where: { id: { in: items.map(i => i.id) } },
          data: {
            clusterId: cluster.id,
            eventType: items[0].eventType,
          },
        })
      } catch (e) {
        console.error(`[Cluster Engine] Error processing cluster ${clusterKey}:`, e)
        errors++
      }
    }

    // Breaking news webhook
    let breakingTriggered = 0
    if (process.env.CRON_SECRET) {
      const breakingClusters = await prisma.storyCluster.findMany({
        where: {
          dis: { gte: 70 },
          latestItem: { gte: new Date(Date.now() - 10 * 60 * 1000) },
        },
      })

      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)

      for (const bc of breakingClusters) {
        const alreadyCovered = await prisma.article.findFirst({
          where: {
            aiPrompt: { contains: bc.id },
            createdAt: { gte: startOfDay },
          },
        })
        if (alreadyCovered) continue

        const baseUrl = process.env.NEXTAUTH_URL || 'https://diurna.vercel.app'
        fetch(`${baseUrl}/api/webhooks/breaking-news`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          },
          body: JSON.stringify({ clusterId: bc.id, title: bc.title, dis: bc.dis }),
        }).catch(err => {
          console.error('[Cluster Engine] Breaking webhook failed:', err)
          systemLog('error', 'webhook', `Breaking webhook call failed: ${err instanceof Error ? err.message : 'Unknown'}`, { clusterId: bc.id, dis: bc.dis }).catch(() => {})
        })

        systemLog('info', 'webhook', `Breaking news triggered: ${bc.title}`, { clusterId: bc.id, dis: bc.dis, title: bc.title }).catch(() => {})
        breakingTriggered++
      }
    }

    const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000)
    const deleted = await prisma.storyCluster.deleteMany({
      where: { latestItem: { lt: staleDate } },
    })

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      items: newsItems.length,
      clusters: clusterMap.size,
      created: clustersCreated,
      updated: clustersUpdated,
      summaries: summariesCreated,
      errors,
      staleDeleted: deleted.count,
      entityCount: entities.length,
      breakingTriggered,
    })
  } catch (e) {
    console.error('[Cluster Engine] Fatal error:', e)
    return NextResponse.json({ error: 'Cluster engine failed', detail: String(e) }, { status: 500 })
  }
}
