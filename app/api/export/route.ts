import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDefaultSite } from '@/lib/db'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const site = await getDefaultSite(session.user.organizationId)
    if (!site) {
      return NextResponse.json({ error: 'No site found' }, { status: 404 })
    }

    const format = req.nextUrl.searchParams.get('format') || 'json'

    const articles = await prisma.article.findMany({
      where: { siteId: site.id, deletedAt: null },
      include: {
        category: { select: { name: true, slug: true } },
        tags: { include: { tag: { select: { name: true, slug: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (format === 'json') {
      const data = articles.map((a) => ({
        title: a.title,
        slug: a.slug,
        content: a.content,
        excerpt: a.excerpt,
        status: a.status,
        publishedAt: a.publishedAt?.toISOString() || null,
        category: a.category?.name || null,
        tags: a.tags.map((t) => t.tag.name),
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }))

      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${site.slug}-articles.json"`,
        },
      })
    }

    if (format === 'csv') {
      const header = 'title,slug,status,category,tags,publishedAt,excerpt'
      const rows = articles.map((a) => {
        const escape = (s: string) => `"${(s || '').replace(/"/g, '""')}"`
        return [
          escape(a.title),
          escape(a.slug),
          a.status,
          escape(a.category?.name || ''),
          escape(a.tags.map((t) => t.tag.name).join(';')),
          a.publishedAt?.toISOString() || '',
          escape(a.excerpt || ''),
        ].join(',')
      })
      const csv = [header, ...rows].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${site.slug}-articles.csv"`,
        },
      })
    }

    if (format === 'wxr') {
      const now = new Date().toUTCString()
      const items = articles.map((a) => {
        const cats = a.category
          ? `<category domain="category" nicename="${a.category.slug}"><![CDATA[${a.category.name}]]></category>`
          : ''
        const tags = a.tags
          .map((t) => `<category domain="post_tag" nicename="${t.tag.slug}"><![CDATA[${t.tag.name}]]></category>`)
          .join('\n        ')

        const contentStr = typeof a.content === 'string' ? a.content : JSON.stringify(a.content)
        const wpStatus = a.status === 'PUBLISHED' ? 'publish' : a.status === 'IN_REVIEW' ? 'pending' : 'draft'

        return `    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${site.domain ? `https://${site.domain}` : ''}/${a.slug}</link>
      <pubDate>${a.publishedAt ? a.publishedAt.toUTCString() : ''}</pubDate>
      <dc:creator><![CDATA[admin]]></dc:creator>
      <guid isPermaLink="false">${a.id}</guid>
      <description></description>
      <content:encoded><![CDATA[${contentStr}]]></content:encoded>
      <excerpt:encoded><![CDATA[${a.excerpt || ''}]]></excerpt:encoded>
      <wp:post_name><![CDATA[${a.slug}]]></wp:post_name>
      <wp:status><![CDATA[${wpStatus}]]></wp:status>
      <wp:post_type><![CDATA[post]]></wp:post_type>
      ${cats}
      ${tags}
    </item>`
      }).join('\n')

      const wxr = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/"
>
  <channel>
    <title>${site.name}</title>
    <link>${site.domain ? `https://${site.domain}` : ''}</link>
    <description>Exported from Diurna</description>
    <pubDate>${now}</pubDate>
    <language>${site.language || 'en'}</language>
    <wp:wxr_version>1.2</wp:wxr_version>
    <wp:base_site_url>${site.domain ? `https://${site.domain}` : ''}</wp:base_site_url>
    <wp:base_blog_url>${site.domain ? `https://${site.domain}` : ''}</wp:base_blog_url>
    <generator>Diurna CMS</generator>
${items}
  </channel>
</rss>`

      return new NextResponse(wxr, {
        headers: {
          'Content-Type': 'application/xml',
          'Content-Disposition': `attachment; filename="${site.slug}-export.xml"`,
        },
      })
    }

    return NextResponse.json({ error: 'Invalid format. Use json, csv, or wxr.' }, { status: 400 })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
