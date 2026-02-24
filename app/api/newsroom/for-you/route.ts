import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultSite } from '@/lib/db'
import { getArticleUrl, normalizeCategoryName } from '@/lib/article-url'

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

export async function GET(req: NextRequest) {
  const teamsParam = req.nextUrl.searchParams.get('teams')
  if (!teamsParam) {
    return NextResponse.json({ articles: [] })
  }

  const teams = teamsParam.split(',').map(t => t.trim()).filter(Boolean)
  if (teams.length === 0) {
    return NextResponse.json({ articles: [] })
  }

  const site = await getDefaultSite()
  if (!site) {
    return NextResponse.json({ articles: [] })
  }

  const orConditions = teams.map(team => ({
    title: { contains: team, mode: 'insensitive' as const },
  }))

  const articles = await prisma.article.findMany({
    where: {
      siteId: site.id,
      status: 'PUBLISHED',
      deletedAt: null,
      isTest: false,
      OR: orConditions,
    },
    select: {
      title: true,
      slug: true,
      publishedAt: true,
      category: { select: { name: true, slug: true } },
    },
    orderBy: { publishedAt: 'desc' },
    take: 10,
  })

  const result = articles.map(a => {
    const matchedTeam = teams.find(t => a.title.toLowerCase().includes(t.toLowerCase())) || teams[0]
    return {
      title: a.title,
      cat: normalizeCategoryName(a.category?.name).toUpperCase(),
      time: a.publishedAt ? timeAgo(a.publishedAt) : 'Novo',
      href: getArticleUrl(a),
      team: matchedTeam,
    }
  })

  return NextResponse.json({ articles: result })
}
