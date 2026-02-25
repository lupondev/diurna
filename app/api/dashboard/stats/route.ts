import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const baseArticleWhere = { deletedAt: null, isTest: false }

    const [
      totalArticles,
      publishedArticles,
      draftArticles,
      publishedToday,
      articlesThisWeek,
      totalClusters,
      activeClusters,
      clusters,
      totalEntities,
      totalFeeds,
      activeFeeds,
      totalNewsItems,
      itemsToday,
      categories,
    ] = await Promise.all([
      prisma.article.count({ where: baseArticleWhere }),
      prisma.article.count({ where: { ...baseArticleWhere, status: 'PUBLISHED' } }),
      prisma.article.count({ where: { ...baseArticleWhere, status: 'DRAFT' } }),
      prisma.article.count({ where: { ...baseArticleWhere, status: 'PUBLISHED', publishedAt: { gte: todayStart } } }),
      prisma.article.count({ where: { ...baseArticleWhere, createdAt: { gte: weekAgo } } }),
      prisma.storyCluster.count(),
      prisma.storyCluster.count({ where: { updatedAt: { gte: dayAgo } } }),
      prisma.storyCluster.findMany({
        select: { dis: true, title: true, trend: true, entities: true },
        orderBy: { dis: 'desc' },
        take: 20,
      }),
      prisma.entity.count(),
      prisma.feedSource.count(),
      prisma.feedSource.count({ where: { active: true } }),
      prisma.newsItem.count(),
      prisma.newsItem.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.category.findMany({
        where: { deletedAt: null },
        include: { _count: { select: { articles: { where: { deletedAt: null } } } } },
        orderBy: { order: 'asc' },
      }),
    ])

    const avgDis =
      clusters.length > 0
        ? Math.round(clusters.reduce((sum, c) => sum + c.dis, 0) / clusters.length)
        : 0

    const topCluster = clusters[0]
      ? { title: clusters[0].title, dis: clusters[0].dis, trend: clusters[0].trend }
      : null

    const entityCounts: Record<string, { name: string; count: number }> = {}
    clusters.forEach((c) => {
      c.entities.forEach((e) => {
        if (!entityCounts[e]) entityCounts[e] = { name: e, count: 0 }
        entityCounts[e].count++
      })
    })
    const topEntities = Object.values(entityCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((e) => ({ name: e.name, type: 'ENTITY', mentionCount: e.count }))

    const categoryStats = categories.map((c) => ({
      name: c.name,
      slug: c.slug,
      articleCount: c._count.articles,
    }))

    return NextResponse.json({
      totalArticles,
      publishedArticles,
      draftArticles,
      publishedToday,
      articlesThisWeek,
      totalClusters,
      activeClusters,
      avgDis,
      topCluster,
      totalEntities,
      topEntities,
      totalFeeds,
      activeFeeds,
      totalNewsItems,
      itemsToday,
      categoryStats,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
