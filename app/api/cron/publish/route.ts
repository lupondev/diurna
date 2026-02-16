import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()

    const articles = await prisma.article.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
        deletedAt: null,
      },
    })

    if (articles.length === 0) {
      return NextResponse.json({ published: 0 })
    }

    const ids = articles.map((a) => a.id)

    await prisma.article.updateMany({
      where: { id: { in: ids } },
      data: {
        status: 'PUBLISHED',
        publishedAt: now,
      },
    })

    return NextResponse.json({ published: ids.length, ids })
  } catch (error) {
    console.error('Cron publish error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
