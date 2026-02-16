import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

function extractCDATA(text: string): string {
  const match = text.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
  return match ? match[1] : text
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)
  const match = xml.match(re)
  return match ? extractCDATA(match[1].trim()) : ''
}

function extractAllTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'g')
  const results: string[] = []
  let match
  while ((match = re.exec(xml)) !== null) {
    results.push(extractCDATA(match[1].trim()))
  }
  return results
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*?${attr}="([^"]*)"`)
  const match = xml.match(re)
  return match ? match[1] : ''
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const xml = await file.text()

    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    const articles: Array<{
      title: string
      slug: string
      content: string
      excerpt: string
      status: string
      publishedAt: string | null
      author: string
      categories: string[]
      tags: string[]
      featuredImage: string | null
    }> = []

    let itemMatch
    while ((itemMatch = itemRegex.exec(xml)) !== null) {
      const item = itemMatch[1]

      const postType = extractTag(item, 'wp:post_type')
      if (postType && postType !== 'post') continue

      const title = extractTag(item, 'title')
      const slug = extractTag(item, 'wp:post_name') || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const contentRaw = extractTag(item, 'content:encoded')
      const excerptRaw = extractTag(item, 'excerpt:encoded')
      const wpStatus = extractTag(item, 'wp:status')
      const pubDate = extractTag(item, 'pubDate')
      const author = extractTag(item, 'dc:creator')

      const categoryRegex = /<category\s+domain="category"[^>]*><!\[CDATA\[(.*?)\]\]><\/category>/g
      const tagRegex = /<category\s+domain="post_tag"[^>]*><!\[CDATA\[(.*?)\]\]><\/category>/g
      const categories: string[] = []
      const tags: string[] = []

      let catMatch
      while ((catMatch = categoryRegex.exec(item)) !== null) {
        categories.push(catMatch[1])
      }
      let tagMatch
      while ((tagMatch = tagRegex.exec(item)) !== null) {
        tags.push(tagMatch[1])
      }

      let featuredImage: string | null = null
      const metaRegex = /<wp:postmeta>([\s\S]*?)<\/wp:postmeta>/g
      let metaMatch
      while ((metaMatch = metaRegex.exec(item)) !== null) {
        const metaKey = extractTag(metaMatch[1], 'wp:meta_key')
        if (metaKey === '_thumbnail_id') {
          featuredImage = extractTag(metaMatch[1], 'wp:meta_value')
          break
        }
      }

      let status = 'DRAFT'
      if (wpStatus === 'publish') status = 'PUBLISHED'
      else if (wpStatus === 'pending') status = 'IN_REVIEW'
      else if (wpStatus === 'private') status = 'ARCHIVED'

      articles.push({
        title,
        slug,
        content: contentRaw,
        excerpt: excerptRaw,
        status,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : null,
        author,
        categories,
        tags,
        featuredImage,
      })
    }

    const attachmentMap = new Map<string, string>()
    const attachRegex = /<item>([\s\S]*?)<\/item>/g
    let attachMatch
    while ((attachMatch = attachRegex.exec(xml)) !== null) {
      const item = attachMatch[1]
      const postType = extractTag(item, 'wp:post_type')
      if (postType === 'attachment') {
        const postId = extractTag(item, 'wp:post_id')
        const url = extractTag(item, 'wp:attachment_url') || extractTag(item, 'guid')
        if (postId && url) attachmentMap.set(postId, url)
      }
    }

    articles.forEach((a) => {
      if (a.featuredImage && attachmentMap.has(a.featuredImage)) {
        a.featuredImage = attachmentMap.get(a.featuredImage) || null
      } else if (a.featuredImage && !/^https?:\/\//.test(a.featuredImage)) {
        a.featuredImage = null
      }
    })

    return NextResponse.json({ articles, total: articles.length })
  } catch (error) {
    console.error('WordPress XML parse error:', error)
    return NextResponse.json({ error: 'Failed to parse WordPress XML' }, { status: 500 })
  }
}
