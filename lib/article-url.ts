/**
 * Shared utility for building public article URLs.
 * All category routes under (public) must match these slugs.
 *
 * CATEGORY_MAP normalizes English category slugs to Bosnian equivalents
 * so all public URLs use consistent Bosnian paths.
 */

const CATEGORY_MAP: Record<string, string> = {
  vijesti: 'vijesti',
  news: 'vijesti',       // legacy English → Bosnian
  utakmice: 'utakmice',
  matches: 'utakmice',
  transferi: 'transferi',
  transfers: 'transferi',
  povrede: 'povrede',
  injuries: 'povrede',
  video: 'video',
}

/** Map for display names — normalizes English category names to Bosnian */
const DISPLAY_MAP: Record<string, string> = {
  news: 'Vijesti',
  News: 'Vijesti',
  NEWS: 'VIJESTI',
  matches: 'Utakmice',
  transfers: 'Transferi',
  injuries: 'Povrede',
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

/** Normalize category display name — converts English names to Bosnian */
export function normalizeCategoryName(name: string | null | undefined): string {
  if (!name) return 'Vijesti'
  return DISPLAY_MAP[name] || name
}
