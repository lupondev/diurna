import { describe, it, expect } from 'vitest'
import { getArticleUrl } from '@/lib/article-url'

describe('getArticlePath', () => {
  it('generates correct path with category and slug', () => {
    const path = getArticleUrl({ category: { slug: 'vijesti' }, slug: 'test-article' } as any)
    expect(path).toContain('vijesti')
    expect(path).toContain('test-article')
  })

  it('handles missing category gracefully', () => {
    const path = getArticleUrl({ category: null, slug: 'test-article' } as any)
    expect(path).toBeTruthy()
    expect(path).toContain('test-article')
  })
})
