import type { Metadata } from 'next'

// ── Canonical URL utilities ───────────────────────────────────────────────────

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://todayfootballmatch.com').replace(/\/$/, '')
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'TodayFootballMatch'
const TWITTER_HANDLE = process.env.NEXT_PUBLIC_TWITTER_HANDLE || '@todayfootballmatch'
const DEFAULT_OG_IMAGE = '/og-default.jpg'

/**
 * Normalizes a path: strips query/hash, collapses slashes, lowercase,
 * removes trailing slash (except root), resolves .. segments.
 * Idempotent: normalizePath(normalizePath(x)) === normalizePath(x)
 */
export function normalizePath(rawPath: string): string {
  if (!rawPath || typeof rawPath !== 'string') return '/'
  let path = rawPath
  const h = path.indexOf('#'); if (h !== -1) path = path.slice(0, h)
  const q = path.indexOf('?'); if (q !== -1) path = path.slice(0, q)
  path = path.normalize('NFC')
  if (!path.startsWith('/')) path = `/${path}`
  path = path.replace(/\\/g, '/')
  try {
    path = path.replace(/%2F/gi, '/').replace(/%5C/gi, '/')
    path = decodeURIComponent(path)
    // eslint-disable-next-line no-control-regex
    path = path.replace(/[\u0000-\u001F\u007F]/g, '')
  } catch { /* keep as-is if malformed */ }
  path = path.replace(/\/+/g, '/')
  // resolve .. segments
  const parts = path.split('/')
  const stack: string[] = []
  for (const p of parts) {
    if (!p || p === '.') continue
    if (p === '..') { if (stack.length) stack.pop(); continue }
    stack.push(p)
  }
  path = '/' + stack.join('/')
  path = path.toLowerCase()
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
  return path
}

/** Returns absolute canonical URL for a path. */
export function canonicalUrl(rawPath: string): string {
  return `${SITE_URL}${normalizePath(rawPath)}`
}

/** Returns absolute URL for a relative path or passes through absolute URLs. */
export function toAbsUrl(pathOrUrl?: string | null): string | undefined {
  if (!pathOrUrl) return undefined
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl
  return `${SITE_URL}${normalizePath(pathOrUrl)}`
}

// ── Core metadata builder ─────────────────────────────────────────────────────

export interface MetaInput {
  /** Page-specific title WITHOUT site name suffix. Builder appends "| SiteName". */
  pageTitle: string
  /** 120–160 chars ideal. */
  description: string
  /** Path only — no query string, no domain. Builder strips query anyway. */
  canonicalPath: string
  ogImage?: string | null
  ogType?: 'website' | 'article'
  noIndex?: boolean
  publishedTime?: string
  modifiedTime?: string
  section?: string
}

/**
 * Single source of truth for all page metadata.
 *
 * TITLE STRATEGY: uses { absolute } to bypass root layout template ("%s | SiteName").
 * Without this, every page would get double suffix:
 *   buildMetadata returns "Arsenal vs Chelsea | TodayFootballMatch"
 *   template appends "| TodayFootballMatch"
 *   result: "Arsenal vs Chelsea | TodayFootballMatch | TodayFootballMatch" ❌
 *
 * Using { absolute } bypasses the template entirely:
 *   result: "Arsenal vs Chelsea | TodayFootballMatch" ✓
 *
 * Guarantees: entity-specific title, canonical on every page,
 * og:site_name = SITE_NAME (NEVER platform branding),
 * absolute canonical + og:image URLs.
 */
export function buildMetadata(input: MetaInput): Metadata {
  const canonical = canonicalUrl(input.canonicalPath)
  const fullTitle = `${input.pageTitle} | ${SITE_NAME}`
  const ogImage = toAbsUrl(input.ogImage) ?? toAbsUrl(DEFAULT_OG_IMAGE)!

  const meta: Metadata = {
    // { absolute } bypasses the root layout title template — prevents double suffix
    title: { absolute: fullTitle },
    description: input.description,
    alternates: { canonical },
    openGraph: {
      title: fullTitle,
      description: input.description,
      url: canonical,
      siteName: SITE_NAME,
      type: input.ogType ?? 'website',
      locale: 'bs_BA',
      images: [{ url: ogImage, width: 1200, height: 630 }],
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
      ...(input.section ? { section: input.section } : {}),
    } as Metadata['openGraph'],
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: input.description,
      images: [ogImage],
      site: TWITTER_HANDLE,
    },
  }

  if (input.noIndex) meta.robots = { index: false, follow: false }
  return meta
}

