import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPrimarySite } from '@/lib/site-resolver'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const site = await getPrimarySite(session.user.organizationId)
  if (!site) {
    return NextResponse.json({ error: 'No site' }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'today' // today, week, month, year

  const now = new Date()
  let startDate: Date
  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      break
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }

  const siteId = site.id

  // ── 1. Content Quality Metrics ──
  const articles = await prisma.article.findMany({
    where: {
      siteId,
      status: 'PUBLISHED',
      deletedAt: null,
      isTest: false,
      publishedAt: { gte: startDate },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      featuredImage: true,
      excerpt: true,
      publishedAt: true,
      aiGenerated: true,
      category: { select: { name: true, slug: true } },
      tags: { select: { tagId: true } },
    },
    orderBy: { publishedAt: 'desc' },
  })

  // Word count per article (content is JSON/Tiptap — extract text)
  const wordCounts = articles.map((a) => {
    let text = ''
    if (typeof a.content === 'string') {
      text = a.content
    } else if (a.content && typeof a.content === 'object' && 'content' in a.content) {
      const content = (a.content as { content?: Array<{ content?: Array<{ text?: string }>; text?: string }> }).content
      if (Array.isArray(content)) {
        text = content
          .map((n) => (n.content ? n.content.map((c) => (c as { text?: string }).text || '').join('') : (n as { text?: string }).text || ''))
          .join(' ')
      }
    }
    return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter((w) => w.length > 0).length
  })

  const avgWordCount = wordCounts.length > 0 ? Math.round(wordCounts.reduce((s, w) => s + w, 0) / wordCounts.length) : 0
  const articlesWithImage = articles.filter((a) => a.featuredImage).length
  const articlesWithTags = articles.filter((a) => a.tags.length > 0).length
  const articlesWithExcerpt = articles.filter((a) => a.excerpt && a.excerpt.length > 10).length
  const shortArticles = wordCounts.filter((w) => w < 200).length
  const longArticles = wordCounts.filter((w) => w >= 400).length

  const contentQuality = {
    totalArticles: articles.length,
    avgWordCount,
    minWordCount: wordCounts.length > 0 ? Math.min(...wordCounts) : 0,
    maxWordCount: wordCounts.length > 0 ? Math.max(...wordCounts) : 0,
    imageRate: articles.length > 0 ? Math.round((articlesWithImage / articles.length) * 100) : 0,
    tagRate: articles.length > 0 ? Math.round((articlesWithTags / articles.length) * 100) : 0,
    excerptRate: articles.length > 0 ? Math.round((articlesWithExcerpt / articles.length) * 100) : 0,
    shortArticles,
    longArticles,
    wordCountDistribution: [
      { range: '0-100', count: wordCounts.filter((w) => w < 100).length },
      { range: '100-200', count: wordCounts.filter((w) => w >= 100 && w < 200).length },
      { range: '200-300', count: wordCounts.filter((w) => w >= 200 && w < 300).length },
      { range: '300-500', count: wordCounts.filter((w) => w >= 300 && w < 500).length },
      { range: '500+', count: wordCounts.filter((w) => w >= 500).length },
    ],
  }

  // ── 2. Autopilot Performance ──
  const allArticlesInPeriod = await prisma.article.findMany({
    where: {
      siteId,
      deletedAt: null,
      isTest: false,
      createdAt: { gte: startDate },
    },
    select: {
      status: true,
      aiGenerated: true,
      publishedAt: true,
      createdAt: true,
      category: { select: { name: true } },
    },
  })

  const aiArticles = allArticlesInPeriod.filter((a) => a.aiGenerated)
  const aiPublished = aiArticles.filter((a) => a.status === 'PUBLISHED')
  const aiFailed = aiArticles.filter((a) => a.status === 'DRAFT')

  // Articles per hour heatmap (0-23)
  const hourHeatmap = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: articles.filter((a) => a.publishedAt && new Date(a.publishedAt).getUTCHours() === h).length,
  }))

  // Articles per day (last 7 days for trend)
  const dailyTrend: { date: string; count: number; ai: number; manual: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
    const dayArticles = allArticlesInPeriod.filter((a) => {
      const t = a.publishedAt || a.createdAt
      return t >= dayStart && t < dayEnd
    })
    dailyTrend.push({
      date: dayStart.toISOString().split('T')[0],
      count: dayArticles.length,
      ai: dayArticles.filter((a) => a.aiGenerated).length,
      manual: dayArticles.filter((a) => !a.aiGenerated).length,
    })
  }

  const autopilotPerformance = {
    totalAi: aiArticles.length,
    aiPublished: aiPublished.length,
    aiFailed: aiFailed.length,
    successRate: aiArticles.length > 0 ? Math.round((aiPublished.length / aiArticles.length) * 100) : 0,
    hourHeatmap,
    dailyTrend,
    topCategories: Object.entries(
      aiPublished.reduce(
        (acc, a) => {
          const cat = a.category?.name || 'Uncategorized'
          acc[cat] = (acc[cat] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count })),
  }

  // ── 3. Tag & Entity Analytics ──
  const tagStats = await prisma.articleTag.groupBy({
    by: ['tagId'],
    where: {
      article: {
        siteId,
        status: 'PUBLISHED',
        deletedAt: null,
        isTest: false,
        publishedAt: { gte: startDate },
      },
    },
    _count: { tagId: true },
    orderBy: { _count: { tagId: 'desc' } },
    take: 15,
  })

  const tagIds = tagStats.map((t) => t.tagId)
  const tags = await prisma.tag.findMany({
    where: { id: { in: tagIds } },
    select: { id: true, name: true, slug: true },
  })

  const tagMap = new Map(tags.map((t) => [t.id, t]))
  const topTags = tagStats.map((t) => ({
    name: tagMap.get(t.tagId)?.name || 'Unknown',
    slug: tagMap.get(t.tagId)?.slug || '',
    count: t._count.tagId,
  }))

  const entityAnalytics = {
    topTags,
    totalUniqueTags: tagIds.length,
    avgTagsPerArticle: articles.length > 0 ? +(articles.reduce((s, a) => s + a.tags.length, 0) / articles.length).toFixed(1) : 0,
    untaggedArticles: articles.filter((a) => a.tags.length === 0).length,
  }

  // ── 4. Source Performance ──
  const feedSources = await prisma.feedSource.findMany({
    where: { siteId },
    select: { id: true, name: true, url: true, active: true, lastFetch: true },
  })

  const clusters = await prisma.storyCluster.findMany({
    where: {
      siteId,
      createdAt: { gte: startDate },
    },
    select: { id: true, title: true, dis: true, sourceCount: true },
    orderBy: { dis: 'desc' },
    take: 10,
  })

  const staleThreshold = 24 * 60 * 60 * 1000
  const staleSources = feedSources.filter((s) => {
    if (!s.lastFetch) return true
    return now.getTime() - new Date(s.lastFetch).getTime() > staleThreshold
  })

  const sourcePerformance = {
    totalSources: feedSources.length,
    activeSources: feedSources.filter((s) => s.active).length,
    staleSourcesCount: staleSources.length,
    staleSources: staleSources.map((s) => ({
      name: s.name,
      lastFetch: s.lastFetch?.toISOString() || 'Never',
    })),
    topClusters: clusters.map((c) => ({
      title: c.title,
      dis: c.dis,
      itemCount: c.sourceCount,
    })),
  }

  return NextResponse.json({
    contentQuality,
    autopilotPerformance,
    entityAnalytics,
    sourcePerformance,
    period,
  })
}
