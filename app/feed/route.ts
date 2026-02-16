import { prisma } from '@/lib/prisma'

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://diurna.io'

  const articles = await prisma.article.findMany({
    where: { status: 'PUBLISHED', deletedAt: null },
    select: {
      title: true,
      slug: true,
      excerpt: true,
      publishedAt: true,
      site: { select: { slug: true, name: true } },
      category: { select: { name: true } },
    },
    orderBy: { publishedAt: 'desc' },
    take: 50,
  })

  const items = articles
    .map((a) => {
      const url = `${baseUrl}/${a.site.slug}/${a.slug}`
      const pubDate = a.publishedAt ? new Date(a.publishedAt).toUTCString() : new Date().toUTCString()
      const category = a.category?.name ? `<category>${escapeXml(a.category.name)}</category>` : ''
      return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(a.excerpt || '')}</description>
      ${category}
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Diurna — AI-Powered Sports Publishing</title>
    <link>${baseUrl}</link>
    <description>The publishing platform for modern sports newsrooms. Powered by Lupon Media.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
