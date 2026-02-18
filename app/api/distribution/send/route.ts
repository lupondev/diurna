import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendToChannel } from '@/lib/distribution'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { articleId, channelId } = await req.json() as { articleId?: string; channelId?: string }
    if (!articleId || !channelId) {
      return NextResponse.json({ error: 'articleId and channelId required' }, { status: 400 })
    }

    const article = await prisma.article.findFirst({
      where: { id: articleId, deletedAt: null },
      include: { site: true, category: true },
    })
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    const channel = await prisma.distributionChannel.findFirst({
      where: { id: channelId, isActive: true },
    })
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const result = await sendToChannel(
      {
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content: article.content,
        siteId: article.siteId,
        site: { name: article.site.name, slug: article.site.slug, domain: article.site.domain },
        category: article.category ? { slug: article.category.slug } : null,
      },
      channel.platform
    )

    // Update distribution status on the article
    const current = (article.distributionStatus as Record<string, string>) || {}
    current[channel.platform] = result.success ? 'sent' : 'failed'
    await prisma.article.update({
      where: { id: articleId },
      data: { distributionStatus: current },
    })

    return NextResponse.json({ success: result.success, postUrl: result.postUrl, error: result.error })
  } catch (error) {
    console.error('Distribution send error:', error)
    return NextResponse.json({ error: 'Send failed' }, { status: 500 })
  }
}
