import { describe, it, expect } from 'vitest'
import { rateLimit } from '@/lib/rate-limit'

describe('rateLimit', () => {
  it('allows requests under limit', async () => {
    const limiter = rateLimit({ interval: 60_000 })
    await expect(limiter.check(5, 'test-user')).resolves.not.toThrow()
  })
})
