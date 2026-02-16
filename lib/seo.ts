// ═══ SEO ENGINE ═══

export function generateMetaTitle(articleTitle: string, siteName: string): string {
  const maxLen = 60
  const suffix = ` | ${siteName}`
  if (articleTitle.length + suffix.length <= maxLen) return articleTitle + suffix
  return articleTitle.slice(0, maxLen - suffix.length - 1).trim() + '…' + suffix
}

export function generateMetaDescription(content: string): string {
  const plain = content
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (plain.length <= 155) return plain
  return plain.slice(0, 152).trim() + '...'
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

export function generateKeywords(title: string, content: string, category?: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
    'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
    'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and',
    'or', 'if', 'while', 'about', 'up', 'its', 'it', 'he', 'she', 'they',
    'this', 'that', 'these', 'those', 'his', 'her', 'their', 'what', 'which',
  ])

  const plain = (title + ' ' + content).replace(/<[^>]+>/g, '').toLowerCase()
  const words = plain.match(/\b[a-z]{3,}\b/g) || []
  const freq: Record<string, number> = {}
  for (const w of words) {
    if (!stopWords.has(w)) freq[w] = (freq[w] || 0) + 1
  }

  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)

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
    const count = (plain.match(regex) || []).length
    result[kw] = Math.round((count / totalWords) * 10000) / 100
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
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  }
}

export function generateNewsArticleSchema(article: {
  title: string
  description: string
  url: string
  imageUrl?: string
  authorName: string
  publishedAt: string
  modifiedAt?: string
  siteName: string
  category?: string
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.description,
    url: article.url,
    image: article.imageUrl || undefined,
    datePublished: article.publishedAt,
    dateModified: article.modifiedAt || article.publishedAt,
    author: {
      '@type': 'Person',
      name: article.authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: article.siteName,
      logo: { '@type': 'ImageObject', url: `${article.url.split('/').slice(0, 3).join('/')}/favicon.ico` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': article.url },
    ...(article.category ? { articleSection: article.category } : {}),
  }
}

export function generateSportEventSchema(match: {
  homeTeam: string
  awayTeam: string
  league: string
  date: string
  venue?: string
  status?: string
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${match.homeTeam} vs ${match.awayTeam}`,
    description: `${match.league}: ${match.homeTeam} vs ${match.awayTeam}`,
    startDate: match.date,
    location: match.venue
      ? { '@type': 'Place', name: match.venue }
      : undefined,
    homeTeam: { '@type': 'SportsTeam', name: match.homeTeam },
    awayTeam: { '@type': 'SportsTeam', name: match.awayTeam },
    eventStatus: match.status === 'live'
      ? 'https://schema.org/EventMovedOnline'
      : 'https://schema.org/EventScheduled',
  }
}
