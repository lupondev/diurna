import { prisma } from '@/lib/prisma'
import { systemLog } from '@/lib/system-log'

// ══════════════════════════════════
// TYPES
// ══════════════════════════════════

type AutopilotConfigFull = {
  id: string
  orgId: string
  dailyTarget: number
  defaultLength: number
  scheduleStart: string
  scheduleEnd: string
  is24h: boolean
  autoPublish: boolean
  matchAutoCoverage: boolean
  liveArticles: boolean
  breakingNews: boolean
  breakingThreshold: number
  gapDetection: boolean
  gapHours: number
  contentStyle: string
  translateLang: string
  alwaysCreditSources: boolean
  linkOriginal: boolean
  addSourceTag: boolean
  tone: string
  isActive: boolean
  categories: {
    name: string
    slug: string
    percentage: number
    widgetPoll: boolean
    widgetQuiz: boolean
    widgetStats: boolean
    widgetPlayer: boolean
    widgetVideo: boolean
    widgetGallery: boolean
  }[]
  leagues: { name: string; apiFootballId: number | null; weight: number; isActive: boolean }[]
  topics: { name: string; keywords: string[]; isActive: boolean }[]
}

export type ArticlePriority =
  | 'breaking'
  | 'match_preview'
  | 'topic_triggered'
  | 'category_fill'
  | 'gap_fill'
  | 'post_match'
  | 'fallback'
  | 'force_fallback'

export type GenerationTask = {
  priority: ArticlePriority
  title: string
  category: string
  categorySlug: string
  sources: { title: string; source: string; content?: string }[]
  clusterId?: string
  matchId?: string
  wordCount: number
}

// ══════════════════════════════════
// FOOTBALL CONTENT FILTER
// ══════════════════════════════════

const FOOTBALL_ENTITY_TYPES = ['PLAYER', 'CLUB', 'MANAGER', 'MATCH', 'LEAGUE', 'ORGANIZATION']

// ══════════════════════════════════
// SCHEDULE HELPERS
// ══════════════════════════════════

export function shouldGenerateNow(config: {
  scheduleStart: string
  scheduleEnd: string
  is24h: boolean
}): boolean {
  if (config.is24h) return true

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const [startH, startM] = config.scheduleStart.split(':').map(Number)
  const [endH, endM] = config.scheduleEnd.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  if (endMinutes <= startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes
  }

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes
}

export function getArticlesNeeded(dailyTarget: number, todayCount: number): number {
  return Math.max(0, dailyTarget - todayCount)
}

// ══════════════════════════════════
// CATEGORY-SPECIFIC PROMPTS
// ══════════════════════════════════

export const CATEGORY_PROMPTS: Record<string, string> = {
  'aktuelno': 'This is BREAKING/AKTUELNO news. Write with urgency. Lead with the most important fact. Use short paragraphs. Include who/what/when/where in the first paragraph.',
  'bih': 'This is a Bosnia and Herzegovina domestic news story. Provide local context. Reference relevant institutions (Vijeće ministara, entitetske vlade, OHR) when applicable.',
  'crna-hronika': 'This is a CRIME/CRNA HRONIKA story. Be strictly factual — no speculation. Use "osumnjičeni" not "krivac". Respect presumption of innocence. Do not sensationalize violence.',
  'svijet': 'This is a WORLD news story. Provide geopolitical context briefly. Explain why it matters to Bosnian readers when possible.',
  'region': 'This is a REGIONAL (Balkans) news story. Reference regional dynamics when relevant. Avoid editorializing on inter-state relations.',
  'sport': 'This is a SPORT news story. Include key stats and results. Reference league standings or tournament context when available.',
  'fudbal': 'This is a FOOTBALL story. Include match context, league position, and relevant player stats. Reference H2H history if applicable.',
  'tech': 'This is a TECH news story. Explain technical concepts simply. Focus on user impact rather than technical jargon.',
  'biznis': 'This is a BUSINESS news story. Include relevant numbers and financial context. Reference market impact when applicable.',
  'nauka': 'This is a SCIENCE news story. Reference the research source/journal. Explain methodology briefly. Avoid overstating findings.',
  'transferi': 'This is a TRANSFER story. Include fee (if known), contract length, and selling/buying club context. Reference player stats from previous season.',
  'vijesti': 'This is a general NEWS story. Write in a balanced, informative tone.',
  'utakmice': 'This is a MATCH story. Include teams, league context, and relevant stats. Cover preview, live, or post-match angle as appropriate.',
  'analize': 'This is a TACTICAL/ANALYTICAL story. Focus on patterns, formations, and strategic insights. Back claims with observable facts from matches.',
  'povrede': 'This is an INJURY/SQUAD NEWS story. Include player name, injury type if known, expected return timeline, and squad impact.',
  'rankings': 'This is a RANKINGS/STATS story. Include relevant numbers, league table context, and historical comparison where available.',
}

