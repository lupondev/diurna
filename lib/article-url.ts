/**
 * Shared utility for building public article URLs.
 * All category routes under (public) must match these slugs.
 */

const CATEGORY_MAP: Record<string, string> = {
  vijesti: 'vijesti',
  news: 'news',
  utakmice: 'utakmice',
  matches: 'utakmice',
  transferi: 'transferi',
  transfers: 'transferi',
  povrede: 'povrede',
  injuries: 'povrede',
  video: 'video',
}

export function getArticleUrl(article: {
  slug: string
  category?: { slug?: string | null; name?: string | null } | null
  categorySlug?: string | null
}): string {
  const raw = article.categorySlug || article.category?.slug || ''
  const cat = CATEGORY_MAP[raw.toLowerCase()] || raw.toLowerCase() || 'vijesti'
  return `/${cat}/${article.slug}`
}
