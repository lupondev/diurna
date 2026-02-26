import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0]

  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`)
  const endOfDay = new Date(`${dateStr}T23:59:59.999Z`)

  let site = await prisma.site.findFirst({
    where: { organizationId: session.user.organizationId },
    select: { id: true },
  })

  if (!site) {
    const org = await prisma.organization.findFirst({
      where: { id: session.user.organizationId },
      include: { sites: { select: { id: true }, take: 1 } },
    })
    site = org?.sites?.[0] ?? null
  }

  if (!site) {
    return NextResponse.json({ articles: [], matches: [] })
  }

  const articles = await prisma.article.findMany({
    where: {
      siteId: site.id,
      deletedAt: null,
      isTest: false,
      OR: [
        { publishedAt: { gte: startOfDay, lte: endOfDay } },
        { scheduledAt: { gte: startOfDay, lte: endOfDay } },
        { status: { in: ['DRAFT', 'IN_REVIEW', 'SCHEDULED'] }, createdAt: { gte: startOfDay, lte: endOfDay } },
        { status: 'PUBLISHED', publishedAt: null, createdAt: { gte: startOfDay, lte: endOfDay } },
      ],
    },
    select: {
      id: true,
      title: true,
      status: true,
      publishedAt: true,
      scheduledAt: true,
      createdAt: true,
      aiGenerated: true,
      aiPrompt: true,
      category: { select: { name: true, slug: true } },
    },
    orderBy: [
      { publishedAt: 'asc' },
      { scheduledAt: 'asc' },
      { createdAt: 'asc' },
    ],
  })

  const matches = await prisma.matchResult.findMany({
    where: {
      matchDate: { gte: startOfDay, lte: endOfDay },
    },
    orderBy: { matchDate: 'asc' },
  })

  const timelineArticles = articles.map((a) => {
    const time = a.publishedAt || a.scheduledAt || a.createdAt
    let isWebhook = false
    if (typeof a.aiPrompt === 'string') {
      try { isWebhook = JSON.parse(a.aiPrompt).priority === 'webhook_breaking' } catch (_) { /* ignore invalid JSON */ }
    }
    return {
      id: a.id,
      title: a.title,
      category: a.category?.name || 'Uncategorized',
      categorySlug: a.category?.slug || 'uncategorized',
      status: a.status,
      time: time.toISOString(),
      hour: time.getHours(),
      aiGenerated: a.aiGenerated,
      isWebhook,
    }
  })

  const timelineMatches = matches.map((m) => ({
    id: m.id,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    league: m.league,
    status: m.status,
    time: m.matchDate.toISOString(),
    hour: m.matchDate.getHours(),
  }))

  return NextResponse.json({
    articles: timelineArticles,
    matches: timelineMatches,
  })
}
