import { prisma } from '@/lib/prisma'
import { resend } from '@/lib/resend'
import crypto from 'crypto'

// ─── Types ───────────────────────────────────────────────

type DistStatus = Record<string, 'sent' | 'failed' | 'skipped'>

interface ArticleForDist {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: unknown
  siteId: string
  site: { name: string; slug: string; domain: string | null }
  category: { slug: string } | null
}

// ─── Helpers ─────────────────────────────────────────────

function extractExcerpt(content: unknown): string {
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

function articleUrl(article: ArticleForDist): string {
  const base = article.site.domain
    ? (article.site.domain.startsWith('http') ? article.site.domain : `https://${article.site.domain}`)
    : process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return `${base}/${article.site.slug}/${article.slug}`
}

function generateHashtags(title: string): string {
  const tags: string[] = []
  const keywords = ['transfer', 'goal', 'match', 'preview', 'injury', 'breaking', 'champions league', 'premier league', 'la liga', 'bundesliga', 'serie a']
  const lower = title.toLowerCase()
  for (const kw of keywords) {
    if (lower.includes(kw)) {
      tags.push('#' + kw.replace(/\s+/g, ''))
    }
  }
  if (tags.length === 0) tags.push('#football', '#sport')
  return tags.slice(0, 4).join(' ')
}

// ─── Twitter/X ───────────────────────────────────────────

async function postToTwitter(article: ArticleForDist): Promise<{ success: boolean; postUrl?: string; error?: string }> {
  const apiKey = process.env.TWITTER_API_KEY
  const apiSecret = process.env.TWITTER_API_SECRET
  const accessToken = process.env.TWITTER_ACCESS_TOKEN
  const accessSecret = process.env.TWITTER_ACCESS_SECRET

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    return { success: false, error: 'Twitter API keys not configured' }
  }

  try {
    const url = articleUrl(article)
    const hashtags = generateHashtags(article.title)
    const maxTitleLen = 280 - url.length - hashtags.length - 4
    const truncatedTitle = article.title.length > maxTitleLen
      ? article.title.slice(0, maxTitleLen - 3) + '...'
      : article.title
    const text = `${truncatedTitle}\n\n${url}\n${hashtags}`

    // OAuth 1.0a signature
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: apiKey,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: accessToken,
      oauth_version: '1.0',
    }

    const tweetUrl = 'https://api.twitter.com/2/tweets'
    const bodyStr = JSON.stringify({ text })

    // Build signature base
    const paramStr = Object.keys(oauthParams).sort()
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
      .join('&')
    const baseStr = `POST&${encodeURIComponent(tweetUrl)}&${encodeURIComponent(paramStr)}`
    const sigKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessSecret)}`
    const signature = crypto.createHmac('sha1', sigKey).update(baseStr).digest('base64')
    oauthParams.oauth_signature = signature

    const authHeader = 'OAuth ' + Object.keys(oauthParams).sort()
      .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
      .join(', ')

    const res = await fetch(tweetUrl, {
      method: 'POST',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
      body: bodyStr,
    })

    if (res.ok) {
      const data = await res.json() as { data?: { id?: string } }
      return { success: true, postUrl: `https://x.com/i/status/${data.data?.id}` }
    }
    const errData = await res.text()
    return { success: false, error: `Twitter ${res.status}: ${errData.slice(0, 200)}` }
  } catch (err) {
    return { success: false, error: `Twitter error: ${err instanceof Error ? err.message : 'Unknown'}` }
  }
}

// ─── Facebook ────────────────────────────────────────────

async function postToFacebook(article: ArticleForDist): Promise<{ success: boolean; postUrl?: string; error?: string }> {
  const pageToken = process.env.FACEBOOK_PAGE_TOKEN

  if (!pageToken) {
    return { success: false, error: 'Facebook page token not configured' }
  }

  try {
    const url = articleUrl(article)
    const excerpt = article.excerpt || extractExcerpt(article.content)
    const message = `${article.title}\n\n${excerpt}\n\n${url}`

    const res = await fetch(`https://graph.facebook.com/v19.0/me/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        link: url,
        access_token: pageToken,
      }),
    })

    if (res.ok) {
      const data = await res.json() as { id?: string }
      return { success: true, postUrl: `https://facebook.com/${data.id}` }
    }
    const errData = await res.text()
    return { success: false, error: `Facebook ${res.status}: ${errData.slice(0, 200)}` }
  } catch (err) {
    return { success: false, error: `Facebook error: ${err instanceof Error ? err.message : 'Unknown'}` }
  }
}

// ─── Telegram ────────────────────────────────────────────

