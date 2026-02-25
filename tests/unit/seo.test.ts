import { describe, it, expect } from 'vitest'
import { buildMetadata } from '@/lib/seo'

describe('buildMetadata', () => {
  it('returns title and description', () => {
    const meta = buildMetadata({
      pageTitle: 'Test',
      description: 'Desc',
      canonicalPath: '/test',
    })
    expect(meta.title && typeof meta.title === 'object' && 'absolute' in meta.title
      ? (meta.title as { absolute?: string }).absolute
      : meta.title).toContain('Test')
    expect(meta.description).toBe('Desc')
  })
  it('has og image fallback', () => {
    const meta = buildMetadata({
      pageTitle: 'Test',
      description: 'Desc',
      canonicalPath: '/test',
    })
    expect(meta.openGraph?.images).toBeDefined()
  })
})
