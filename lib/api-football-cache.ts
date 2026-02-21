import { prisma } from '@/lib/prisma'
import { systemLog } from '@/lib/system-log'

/**
 * DB-backed API-Football cache with TTL support.
 * All API-Football calls should go through cachedFetch().
 */

// Cache TTLs in seconds
export const CACHE_TTL = {
  LIVE: 60,           // 1 minute — live matches
  FIXTURES_TODAY: 300, // 5 minutes — today's fixtures
  FIXTURES_FUTURE: 3600, // 1 hour — tomorrow/week fixtures
  STANDINGS: 3600,    // 1 hour — standings
  PLAYER: 21600,      // 6 hours — player stats
  DEFAULT: 300,       // 5 minutes
} as const

export async function cachedFetch<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
): Promise<{ data: T; fromCache: boolean }> {
  // Check cache
  try {
    const cached = await prisma.apiCache.findUnique({ where: { key: cacheKey } })
    if (cached && new Date(cached.expiresAt) > new Date()) {
      return { data: cached.data as T, fromCache: true }
    }
  } catch (e) {
    // Cache read failed, proceed to fetch
    console.warn('[ApiCache] Read error:', e instanceof Error ? e.message : e)
  }

  // Fetch fresh data
  const data = await fetcher()

  // Write to cache (fire-and-forget)
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000)
  prisma.apiCache.upsert({
    where: { key: cacheKey },
    update: { data: data as never, expiresAt },
    create: { key: cacheKey, data: data as never, expiresAt },
  }).catch((e) => {
    console.warn('[ApiCache] Write error:', e instanceof Error ? e.message : e)
  })

  // Log the API call for stats
  systemLog('info', 'api-football', `API call: ${cacheKey}`, { cacheKey }).catch(() => {})

  return { data, fromCache: false }
}

export async function cleanExpiredCache(): Promise<number> {
  const result = await prisma.apiCache.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  return result.count
}
