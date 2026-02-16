import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultSite } from '@/lib/db'

export const dynamic = 'force-dynamic'

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function GET(_req: Request, { params }: { params: { category: string } }) {
  const site = await getDefaultSite()
  if (!site) return new NextResponse('Site not found', { status: 404 })

  const cat = await prisma.category.findFirst({
    where: { slug: params.category, siteId: site.id },
  })
  if (!cat) return new NextResponse('Category not found', { status: 404 })

  const articles = await prisma.article.findMany({
    where: { siteId: site.id, categoryId: cat.id, status: 'PUBLISHED', deletedAt: null },
    include: { tags: { include: { tag: { select: { name: true } } } } },
    orderBy: { publishedAt: 'desc' },
    take: 50,
  })

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://diurna.vercel.app'

  const items = articles.map((a) => {
    const pubDate = a.publishedAt ? new Date(a.publishedAt).toUTCString() : new Date(a.createdAt).toUTCString()
    return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${baseUrl}/site/${a.slug}</link>
      <guid isPermaLink="true">${baseUrl}/site/${a.slug}</guid>
      <description>${escapeXml(a.excerpt || '')}</description>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(cat.name)}</category>
      ${a.tags.map((t) => `<category>${escapeXml(t.tag.name)}</category>`).join('\n      ')}
    </item>`
  }).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site.name)} - ${escapeXml(cat.name)}</title>
    <link>${baseUrl}/site/category/${cat.slug}</link>
    <description>${escapeXml(cat.name)} news from ${escapeXml(site.name)}</description>
    <language>${site.language || 'en'}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed/rss/${cat.slug}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
    },
  })
}
