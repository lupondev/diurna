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
// PROMPT BUILDER
// ══════════════════════════════════

export function buildPromptContext(
  cluster: { title: string; eventType: string; entities: string[]; dis: number },
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

  const system = `You are a senior sports journalist for a Bosnian sports news portal.
Output valid JSON only, no markdown wrapping.

${styleMap[config.contentStyle] || styleMap.signal_only}
${toneMap[config.tone] || toneMap.neutral}

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

  const prompt = `Write an article about this story:

TOPIC: ${cluster.title}
EVENT TYPE: ${cluster.eventType}
KEY ENTITIES: ${cluster.entities.join(', ')}
IMPORTANCE (DIS): ${cluster.dis}/100

SOURCES:
${sourcesText || 'No source text available — write a brief news stub only.'}

${config.translateLang === 'bs' ? 'Write the article in Bosnian language.' : ''}`

  return { system, prompt }
}

// ══════════════════════════════════
// HTML → TIPTAP CONVERTER
// ══════════════════════════════════

export function htmlToTiptap(html: string): Record<string, unknown> {
  const content: Record<string, unknown>[] = []
  const blockRegex = /<(h[1-6]|p|ul|ol)>([\s\S]*?)<\/\1>/gi
  let match

  while ((match = blockRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase()
    const inner = match[2].trim()

    if (tag.startsWith('h')) {
      const level = parseInt(tag[1])
      content.push({
        type: 'heading',
        attrs: { level },
        content: [{ type: 'text', text: inner.replace(/<[^>]+>/g, '') }],
      })
    } else if (tag === 'p') {
      if (inner) {
        content.push({
          type: 'paragraph',
          content: [{ type: 'text', text: inner.replace(/<[^>]+>/g, '') }],
        })
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

// ══════════════════════════════════
// WIDGET INJECTION
// ══════════════════════════════════

export function injectWidgets(
  tiptapContent: Record<string, unknown>,
  categoryConfig: {
    widgetPoll: boolean
    widgetQuiz: boolean
    widgetStats: boolean
    widgetPlayer: boolean
    widgetVideo: boolean
    widgetGallery: boolean
  }
): Record<string, unknown> {
  const doc = tiptapContent as { type: string; content: Record<string, unknown>[] }
  if (!doc.content || doc.content.length < 3) return tiptapContent

  const widgets: Record<string, unknown>[] = []

  if (categoryConfig.widgetPoll) {
    widgets.push({
      type: 'paragraph',
      attrs: { class: 'widget-placeholder' },
      content: [{ type: 'text', text: '{{WIDGET:POLL}}' }],
    })
  }
  if (categoryConfig.widgetStats) {
    widgets.push({
      type: 'paragraph',
      attrs: { class: 'widget-placeholder' },
      content: [{ type: 'text', text: '{{WIDGET:STATS}}' }],
    })
  }
  if (categoryConfig.widgetPlayer) {
    widgets.push({
      type: 'paragraph',
      attrs: { class: 'widget-placeholder' },
      content: [{ type: 'text', text: '{{WIDGET:PLAYER}}' }],
    })
  }
  if (categoryConfig.widgetVideo) {
    widgets.push({
      type: 'paragraph',
      attrs: { class: 'widget-placeholder' },
      content: [{ type: 'text', text: '{{WIDGET:VIDEO}}' }],
    })
  }

  if (widgets.length > 0) {
    const insertIdx = Math.min(2, doc.content.length - 1)
    doc.content.splice(insertIdx + 1, 0, ...widgets)
  }

  return doc
}

// ══════════════════════════════════
// SLUG GENERATOR
// ══════════════════════════════════

export async function fetchUnsplashImage(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) {
    console.error('[Unsplash] UNSPLASH_ACCESS_KEY not set')
    return null
  }

  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high&client_id=${key}`,
      { cache: 'no-store' },
    )
    if (!res.ok) {
      console.error('[Unsplash] Error:', res.status, await res.text().catch(() => ''))
      return null
    }

    const data = await res.json() as { urls?: { regular?: string; full?: string } }
    const url = data?.urls?.regular || data?.urls?.full || null
    if (url) {
      await systemLog('info', 'unsplash', `Image fetched for: ${query.substring(0, 60)}`, { url })
    }
    return url
  } catch (e) {
    console.error('[Unsplash] Fetch failed:', e)
    await systemLog('error', 'unsplash', `Fetch failed for: ${query.substring(0, 60)}`, { error: e instanceof Error ? e.message : 'unknown' })
    return null
  }
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

  // ── Priority 1: Breaking news — high DIS clusters not yet covered ──
  if (config.breakingNews) {
    const breakingCluster = await prisma.storyCluster.findFirst({
      where: {
        dis: { gte: config.breakingThreshold },
        trend: { in: ['SPIKING', 'RISING'] },
        latestItem: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      },
      orderBy: { dis: 'desc' },
    })

    if (breakingCluster) {
      const alreadyCovered = await prisma.article.findFirst({
        where: {
          siteId,
          aiPrompt: { contains: breakingCluster.id },
          createdAt: { gte: startOfDay },
        },
      })

      if (!alreadyCovered) {
        const newsItems = await prisma.newsItem.findMany({
          where: { clusterId: breakingCluster.id },
          orderBy: { pubDate: 'desc' },
          take: 5,
        })

        const catConfig =
          config.categories.find((c) => c.slug === 'breaking') || config.categories[0]
        return {
          priority: 'breaking',
          title: breakingCluster.title,
          category: catConfig?.name || 'Breaking',
          categorySlug: catConfig?.slug || 'breaking',
          sources: newsItems.map((n) => ({
            title: n.title,
            source: n.source,
            content: n.content || undefined,
          })),
          clusterId: breakingCluster.id,
          wordCount: Math.min(config.defaultLength, 400),
        }
      }
    }
  }

  // ── Priority 2: Match previews — upcoming matches within 24h ──
  if (config.matchAutoCoverage) {
    const upcomingMatch = await prisma.matchResult.findFirst({
      where: {
        matchDate: { gte: now, lte: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        status: { in: ['NS', 'TBD'] },
      },
      orderBy: { matchDate: 'asc' },
    })

    if (upcomingMatch) {
      const alreadyCovered = await prisma.article.findFirst({
        where: {
          siteId,
          aiPrompt: { contains: upcomingMatch.id },
          createdAt: { gte: startOfDay },
        },
      })

      if (!alreadyCovered) {
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

        const catConfig =
          config.categories.find((c) => c.slug === 'matches' || c.slug === 'football') ||
          config.categories[0]
        return {
          priority: 'match_preview',
          title: `${upcomingMatch.homeTeam} vs ${upcomingMatch.awayTeam} — Match Preview`,
          category: catConfig?.name || 'Football',
          categorySlug: catConfig?.slug || 'football',
          sources: teamNews.map((n) => ({
            title: n.title,
            source: n.source,
            content: n.content || undefined,
          })),
          matchId: upcomingMatch.id,
          wordCount: config.defaultLength,
        }
      }
    }
  }

  // ── Priority 3: Topic-triggered — active topics with matching clusters ──
  for (const topic of config.topics.filter((t) => t.isActive)) {
    const keywordConditions = topic.keywords.map((kw) => ({
      title: { contains: kw, mode: 'insensitive' as const },
    }))

    if (keywordConditions.length === 0) continue

    const topicCluster = await prisma.storyCluster.findFirst({
      where: {
        OR: keywordConditions,
        latestItem: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
        dis: { gte: 30 },
      },
      orderBy: { dis: 'desc' },
    })

    if (topicCluster) {
      const alreadyCovered = await prisma.article.findFirst({
        where: {
          siteId,
          aiPrompt: { contains: topicCluster.id },
          createdAt: { gte: startOfDay },
        },
      })

      if (!alreadyCovered) {
        const newsItems = await prisma.newsItem.findMany({
          where: { clusterId: topicCluster.id },
          orderBy: { pubDate: 'desc' },
          take: 5,
        })

        const catConfig =
          config.categories.find((c) => topic.name.toLowerCase().includes(c.slug)) ||
          config.categories[0]
        return {
          priority: 'topic_triggered',
          title: topicCluster.title,
          category: catConfig?.name || 'Sport',
          categorySlug: catConfig?.slug || 'sport',
          sources: newsItems.map((n) => ({
            title: n.title,
            source: n.source,
            content: n.content || undefined,
          })),
          clusterId: topicCluster.id,
          wordCount: config.defaultLength,
        }
      }
    }
  }

  // ── Priority 4: Category fill — underrepresented categories ──
  for (const cat of config.categories.sort((a, b) => b.percentage - a.percentage)) {
    const expectedCount = Math.ceil(config.dailyTarget * (cat.percentage / 100))
    const currentCount = await prisma.article.count({
      where: {
        siteId,
        category: { slug: cat.slug },
        createdAt: { gte: startOfDay },
      },
    })

    if (currentCount < expectedCount) {
      const cluster = await prisma.storyCluster.findFirst({
        where: {
          eventType: { contains: cat.slug, mode: 'insensitive' },
          latestItem: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
          dis: { gte: 20 },
        },
        orderBy: { dis: 'desc' },
      })

      if (cluster) {
        const alreadyCovered = await prisma.article.findFirst({
          where: {
            siteId,
            aiPrompt: { contains: cluster.id },
            createdAt: { gte: startOfDay },
          },
        })

        if (!alreadyCovered) {
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
            sources: newsItems.map((n) => ({
              title: n.title,
              source: n.source,
              content: n.content || undefined,
            })),
            clusterId: cluster.id,
            wordCount: config.defaultLength,
          }
        }
      }
    }
  }

  // ── Priority 5: Gap fill — no article in last N hours ──
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
          latestItem: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
          dis: { gte: 15 },
        },
        orderBy: { dis: 'desc' },
      })

      if (cluster) {
        const alreadyCovered = await prisma.article.findFirst({
          where: {
            siteId,
            aiPrompt: { contains: cluster.id },
            createdAt: { gte: startOfDay },
          },
        })

        if (!alreadyCovered) {
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
            sources: newsItems.map((n) => ({
              title: n.title,
              source: n.source,
              content: n.content || undefined,
            })),
            clusterId: cluster.id,
            wordCount: Math.min(config.defaultLength, 500),
          }
        }
      }
    }
  }

  // ── Priority 6: Post-match — completed matches without coverage ──
  if (config.matchAutoCoverage) {
    const completedMatch = await prisma.matchResult.findFirst({
      where: {
        status: { in: ['FT', 'AET', 'PEN'] },
        matchDate: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
      },
      orderBy: { matchDate: 'desc' },
    })

    if (completedMatch) {
      const alreadyCovered = await prisma.article.findFirst({
        where: {
          siteId,
          aiPrompt: { contains: completedMatch.id },
          createdAt: { gte: startOfDay },
        },
      })

      if (!alreadyCovered) {
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

        const score =
          completedMatch.homeScore != null && completedMatch.awayScore != null
            ? `${completedMatch.homeScore}-${completedMatch.awayScore}`
            : ''
        const catConfig =
          config.categories.find((c) => c.slug === 'matches' || c.slug === 'football') ||
          config.categories[0]
        return {
          priority: 'post_match',
          title: `${completedMatch.homeTeam} ${score} ${completedMatch.awayTeam} — Match Report`,
          category: catConfig?.name || 'Football',
          categorySlug: catConfig?.slug || 'football',
          sources: teamNews.map((n) => ({
            title: n.title,
            source: n.source,
            content: n.content || undefined,
          })),
          matchId: completedMatch.id,
          wordCount: config.defaultLength,
        }
      }
    }
  }

  // ── Priority 7 (force only): Latest news fallback ──
  // When no clusters/matches exist, use the freshest news items directly
  if (force) {
    // Try any cluster first, even low DIS
    const anyCluster = await prisma.storyCluster.findFirst({
      where: { latestItem: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      orderBy: { dis: 'desc' },
    })

    if (anyCluster) {
      const newsItems = await prisma.newsItem.findMany({
        where: { clusterId: anyCluster.id },
        orderBy: { pubDate: 'desc' },
        take: 5,
      })
      const catConfig = config.categories[0]
      return {
        priority: 'category_fill',
        title: anyCluster.title,
        category: catConfig?.name || 'Vijesti',
        categorySlug: catConfig?.slug || 'vijesti',
        sources: newsItems.map((n) => ({
          title: n.title,
          source: n.source,
          content: n.content || undefined,
        })),
        clusterId: anyCluster.id,
        wordCount: config.defaultLength,
      }
    }

    // No clusters at all — use raw news items
    const latestNews = await prisma.newsItem.findMany({
      where: { pubDate: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      orderBy: { pubDate: 'desc' },
      take: 5,
    })

    if (latestNews.length > 0) {
      const catConfig = config.categories[0]
      return {
        priority: 'category_fill',
        title: latestNews[0].title,
        category: catConfig?.name || 'Vijesti',
        categorySlug: catConfig?.slug || 'vijesti',
        sources: latestNews.map((n) => ({
          title: n.title,
          source: n.source,
          content: n.content || undefined,
        })),
        wordCount: config.defaultLength,
      }
    }
  }

  return null
}
