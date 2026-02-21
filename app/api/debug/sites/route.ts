import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sites = await prisma.site.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, domain: true, organizationId: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  const recentArticles = await prisma.article.findMany({
    where: { status: 'PUBLISHED', deletedAt: null },
    select: { id: true, title: true, siteId: true, publishedAt: true, aiGenerated: true },
    orderBy: { publishedAt: 'desc' },
    take: 10,
  })

  const defaultSite = sites[0]

  return NextResponse.json({
    sites,
    defaultSiteId: defaultSite?.id,
    recentArticles,
    mismatch: recentArticles.some(a => a.siteId !== defaultSite?.id),
  })
}
