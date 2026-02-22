import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function authenticate(
  req: NextRequest
): Promise<boolean> {
  // Method 1: Bearer token header
  const authHeader = req.headers.get('authorization')
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true

  // Method 2: Query param — for cron-job.org free plan
  const secretParam = req.nextUrl.searchParams.get('secret')
  if (secretParam && secretParam === process.env.CRON_SECRET) return true

  // Method 3: Session cookie (manual trigger from admin UI)
  const session = await getServerSession(authOptions)
  if (
    session?.user?.organizationId &&
    (session.user.role === 'ADMIN' || session.user.role === 'OWNER')
  ) return true

  return false
}

export async function GET(req: NextRequest) {
  const ok = await authenticate(req)
  if (!ok) {
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
      return NextResponse.json({ published: 0, message: 'No scheduled articles due' })
    }

    const ids = articles.map((a) => a.id)

    await prisma.article.updateMany({
      where: { id: { in: ids } },
      data: {
        status: 'PUBLISHED',
        publishedAt: now,
      },
    })

    // Revalidate public site so articles appear immediately
    try {
      revalidatePath('/', 'layout')
    } catch {
      // non-fatal
    }

    return NextResponse.json({
      published: ids.length,
      ids,
      titles: articles.map(a => a.title),
    })
  } catch (error) {
    console.error('Cron publish error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
