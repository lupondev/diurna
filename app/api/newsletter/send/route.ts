import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resend } from '@/lib/resend'
import crypto from 'crypto'

function generateUnsubscribeToken(subscriberId: string): string {
  const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret'
  const signature = crypto
    .createHmac('sha256', secret)
    .update(subscriberId)
    .digest('hex')
    .slice(0, 16)
  return Buffer.from(`${subscriberId}:${signature}`).toString('base64')
}

function extractExcerpt(content: Record<string, unknown>): string {
  try {
    const doc = content as { content?: Array<{ content?: Array<{ text?: string }> }> }
    const texts: string[] = []
    for (const block of doc.content || []) {
      for (const node of block.content || []) {
        if (node.text) texts.push(node.text)
      }
      if (texts.join(' ').length > 200) break
    }
    const full = texts.join(' ')
    return full.length > 200 ? full.slice(0, 200) + '...' : full
  } catch {
    return ''
  }
}

function buildEmailHtml(opts: {
  title: string
  excerpt: string
  articleUrl: string
  siteName: string
  unsubscribeUrl: string
  accentColor: string
}): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
  <tr><td style="height:4px;background:${opts.accentColor}"></td></tr>
  <tr><td style="padding:28px 32px 12px">
    <div style="font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:16px">${opts.siteName}</div>
    <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#111827;line-height:1.3">${opts.title}</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#4b5563">${opts.excerpt}</p>
    <a href="${opts.articleUrl}" style="display:inline-block;padding:12px 28px;background:${opts.accentColor};color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700">Read Full Article →</a>
  </td></tr>
  <tr><td style="padding:20px 32px;border-top:1px solid #f3f4f6">
    <div style="font-size:11px;color:#9ca3af;text-align:center">
      Sent by <strong>${opts.siteName}</strong> via <span style="color:${opts.accentColor};font-weight:700">Diurna</span>
      <br><a href="${opts.unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;font-size:11px">Unsubscribe</a>
    </div>
  </td></tr>
</table>
</td></tr></table></body></html>`
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { articleId } = await req.json()
    if (!articleId) {
      return NextResponse.json({ error: 'articleId required' }, { status: 400 })
    }

    const article = await prisma.article.findFirst({
      where: { id: articleId, deletedAt: null },
      include: { site: true },
    })
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    const subscribers = await prisma.subscriber.findMany({
      where: { siteId: article.siteId, isActive: true },
      select: { id: true, email: true, name: true },
    })

    if (subscribers.length === 0) {
      return NextResponse.json({ error: 'No active subscribers', sent: 0 }, { status: 200 })
    }

    const baseUrl = article.site?.domain
      ? (article.site.domain.startsWith('http') ? article.site.domain : `https://${article.site.domain}`)
      : process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const articleUrl = `${baseUrl}/${article.site?.slug}/${article.slug}`
    const siteName = article.site?.name || 'Diurna'
    const excerpt = article.excerpt || extractExcerpt(article.content as Record<string, unknown>)

    if (!resend) {
      return NextResponse.json({ error: 'Email service not configured', sent: 0 }, { status: 200 })
    }

    let sent = 0
    let failed = 0

    for (let i = 0; i < subscribers.length; i += 50) {
      const batch = subscribers.slice(i, i + 50)
      const results = await Promise.allSettled(
        batch.map((sub) => {
          const unsubscribeUrl = `${baseUrl}/api/newsletter/unsubscribe?token=${generateUnsubscribeToken(sub.id)}`
          return resend!.emails.send({
            from: `${siteName} <onboarding@resend.dev>`,
            to: sub.email,
            subject: article.title,
            html: buildEmailHtml({
              title: article.title,
              excerpt,
              articleUrl,
              siteName,
              unsubscribeUrl,
              accentColor: '#00D4AA',
            }),
          })
        })
      )

      for (const r of results) {
        if (r.status === 'fulfilled') sent++
        else failed++
      }
    }

    return NextResponse.json({ sent, failed, total: subscribers.length })
  } catch (error) {
    console.error('Newsletter send error:', error)
    return NextResponse.json({ error: 'Send failed' }, { status: 500 })
  }
}
