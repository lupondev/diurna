import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma before importing
vi.mock('@/lib/prisma', () => ({
  prisma: {
    site: {
      findFirst: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

describe('getPrimarySite logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prefers site with domain over site without', async () => {
    const mockFindFirst = vi.mocked(prisma.site.findFirst)
    mockFindFirst.mockResolvedValueOnce({
      id: 'site-with-domain',
      domain: 'example.com',
      organizationId: 'org-1',
    } as any)

    const { getPrimarySite } = await import('@/lib/site-resolver')
    const site = await getPrimarySite('org-1')

    expect(site).toBeTruthy()
    expect(site?.id).toBe('site-with-domain')
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-1',
          deletedAt: null,
          domain: { not: null },
        }),
      })
    )
  })

  it('falls back to any non-deleted site if none has domain', async () => {
    const mockFindFirst = vi.mocked(prisma.site.findFirst)
    // First call (with domain filter) returns null
    mockFindFirst.mockResolvedValueOnce(null)
    // Second call (fallback) returns site without domain
    mockFindFirst.mockResolvedValueOnce({
      id: 'site-no-domain',
      domain: null,
      organizationId: 'org-1',
    } as any)

    const { getPrimarySite } = await import('@/lib/site-resolver')
    const site = await getPrimarySite('org-1')

    expect(site).toBeTruthy()
    expect(site?.id).toBe('site-no-domain')
    expect(mockFindFirst).toHaveBeenCalledTimes(2)
  })

  it('returns null when org has no sites', async () => {
    const mockFindFirst = vi.mocked(prisma.site.findFirst)
    mockFindFirst.mockResolvedValue(null)

    const { getPrimarySite } = await import('@/lib/site-resolver')
    const site = await getPrimarySite('nonexistent-org')

    expect(site).toBeNull()
  })
})