// ══════════════════════════════════
// EVENTTYPE → CATEGORY MAPPING
// ══════════════════════════════════

const CATEGORY_EVENT_TYPE_MAP: Record<string, string[]> = {
  vijesti:   ['news', 'general'],
  transferi: ['transfer', 'transfers'],
  utakmice:  ['match', 'matches', 'preview', 'report'],
  povrede:   ['injury', 'injuries'],
  analize:   ['analysis', 'opinion', 'tactical'],
  rankings:  ['ranking', 'stats', 'table'],
  football:  ['match', 'preview', 'report', 'transfer', 'injury', 'general'],
  sport:     ['match', 'transfer', 'injury', 'general', 'news'],
  breaking:  ['breaking', 'news', 'general'],
}

// ══════════════════════════════════
// PROMPT BUILDER
// ══════════════════════════════════

export function buildPromptContext(
  cluster: { title: string; eventType: string; entities: string[]; dis: number; category?: string | null },
  newsItems: { title: string; source: string; content?: string | null }[],
  config: {
    contentStyle: string
    translateLang: string
    tone: string
    defaultLength: number
    alwaysCreditSources: boolean
  }
): { system: string; prompt: string } {
  const styleMap: Record<string, string> = {
    signal_only:
      'Write a factual news article based ONLY on the source signals provided. Do NOT add any information not in the sources.',
    rewrite:
      'Rewrite the source material in your own editorial voice. Keep all facts but use new sentence structures.',
    analysis:
      'Write an analytical piece that contextualizes the news. Only use facts from sources, but you may add tactical/strategic analysis.',
  }

  const toneMap: Record<string, string> = {
    neutral: 'Write in a neutral, Reuters-like factual tone.',
    passionate:
      'Write with the energy of a dedicated sports fan — passionate but still factual.',
    editorial:
      'Write in an editorial voice with measured opinion, clearly separating fact from analysis.',
  }

  const langLabel =
    config.translateLang === 'bs'
      ? 'Bosnian (Bosanski)'
      : config.translateLang === 'en'
        ? 'English'
        : config.translateLang

  const categoryInstruction = cluster.category ? (CATEGORY_PROMPTS[cluster.category] ?? '') : ''

  const system = `You are a senior journalist for a Bosnian news portal.
Output valid JSON only, no markdown wrapping.

${styleMap[config.contentStyle] || styleMap.signal_only}
${toneMap[config.tone] || toneMap.neutral}
${categoryInstruction ? `\nCATEGORY GUIDANCE: ${categoryInstruction}` : ''}

LANGUAGE: Write in ${langLabel}.
TARGET LENGTH: ~${config.defaultLength} words.

ABSOLUTE RULES:
1. NEVER invent facts, quotes, scores, player names, or statistics not in the sources.
2. NEVER add match minutes, goal scorers, or assist providers unless explicitly in sources.
3. If sources only have headlines, write a maximum 3-sentence news stub.
4. Each paragraph must contain NEW information — no repetition.
5. HTML tags allowed: <h2>, <p>, <ul>, <li>. No <blockquote> unless quoting from source.
6. BANNED WORDS: "landscape", "crucial", "paramount", "delve", "comprehensive", "game-changer", "blockbuster", "masterclass", "meteoric rise", "the beautiful game", "sending shockwaves".
${config.alwaysCreditSources ? '7. Always credit sources by name in the article text.' : ''}
STRICT RULE: Never write about, mention, promote, or reference gambling, betting, odds, bookmakers, betting sites, or any gambling-related content. If a story involves betting odds or gambling, write about the sporting event itself only, completely ignoring any betting/gambling angles. This rule cannot be overridden.

The JSON must have this structure:
{
  "title": "Headline under 70 chars",
  "content": "Article in HTML",
  "excerpt": "1-2 sentence summary",
  "seo": {
    "metaTitle": "SEO title max 60 chars",
    "metaDescription": "Meta description max 155 chars",
    "slug": "url-safe-slug",
    "keywords": ["keyword1", "keyword2", "keyword3"]
  },
  "tags": ["tag1", "tag2", "tag3"]
}`

  const sourcesText = newsItems
    .map((item, i) => {
      let entry = `SOURCE ${i + 1}: ${item.title} (${item.source})`
      if (item.content) {
        entry += `\nCONTENT: ${item.content.substring(0, 800)}`
      }
      return entry
    })
    .join('\n\n')

  const prompt = `Write an article about this story:\n\nTOPIC: ${cluster.title}\nEVENT TYPE: ${cluster.eventType}\nKEY ENTITIES: ${cluster.entities.join(', ')}\nIMPORTANCE (DIS): ${cluster.dis}/100\n\nSOURCES:\n${sourcesText || 'No source text available — write a brief news stub only.'}\n\n${config.translateLang === 'bs' ? 'Write the article in Bosnian language.' : ''}`

  return { system, prompt }
}

