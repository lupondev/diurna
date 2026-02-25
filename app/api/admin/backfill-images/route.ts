import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchUnsplashImage } from '@/lib/autopilot'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = req.headers.get('x-org-id')
  if (!orgId) {
    return NextResponse.json({ error: 'x-org-id header required for tenant isolation' }, { status: 400 })
  }

  const articles = await prisma.article.findMany({
    where: {
      site: { organizationId: orgId },
      status: 'PUBLISHED',
      deletedAt: null,
      featuredImage: null,
    },
    select: { id: true, title: true },
    orderBy: { publishedAt: 'desc' },
    take: 20,
  })

  let updated = 0
  const errors: string[] = []

  for (const article of articles) {
    try {
      const imageUrl = await fetchUnsplashImage(article.title)
      if (imageUrl) {
        await prisma.article.update({
          where: { id: article.id },
          data: { featuredImage: imageUrl },
        })
        updated++
      }
    } catch (e) {
      errors.push(`${article.id}: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  return NextResponse.json({
    total: articles.length,
    updated,
    errors: errors.length > 0 ? errors : undefined,
  })
}