async function postToTelegram(article: ArticleForDist): Promise<{ success: boolean; postUrl?: string; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const channelId = process.env.TELEGRAM_CHANNEL_ID

  if (!botToken || !channelId) {
    return { success: false, error: 'Telegram bot token or channel ID not configured' }
  }

  try {
    const url = articleUrl(article)
    const excerpt = article.excerpt || extractExcerpt(article.content)
    const text = `<b>${escapeHtml(article.title)}</b>\n\n${escapeHtml(excerpt)}\n\n<a href="${url}">Read more →</a>`

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    })

    if (res.ok) {
      const data = await res.json() as { result?: { message_id?: number } }
      const msgId = data.result?.message_id
      const chId = channelId.replace('@', '')
      return { success: true, postUrl: `https://t.me/${chId}/${msgId}` }
    }
    const errData = await res.text()
    return { success: false, error: `Telegram ${res.status}: ${errData.slice(0, 200)}` }
  } catch (err) {
    return { success: false, error: `Telegram error: ${err instanceof Error ? err.message : 'Unknown'}` }
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ─── Newsletter (breaking digest) ────────────────────────

async function sendBreakingNewsletter(article: ArticleForDist): Promise<{ success: boolean; sent?: number; error?: string }> {
  if (!resend) {
    return { success: false, error: 'Resend not configured' }
  }

  try {
    const subscribers = await prisma.subscriber.findMany({
      where: { siteId: article.siteId, isActive: true },
      select: { id: true, email: true },
    })

    if (subscribers.length === 0) {
      return { success: true, sent: 0 }
    }

    const url = articleUrl(article)
    const excerpt = article.excerpt || extractExcerpt(article.content)
    const fromEmail = process.env.NEWSLETTER_FROM_EMAIL || `${article.site.name} <onboarding@resend.dev>`

    let sent = 0
    for (let i = 0; i < subscribers.length; i += 50) {
      const batch = subscribers.slice(i, i + 50)
      const results = await Promise.allSettled(
        batch.map(sub => resend!.emails.send({
          from: fromEmail,
          to: sub.email,
          subject: `🔴 ${article.title}`,
          html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f5f7;font-family:sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="height:4px;background:#dc2626"></td></tr>
<tr><td style="padding:24px 32px">
<div style="font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px">🔴 BREAKING</div>
<h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#111;line-height:1.3">${article.title}</h1>
<p style="margin:0 0 20px;font-size:14px;color:#4b5563;line-height:1.6">${excerpt}</p>
<a href="${url}" style="display:inline-block;padding:12px 28px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700">Read Now →</a>
</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #f3f4f6;text-align:center;font-size:11px;color:#9ca3af">
Sent by <strong>${article.site.name}</strong> via Diurna
</td></tr></table></td></tr></table></body></html>`,
        }))
      )
      for (const r of results) {
        if (r.status === 'fulfilled') sent++
      }
    }

    return { success: true, sent }
  } catch (err) {
    return { success: false, error: `Newsletter error: ${err instanceof Error ? err.message : 'Unknown'}` }
  }
}

// ─── Main: Send to a single channel ─────────────────────

export async function sendToChannel(
  article: ArticleForDist,
  platform: string
): Promise<{ success: boolean; postUrl?: string; error?: string }> {
  switch (platform.toLowerCase()) {
    case 'twitter':
    case 'x':
      return postToTwitter(article)
    case 'facebook':
      return postToFacebook(article)
    case 'telegram':
      return postToTelegram(article)
    case 'newsletter':
      const nlResult = await sendBreakingNewsletter(article)
      return { success: nlResult.success, error: nlResult.error }
    default:
      return { success: false, error: `Unknown platform: ${platform}` }
  }
}

// ─── Main: Queue distribution for article ────────────────

export async function distributeArticle(articleId: string): Promise<DistStatus> {
  const status: DistStatus = {}

  try {
    const article = await prisma.article.findFirst({
      where: { id: articleId, deletedAt: null, status: 'PUBLISHED' },
      include: { site: true, category: true },
    })

    if (!article) {
      return { error: 'skipped' }
    }

    // Find the autopilot config for this org (if any)
    const site = await prisma.site.findFirst({
      where: { id: article.siteId },
      select: { organizationId: true },
    })
    if (!site) return status

    const config = await prisma.autopilotConfig.findFirst({
      where: { orgId: site.organizationId },
      include: { channels: { where: { isActive: true } } },
    })

    if (!config || config.channels.length === 0) {
      return status
    }

    const articleData: ArticleForDist = {
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      content: article.content,
      siteId: article.siteId,
      site: { name: article.site.name, slug: article.site.slug, domain: article.site.domain },
      category: article.category ? { slug: article.category.slug } : null,
    }

    for (const channel of config.channels) {
      // Check category filter
      if (channel.filter && channel.filter !== 'all' && article.category) {
        if (!channel.filter.toLowerCase().includes(article.category.slug.toLowerCase())) {
          status[channel.platform] = 'skipped'
          continue
        }
      }

      try {
        const result = await sendToChannel(articleData, channel.platform)
        status[channel.platform] = result.success ? 'sent' : 'failed'
        if (!result.success) {
          console.error(`Distribution [${channel.platform}]:`, result.error)
        }
      } catch (err) {
        status[channel.platform] = 'failed'
        console.error(`Distribution [${channel.platform}] crash:`, err)
      }
    }

    // Save distribution status to article
    await prisma.article.update({
      where: { id: articleId },
      data: { distributionStatus: status as Record<string, string> },
    })
  } catch (err) {
    console.error('Distribution error:', err)
  }

  return status
}