// ══════════════════════════════════
// HTML → TIPTAP CONVERTER
// ══════════════════════════════════

export function htmlToTiptap(html: string): Record<string, unknown> {
  const content: Record<string, unknown>[] = []
  const blockRegex = /<(h[1-6]|p|ul|ol)([^>]*)>([\s\S]*?)<\/\1>/gi
  let match

  while ((match = blockRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase()
    const inner = match[3].trim()

    if (tag.startsWith('h')) {
      const level = parseInt(tag[1])
      content.push({
        type: 'heading',
        attrs: { level },
        content: [{ type: 'text', text: inner.replace(/<[^>]+>/g, '') }],
      })
    } else if (tag === 'p') {
      if (inner) {
        const textContent = parseInlineMarks(inner)
        if (textContent.length > 0) {
          content.push({ type: 'paragraph', content: textContent })
        }
      }
    } else if (tag === 'ul' || tag === 'ol') {
      const liRegex = /<li>([\s\S]*?)<\/li>/gi
      const items: Record<string, unknown>[] = []
      let liMatch
      while ((liMatch = liRegex.exec(inner)) !== null) {
        items.push({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: liMatch[1].replace(/<[^>]+>/g, '').trim() }],
            },
          ],
        })
      }
      if (items.length > 0) {
        content.push({
          type: tag === 'ul' ? 'bulletList' : 'orderedList',
          content: items,
        })
      }
    }
  }

  if (content.length === 0) {
    const paragraphs = html.split(/\n\n+/).filter(Boolean)
    for (const p of paragraphs) {
      content.push({
        type: 'paragraph',
        content: [{ type: 'text', text: p.replace(/<[^>]+>/g, '').trim() }],
      })
    }
  }

  return { type: 'doc', content }
}

function parseInlineMarks(html: string): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = []
  const parts = html.split(/(<strong>.*?<\/strong>|<em>.*?<\/em>|<b>.*?<\/b>|<i>.*?<\/i>|<a[^>]*>.*?<\/a>)/gi)

  for (const part of parts) {
    if (!part) continue
    const strongMatch = part.match(/^<(?:strong|b)>(.*?)<\/(?:strong|b)>$/i)
    const emMatch = part.match(/^<(?:em|i)>(.*?)<\/(?:em|i)>$/i)
    const linkMatch = part.match(/^<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>$/i)

    if (strongMatch) {
      nodes.push({ type: 'text', text: strongMatch[1].replace(/<[^>]+>/g, ''), marks: [{ type: 'bold' }] })
    } else if (emMatch) {
      nodes.push({ type: 'text', text: emMatch[1].replace(/<[^>]+>/g, ''), marks: [{ type: 'italic' }] })
    } else if (linkMatch) {
      nodes.push({ type: 'text', text: linkMatch[2].replace(/<[^>]+>/g, ''), marks: [{ type: 'link', attrs: { href: linkMatch[1], target: '_blank' } }] })
    } else {
      const text = part.replace(/<[^>]+>/g, '')
      if (text) nodes.push({ type: 'text', text })
    }
  }

  return nodes
}

// ══════════════════════════════════
// WIDGET INJECTION (DISABLED)
// ══════════════════════════════════

// DISABLED: Widgets were injected with empty attrs (no question, no options, no stats data)
// which rendered as broken placeholder boxes on the frontend.
// TODO: Re-enable when AI prompt generates actual widget content (poll questions, stats rows, etc.)
export function injectWidgets(
  tiptapContent: Record<string, unknown>,
  _categoryConfig: {
    widgetPoll: boolean
    widgetQuiz: boolean
    widgetStats: boolean
    widgetPlayer: boolean
    widgetVideo: boolean
    widgetGallery: boolean
  }
): Record<string, unknown> {
  return tiptapContent
}

