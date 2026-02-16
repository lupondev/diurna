import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDefaultSite, getArticleById } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const site = await getDefaultSite(session.user.organizationId)
    if (!site) {
      return NextResponse.json({ error: 'No site found' }, { status: 404 })
    }

    if (!site.wpSiteUrl || !site.wpApiKey) {
      return NextResponse.json(
        { error: 'WordPress integration not configured. Add WP Site URL and API Key in Settings.' },
        { status: 400 }
      )
    }

    const { articleId, action } = await req.json()

    // Test connection
    if (action === 'test') {
      try {
        const wpUrl = site.wpSiteUrl.replace(/\/+$/, '')
        const res = await fetch(`${wpUrl}/wp-json/wp/v2/posts?per_page=1`, {
          headers: {
            'Authorization': `Basic ${Buffer.from(site.wpApiKey).toString('base64')}`,
          },
        })
        if (res.ok) {
          return NextResponse.json({ success: true, message: 'Connection successful' })
        }
        const text = await res.text()
        return NextResponse.json(
          { success: false, message: `WordPress returned ${res.status}: ${text.substring(0, 200)}` },
          { status: 400 }
        )
      } catch (err) {
        return NextResponse.json(
          { success: false, message: 'Could not connect to WordPress site' },
          { status: 400 }
        )
      }
    }

    // Push article
    if (!articleId) {
      return NextResponse.json({ error: 'articleId is required' }, { status: 400 })
    }

    const article = await getArticleById(articleId)
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    const wpUrl = site.wpSiteUrl.replace(/\/+$/, '')
    const contentStr = typeof article.content === 'string'
      ? article.content
      : JSON.stringify(article.content)

    const wpStatus = article.status === 'PUBLISHED' ? 'publish'
      : article.status === 'IN_REVIEW' ? 'pending'
      : 'draft'

    const wpPayload = {
      title: article.title,
      content: contentStr,
      slug: article.slug,
      status: wpStatus,
      excerpt: article.excerpt || '',
    }

    const res = await fetch(`${wpUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(site.wpApiKey).toString('base64')}`,
      },
      body: JSON.stringify(wpPayload),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `WordPress API error: ${res.status}`, details: text.substring(0, 500) },
        { status: 502 }
      )
    }

    const wpPost = await res.json()

    return NextResponse.json({
      success: true,
      wpPostId: wpPost.id,
      wpLink: wpPost.link,
      message: `Article "${article.title}" pushed to WordPress`,
    })
  } catch (error) {
    console.error('WordPress sync error:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
