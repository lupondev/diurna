import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultSite } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const site = await getDefaultSite()
  
  const categories = site ? await prisma.category.findMany({
    where: { siteId: site.id, deletedAt: null },
    select: { id: true, name: true, slug: true },
  }) : []

  const recentArticles = site ? await prisma.article.findMany({
    where: { siteId: site.id, status: 'PUBLISHED', deletedAt: null },
    select: { id: true, title: true, slug: true, categoryId: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  }) : []

  return NextResponse.json({ site: site ? { id: site.id, name: site.name, domain: site.domain, slug: site.slug } : null, categories, recentArticles })
}
