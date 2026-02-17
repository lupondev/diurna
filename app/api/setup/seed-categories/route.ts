import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DEFAULT_CATEGORIES = [
  { name: 'News', slug: 'news', icon: '📰', order: 1 },
  { name: 'Transfers', slug: 'transfers', icon: '🔄', order: 2 },
  { name: 'Matches', slug: 'matches', icon: '⚽', order: 3 },
  { name: 'Injuries', slug: 'injuries', icon: '🏥', order: 4 },
  { name: 'Video', slug: 'video', icon: '📹', order: 5 },
]

export async function POST() {
  try {
    const site = await prisma.site.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
    })

    if (!site) {
      return NextResponse.json({ error: 'No site found' }, { status: 404 })
    }

    const results = await Promise.all(
      DEFAULT_CATEGORIES.map((cat) =>
        prisma.category.upsert({
          where: { siteId_slug: { siteId: site.id, slug: cat.slug } },
          update: { name: cat.name, icon: cat.icon, order: cat.order },
          create: { siteId: site.id, name: cat.name, slug: cat.slug, icon: cat.icon, order: cat.order },
        })
      )
    )

    return NextResponse.json({ categories: results, siteId: site.id })
  } catch (error) {
    console.error('Seed categories error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  return POST()
}
