import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function tiptapToHtml(content: Record<string, unknown>): string {
  const doc = content as { content?: Array<Record<string, unknown>> }
  if (!doc?.content) return ''

  return doc.content.map((node) => {
    const type = node.type as string
    const text = extractText(node)

    switch (type) {
      case 'heading': {
        const level = (node.attrs as { level?: number })?.level || 2
        return `<h${level}>${text}</h${level}>`
      }
      case 'paragraph':
        return text ? `<p>${text}</p>` : ''
      case 'blockquote':
        return `<blockquote>${text}</blockquote>`
      case 'bulletList':
      case 'orderedList': {
        const tag = type === 'bulletList' ? 'ul' : 'ol'
        const items = (node.content as Array<Record<string, unknown>> || [])
          .map(li => `<li>${extractText(li)}</li>`)
          .join('')
        return `<${tag}>${items}</${tag}>`
      }
      case 'horizontalRule':
        return '<hr>'
      default:
        return text ? `<p>${text}</p>` : ''
    }
  }).join('\n')
}

function extractText(node: Record<string, unknown>): string {
  if (node.text) return node.text as string
  const children = node.content as Array<Record<string, unknown>> | undefined
  if (!children) return ''
  return children.map(c => {
    let t = (c.text as string) || extractText(c)
    const marks = c.marks as Array<{ type: string }> | undefined
    if (marks) {
      for (const mark of marks) {
        if (mark.type === 'bold') t = `<strong>${t}</strong>`
        if (mark.type === 'italic') t = `<em>${t}</em>`
      }
    }
    return t
  }).join('')
}

export async function GET(
  req: NextRequest,
  { params }: { params: { articleId: string } }
) {
  try {
    const articleId = params.articleId

    const article = await prisma.article.findFirst({
      where: { id: articleId, status: 'PUBLISHED', deletedAt: null },
      include: {
        category: { select: { name: true } },
        site: { select: { name: true, domain: true } },
        tags: { include: { tag: true }, take: 5 },
      },
    })

    if (!article) {
      return new NextResponse('<html><body><p>Article not found</p></body></html>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    const contentHtml = tiptapToHtml(article.content as Record<string, unknown>)
    // Take first 3 paragraphs as excerpt for embed
    const excerptMatch = contentHtml.match(/(<p>[\s\S]*?<\/p>)/g)
    const excerptHtml = excerptMatch ? excerptMatch.slice(0, 3).join('') : ''

    const siteName = article.site?.name || 'Diurna'
    const categoryName = article.category?.name || ''
    const tags = article.tags?.map(t => t.tag.name) || []
    const publishedDate = article.publishedAt
      ? new Date(article.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : ''

    const baseUrl = process.env.NEXTAUTH_URL || 'https://diurna.vercel.app'
    const articleUrl = `${baseUrl}/site/${article.slug}`

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; line-height: 1.6; background: #fff; }
  .embed { border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; max-width: 600px; }
  .embed-header { padding: 16px 20px; border-bottom: 1px solid #f3f4f6; display: flex; align-items: center; gap: 10px; }
  .embed-source { font-size: 12px; font-weight: 700; color: #00D4AA; text-transform: uppercase; letter-spacing: 0.05em; }
  .embed-cat { font-size: 10px; font-weight: 700; padding: 3px 8px; background: #f3f4f6; border-radius: 10px; color: #6b7280; text-transform: uppercase; }
  .embed-body { padding: 20px; }
  .embed-title { font-size: 20px; font-weight: 700; line-height: 1.3; margin-bottom: 12px; color: #111; }
  .embed-title a { color: inherit; text-decoration: none; }
  .embed-title a:hover { color: #00D4AA; }
  .embed-date { font-size: 12px; color: #9ca3af; margin-bottom: 14px; }
  .embed-content { font-size: 14px; color: #4b5563; line-height: 1.7; }
  .embed-content p { margin-bottom: 10px; }
  .embed-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 14px; padding-top: 14px; border-top: 1px solid #f3f4f6; }
  .embed-tag { font-size: 11px; font-weight: 600; padding: 3px 8px; background: #f0fdf4; color: #16a34a; border-radius: 10px; }
  .embed-cta { display: block; padding: 14px 20px; text-align: center; background: linear-gradient(135deg, #00D4AA 0%, #00B894 100%); color: #fff; font-size: 13px; font-weight: 700; text-decoration: none; transition: opacity 0.2s; }
  .embed-cta:hover { opacity: 0.9; }
  .embed-footer { padding: 10px 20px; background: #fafafa; border-top: 1px solid #f3f4f6; display: flex; align-items: center; justify-content: space-between; }
  .embed-powered { font-size: 10px; color: #9ca3af; }
  .embed-powered a { color: #00D4AA; text-decoration: none; font-weight: 600; }
  .embed-ad { margin: 0 20px 16px; padding: 12px; background: #fafafa; border: 1px dashed #e5e7eb; border-radius: 8px; text-align: center; font-size: 10px; color: #9ca3af; min-height: 60px; display: flex; align-items: center; justify-content: center; }
</style>
</head>
<body>
<div class="embed">
  <div class="embed-header">
    <span class="embed-source">${siteName}</span>
    ${categoryName ? `<span class="embed-cat">${categoryName}</span>` : ''}
  </div>
  <div class="embed-body">
    <h1 class="embed-title"><a href="${articleUrl}" target="_blank" rel="noopener">${article.title}</a></h1>
    ${publishedDate ? `<div class="embed-date">${publishedDate}</div>` : ''}
    <div class="embed-content">${excerptHtml}</div>
    ${tags.length > 0 ? `<div class="embed-tags">${tags.map(t => `<span class="embed-tag">#${t}</span>`).join('')}</div>` : ''}
  </div>
  <div class="embed-ad">Lupon Media SSP &mdash; Ad Space</div>
  <a class="embed-cta" href="${articleUrl}" target="_blank" rel="noopener">Read Full Article &rarr;</a>
  <div class="embed-footer">
    <span class="embed-powered">Powered by <a href="${baseUrl}" target="_blank">Diurna</a> + Lupon Media</span>
  </div>
</div>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (error) {
    console.error('Embed error:', error)
    return new NextResponse('<html><body><p>Error loading embed</p></body></html>', {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}
