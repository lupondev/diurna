import { describe, it, expect } from 'vitest'
import { rateLimit } from '@/lib/rate-limit'

describe('rateLimit', () => {
  it('allows requests under limit', async () => {
    const limiter = rateLimit({ interval: 60_000 })
    await expect(limiter.check(5, 'test-user-1')).resolves.not.toThrow()
  })

  it('blocks requests over limit', async () => {
    const limiter = rateLimit({ interval: 60_000 })
    // Exhaust limit
    for (let i = 0; i < 2; i++) {
      await limiter.check(2, 'test-user-2')
    }
    await expect(limiter.check(2, 'test-user-2')).rejects.toThrow()
  })

  it('isolates users from each other', async () => {
    const limiter = rateLimit({ interval: 60_000 })
    // User A uses their quota
    await limiter.check(1, 'user-a')
    await expect(limiter.check(1, 'user-a')).rejects.toThrow()
    // User B still has quota
    await expect(limiter.check(1, 'user-b')).resolves.not.toThrow()
  })
})
