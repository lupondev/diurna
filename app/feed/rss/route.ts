import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultSite } from '@/lib/db'

export const dynamic = 'force-dynamic'

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function GET() {
  const site = await getDefaultSite()
  if (!site) return new NextResponse('Site not found', { status: 404 })

  const articles = await prisma.article.findMany({
    where: { siteId: site.id, status: 'PUBLISHED', deletedAt: null, isTest: false },
    include: {
      category: { select: { name: true } },
      tags: { include: { tag: { select: { name: true } } } },
    },
    orderBy: { publishedAt: 'desc' },
    take: 50,
  })

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://diurna.vercel.app'

  let authorName = 'Editorial Team'
  if (articles[0]?.authorId) {
    const author = await prisma.user.findUnique({ where: { id: articles[0].authorId }, select: { name: true } })
    if (author?.name) authorName = author.name
  }

  const items = articles.map((a) => {
    const pubDate = a.publishedAt ? new Date(a.publishedAt).toUTCString() : new Date(a.createdAt).toUTCString()
    return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${baseUrl}/site/${a.slug}</link>
      <guid isPermaLink="true">${baseUrl}/site/${a.slug}</guid>
      <description>${escapeXml(a.excerpt || '')}</description>
      <pubDate>${pubDate}</pubDate>
      <author>${escapeXml(authorName)}</author>
      ${a.category ? `<category>${escapeXml(a.category.name)}</category>` : ''}
      ${a.tags.map((t) => `<category>${escapeXml(t.tag.name)}</category>`).join('\n      ')}
    </item>`
  }).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(site.name)}</title>
    <link>${baseUrl}/site</link>
    <description>${escapeXml(site.name)} - Latest News</description>
    <language>${site.language || 'en'}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed/rss" rel="self" type="application/rss+xml" />
    <generator>Diurna CMS</generator>
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
