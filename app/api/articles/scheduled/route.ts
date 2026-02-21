import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const site = await prisma.site.findFirst({
    where: { organizationId: session.user.organizationId },
  })

  if (!site) {
    return NextResponse.json({ articles: [], total: 0 })
  }

  const now = new Date()

  const articles = await prisma.article.findMany({
    where: {
      siteId: site.id,
      status: 'SCHEDULED',
      scheduledAt: { gte: now },
    },
    orderBy: { scheduledAt: 'asc' },
    select: {
      id: true,
      title: true,
      slug: true,
      scheduledAt: true,
      aiGenerated: true,
      category: { select: { name: true, slug: true } },
    },
  })

  return NextResponse.json({
    articles,
    total: articles.length,
  })
}