// ══════════════════════════════════
// SLUG GENERATOR
// ══════════════════════════════════

const UNSPLASH_NOISE_WORDS = [
  'wolf', 'wolves', 'eagle', 'eagles', 'fox', 'foxes', 'bear', 'bears',
  'lion', 'lions', 'tiger', 'tigers', 'robin', 'robin hood', 'swan', 'swans',
  'horse', 'horses', 'bee', 'bees', 'hornet', 'hornets', 'ram', 'rams',
  'hawk', 'hawks', 'owl', 'owls', 'cat', 'cats', 'dog', 'dogs',
  'cherry', 'forest', 'ocean', 'river', 'lake', 'mountain', 'sunset',
]

function buildFootballQueries(query: string): string[] {
  const cleaned = query
    .split(/\s+/)
    .filter(w => !UNSPLASH_NOISE_WORDS.includes(w.toLowerCase()))
    .join(' ')
    .trim()

  const queries: string[] = []

  if (cleaned.length > 2) {
    queries.push(`${cleaned} football soccer`)
  }

  if (query !== cleaned && query.length > 2) {
    queries.push(`${query} football`)
  }

  queries.push('football match stadium', 'soccer premier league', 'football stadium')

  return queries
}

export async function fetchUnsplashImage(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) {
    console.error('[Unsplash] UNSPLASH_ACCESS_KEY not set')
    return null
  }

  const queries = buildFootballQueries(query)

  for (const q of queries) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&orientation=landscape&content_filter=high&per_page=5&client_id=${key}`,
        { cache: 'no-store' },
      )
      if (!res.ok) {
        console.error(`[Unsplash] Search error for "${q}":`, res.status)
        continue
      }

      const data = await res.json() as { results?: { urls?: { regular?: string; full?: string } }[] }
      const results = data?.results
      if (!results || results.length === 0) continue

      const pick = results[Math.floor(Math.random() * results.length)]
      const url = pick?.urls?.regular || pick?.urls?.full || null
      if (url) {
        await systemLog('info', 'unsplash', `Image fetched for: "${q.substring(0, 60)}" (original: "${query.substring(0, 40)}")`, { url })
        return url
      }
    } catch (e) {
      console.error(`[Unsplash] Fetch failed for "${q}":`, e)
    }
  }

  await systemLog('error', 'unsplash', `No image found for: ${query.substring(0, 60)}`, { queries })
  return null
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[čć]/g, 'c')
    .replace(/[š]/g, 's')
    .replace(/[ž]/g, 'z')
    .replace(/[đ]/g, 'dj')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80)
}

// ══════════════════════════════════
// PRIORITY-BASED TASK SELECTION
// ══════════════════════════════════

export async function getNextTask(
  config: AutopilotConfigFull,
  siteId: string,
  todayCount: number,
  force = false
): Promise<GenerationTask | null> {
  if (!force) {
    const needed = getArticlesNeeded(config.dailyTarget, todayCount)
    if (needed <= 0) return null
  }

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const now = new Date()

  const coveredArticles = await prisma.article.findMany({
    where: { siteId, createdAt: { gte: startOfDay }, aiPrompt: { not: null } },
    select: { aiPrompt: true },
  })
  const coveredClusterIds = new Set<string>()
  const coveredMatchIds = new Set<string>()
  for (const a of coveredArticles) {
    if (!a.aiPrompt) continue
    try {
      const j = typeof a.aiPrompt === 'string' ? JSON.parse(a.aiPrompt) : a.aiPrompt
      if (j && typeof j === 'object') {
        if (j.clusterId) coveredClusterIds.add(j.clusterId)
        if (j.matchId) coveredMatchIds.add(j.matchId)
      }
    } catch { /* ignore */ }
  }

  const footballFilter = { primaryEntityType: { in: FOOTBALL_ENTITY_TYPES } }

  if (config.breakingNews) {
    const breakingCluster = await prisma.storyCluster.findFirst({
      where: {
        dis: { gte: config.breakingThreshold },
        latestItem: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
        ...footballFilter,
      },
      orderBy: [{ dis: 'desc' }, { latestItem: 'desc' }],
    })

    if (breakingCluster) {
      if (coveredClusterIds.has(breakingCluster.id)) {
        // already covered, skip
      } else {
        const newsItems = await prisma.newsItem.findMany({
          where: { clusterId: breakingCluster.id },
          orderBy: { pubDate: 'desc' },
          take: 5,
        })
        const catConfig = config.categories.find((c) => c.slug === 'breaking') || config.categories[0]
        return {
          priority: 'breaking',
          title: breakingCluster.title,
          category: catConfig?.name || 'Breaking',
          categorySlug: catConfig?.slug || 'breaking',
          sources: newsItems.map((n) => ({ title: n.title, source: n.source, content: n.content || undefined })),
          clusterId: breakingCluster.id,
          wordCount: Math.min(config.defaultLength, 400),
        }
      }
    }
  }

  if (config.matchAutoCoverage) {
    const upcomingMatch = await prisma.matchResult.findFirst({
      where: {
        matchDate: { gte: now, lte: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        status: { in: ['NS', 'TBD'] },
      },
      orderBy: { matchDate: 'asc' },
    })
    if (upcomingMatch) {
      if (coveredMatchIds.has(upcomingMatch.id)) {
        // already covered
      } else {
        const teamNews = await prisma.newsItem.findMany({
          where: {
            OR: [
              { title: { contains: upcomingMatch.homeTeam, mode: 'insensitive' } },
              { title: { contains: upcomingMatch.awayTeam, mode: 'insensitive' } },
            ],
            pubDate: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
          },
          orderBy: { pubDate: 'desc' },
          take: 5,
        })
        const catConfig = config.categories.find((c) => c.slug === 'utakmice' || c.slug === 'matches' || c.slug === 'football') || config.categories[0]
        return {
          priority: 'match_preview',
          title: `${upcomingMatch.homeTeam} vs ${upcomingMatch.awayTeam} — Match Preview`,
          category: catConfig?.name || 'Utakmice',
          categorySlug: catConfig?.slug || 'utakmice',
          sources: teamNews.map((n) => ({ title: n.title, source: n.source, content: n.content || undefined })),
          matchId: upcomingMatch.id,
          wordCount: config.defaultLength,
        }
      }
    }
  }

  // ── Priority 3: Topic-triggered ──
  for (const topic of config.topics.filter((t) => t.isActive)) {
    const keywordConditions = topic.keywords.map((kw) => ({
      title: { contains: kw, mode: 'insensitive' as const },
    }))
    if (keywordConditions.length === 0) continue

    const topicCluster = await prisma.storyCluster.findFirst({
      where: {
        OR: keywordConditions,
        latestItem: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        dis: { gte: 30 },
        ...footballFilter,
      },
      orderBy: [{ dis: 'desc' }, { latestItem: 'desc' }],
    })
    if (topicCluster) {
      if (!coveredClusterIds.has(topicCluster.id)) {
        const newsItems = await prisma.newsItem.findMany({
          where: { clusterId: topicCluster.id },
          orderBy: { pubDate: 'desc' },
          take: 5,
        })
        const catConfig = config.categories.find((c) => topic.name.toLowerCase().includes(c.slug)) || config.categories[0]
        return {
          priority: 'topic_triggered',
          title: topicCluster.title,
          category: catConfig?.name || 'Sport',
          categorySlug: catConfig?.slug || 'sport',
          sources: newsItems.map((n) => ({ title: n.title, source: n.source, content: n.content || undefined })),
          clusterId: topicCluster.id,
          wordCount: config.defaultLength,
        }
      }
    }
  }

  // ── Priority 4: Category fill ──
  const sortedCats = [...config.categories].sort((a, b) => b.percentage - a.percentage)
  for (const cat of sortedCats) {
    const mappedEventTypes = CATEGORY_EVENT_TYPE_MAP[cat.slug] || []
    if (mappedEventTypes.length === 0) continue

    const expectedCount = Math.ceil(config.dailyTarget * (cat.percentage / 100))
    const currentCount = await prisma.article.count({
      where: { siteId, category: { slug: cat.slug }, createdAt: { gte: startOfDay } },
    })

    if (currentCount < expectedCount) {
      const cluster = await prisma.storyCluster.findFirst({
        where: {
          OR: mappedEventTypes.map((t) => ({ eventType: { contains: t, mode: 'insensitive' as const } })),
          latestItem: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          dis: { gte: 20 },
          ...footballFilter,
        },
        orderBy: [{ dis: 'desc' }, { latestItem: 'desc' }],
      })

      if (cluster) {
        if (!coveredClusterIds.has(cluster.id)) {
          const newsItems = await prisma.newsItem.findMany({
            where: { clusterId: cluster.id },
            orderBy: { pubDate: 'desc' },
            take: 5,
          })
          return {
            priority: 'category_fill',
            title: cluster.title,
            category: cat.name,
            categorySlug: cat.slug,
            sources: newsItems.map((n) => ({ title: n.title, source: n.source, content: n.content || undefined })),
            clusterId: cluster.id,
            wordCount: config.defaultLength,
          }
        }
      }
    }
  }

  // ── Priority 5: Gap fill ──
  if (config.gapDetection) {
    const lastArticle = await prisma.article.findFirst({
      where: { siteId, aiGenerated: true },
      orderBy: { createdAt: 'desc' },
    })
    const gapMs = config.gapHours * 60 * 60 * 1000
    const hasGap = !lastArticle || Date.now() - lastArticle.createdAt.getTime() > gapMs

    if (hasGap) {
      const cluster = await prisma.storyCluster.findFirst({
        where: {
          latestItem: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          dis: { gte: 15 },
          ...footballFilter,
        },
        orderBy: [{ dis: 'desc' }, { latestItem: 'desc' }],
      })
      if (cluster) {
        if (!coveredClusterIds.has(cluster.id)) {
          const newsItems = await prisma.newsItem.findMany({
            where: { clusterId: cluster.id },
            orderBy: { pubDate: 'desc' },
            take: 5,
          })
          const catConfig = config.categories[0]
          return {
            priority: 'gap_fill',
            title: cluster.title,
            category: catConfig?.name || 'Sport',
            categorySlug: catConfig?.slug || 'sport',
            sources: newsItems.map((n) => ({ title: n.title, source: n.source, content: n.content || undefined })),
            clusterId: cluster.id,
            wordCount: Math.min(config.defaultLength, 500),
          }
        }
      }
    }
  }

  // ── Priority 6: Post-match ──
  if (config.matchAutoCoverage) {
    const completedMatch = await prisma.matchResult.findFirst({
      where: {
        status: { in: ['FT', 'AET', 'PEN'] },
        matchDate: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
      },
      orderBy: { matchDate: 'desc' },
    })
    if (completedMatch) {
      if (!coveredMatchIds.has(completedMatch.id)) {
        const teamNews = await prisma.newsItem.findMany({
          where: {
            OR: [
              { title: { contains: completedMatch.homeTeam, mode: 'insensitive' } },
              { title: { contains: completedMatch.awayTeam, mode: 'insensitive' } },
            ],
            pubDate: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
          },
          orderBy: { pubDate: 'desc' },
          take: 5,
        })
        const score = completedMatch.homeScore != null && completedMatch.awayScore != null
          ? `${completedMatch.homeScore}-${completedMatch.awayScore}` : ''
        const catConfig = config.categories.find((c) => c.slug === 'utakmice' || c.slug === 'matches' || c.slug === 'football') || config.categories[0]
        return {
          priority: 'post_match',
          title: `${completedMatch.homeTeam} ${score} ${completedMatch.awayTeam} — Match Report`,
          category: catConfig?.name || 'Utakmice',
          categorySlug: catConfig?.slug || 'utakmice',
          sources: teamNews.map((n) => ({ title: n.title, source: n.source, content: n.content || undefined })),
          matchId: completedMatch.id,
          wordCount: config.defaultLength,
        }
      }
    }
  }

  // ── Priority 7: ALWAYS-ON fallback ──
  const anyCluster = await prisma.storyCluster.findFirst({
    where: {
      latestItem: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      ...footballFilter,
    },
    orderBy: [{ dis: 'desc' }, { latestItem: 'desc' }],
  })

  if (anyCluster) {
    if (!coveredClusterIds.has(anyCluster.id)) {
      const newsItems = await prisma.newsItem.findMany({
        where: { clusterId: anyCluster.id },
        orderBy: { pubDate: 'desc' },
        take: 5,
      })
      const catConfig = config.categories[0]
      return {
        priority: force ? 'force_fallback' : 'fallback',
        title: anyCluster.title,
        category: catConfig?.name || 'Vijesti',
        categorySlug: catConfig?.slug || 'vijesti',
        sources: newsItems.map((n) => ({ title: n.title, source: n.source, content: n.content || undefined })),
        clusterId: anyCluster.id,
        wordCount: Math.min(config.defaultLength, 500),
      }
    }
  }

  // Last resort: skip — no football content available
  return null
}
