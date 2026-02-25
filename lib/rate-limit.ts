/**
 * In-memory rate limiter for API routes.
 * Use a single token bucket per identifier (e.g. userId or IP).
 */

const store = new Map<string, { count: number; resetAt: number }>()
const MAX_ENTRIES = 500

export function rateLimit(options: { interval: number; uniqueTokenPerInterval?: number }) {
  const interval = options.interval
  const maxEntries = options.uniqueTokenPerInterval ?? MAX_ENTRIES

  function evict() {
    if (store.size <= maxEntries) return
    const now = Date.now()
    const entries: Array<[string, { count: number; resetAt: number }]> = []
    store.forEach((entry, key) => {
      if (now > entry.resetAt) store.delete(key)
      else entries.push([key, entry])
    })
    if (store.size <= maxEntries) return
    entries.sort((a, b) => a[1].resetAt - b[1].resetAt)
    const remove = store.size - maxEntries
    for (let i = 0; i < remove && i < entries.length; i++) {
      store.delete(entries[i][0])
    }
  }

  return {
    async check(limit: number, token: string): Promise<void> {
      evict()
      const now = Date.now()
      const entry = store.get(token)
      if (!entry || now > entry.resetAt) {
        store.set(token, { count: 1, resetAt: now + interval })
        return
      }
      if (entry.count >= limit) {
        throw new Error('Rate limit exceeded')
      }
      entry.count++
    },
  }
}