// ── Legacy helpers (kept for backwards compat) ────────────────────────────────

export function generateMetaTitle(articleTitle: string, siteName: string): string {
  const maxLen = 60
  const suffix = ` | ${siteName}`
  if (articleTitle.length + suffix.length <= maxLen) return articleTitle + suffix
  return articleTitle.slice(0, maxLen - suffix.length - 1).trim() + '\u2026' + suffix
}

export function generateMetaDescription(content: string): string {
  const plain = content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  if (plain.length <= 155) return plain
  return plain.slice(0, 152).trim() + '...'
}

export function generateSlug(title: string): string {
  return title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
    .replace(/^-|-$/g, '').slice(0, 80)
}

export function generateKeywords(title: string, content: string, category?: string): string[] {
  const stopWords = new Set([
    'the','a','an','is','are','was','were','be','been','being','have','has','had',
    'do','does','did','will','would','could','should','may','might','shall','can',
    'to','of','in','for','on','with','at','by','from','as','into','through',
    'during','before','after','above','below','between','out','off','over','under',
    'again','further','then','once','here','there','when','where','why','how',
    'all','each','every','both','few','more','most','other','some','such','no',
    'nor','not','only','own','same','so','than','too','very','just','because',
    'but','and','or','if','while','about','up','its','it','he','she','they',
    'this','that','these','those','his','her','their','what','which',
  ])
  const plain = (title + ' ' + content).replace(/<[^>]+>/g, '').toLowerCase()
  const words = plain.match(/\b[a-z]{3,}\b/g) || []
  const freq: Record<string, number> = {}
  for (const w of words) { if (!stopWords.has(w)) freq[w] = (freq[w] || 0) + 1 }
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([w]) => w)
  const keywords = category ? [category.toLowerCase(), ...sorted] : sorted
  return Array.from(new Set(keywords)).slice(0, 10)
}

export function calculateKeywordDensity(content: string, keywords: string[]): Record<string, number> {
  const plain = content.replace(/<[^>]+>/g, '').toLowerCase()
  const totalWords = (plain.match(/\b\w+\b/g) || []).length
  if (totalWords === 0) return {}
  const result: Record<string, number> = {}
  for (const kw of keywords) {
    const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    result[kw] = Math.round(((plain.match(regex) || []).length / totalWords) * 10000) / 100
  }
  return result
}

export function generateFAQSchema(questions: { q: string; a: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  }
}

export function generateNewsArticleSchema(article: {
  title: string; description: string; url: string; imageUrl?: string;
  authorName: string; publishedAt: string; modifiedAt?: string;
  siteName: string; category?: string; logoUrl?: string;
}): object {
  const siteOrigin = article.url.split('/').slice(0, 3).join('/')
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.description,
    url: article.url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': article.url },
    image: article.imageUrl || undefined,
    datePublished: article.publishedAt,
    dateModified: article.modifiedAt || article.publishedAt,
    author: { '@type': 'Organization', name: article.siteName },
    publisher: {
      '@type': 'Organization',
      name: article.siteName,
      logo: {
        '@type': 'ImageObject',
        url: article.logoUrl || `${siteOrigin}/logo.png`,
      },
    },
    ...(article.category ? { articleSection: article.category } : {}),
    inLanguage: 'bs',
  }
}

/**
 * Generate SportsEvent JSON-LD schema.
 * Per schema.org spec, eventStatus only describes abnormal situations.
 * All normal matches (scheduled, live, finished) use EventScheduled.
 */
export function generateSportEventSchema(match: {
  homeTeam: string; awayTeam: string; league: string;
  date: string; venue?: string; status?: string;
  url?: string;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${match.homeTeam} vs ${match.awayTeam}`,
    description: `${match.league}: ${match.homeTeam} vs ${match.awayTeam}`,
    startDate: match.date,
    url: match.url,
    location: match.venue ? { '@type': 'Place', name: match.venue } : undefined,
    homeTeam: { '@type': 'SportsTeam', name: match.homeTeam },
    awayTeam: { '@type': 'SportsTeam', name: match.awayTeam },
    // All normal match states use EventScheduled — only cancelled/postponed differ
    eventStatus: 'https://schema.org/EventScheduled',
  }
}
