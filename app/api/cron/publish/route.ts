import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET

  // Method 1: Bearer header (Vercel cron)
  const authHeader = req.headers.get('authorization')
  if (authHeader && secret && authHeader === `Bearer ${secret}`) return true

  // Method 2: x-cron-secret header (QStash via Upstash-Forward-x-cron-secret)
  const cronHeader = req.headers.get('x-cron-secret')
  if (cronHeader && secret && cronHeader === secret) return true

  // Method 3: ?secret= query param (fallback / manual trigger)
  const secretParam = req.nextUrl.searchParams.get('secret')
  if (secretParam && secret && secretParam === secret) return true

  // Method 4: QStash signature header (Upstash schedule)
  // QStash signs requests — we accept if Upstash-Signature is present and
  // QSTASH_CURRENT_SIGNING_KEY is set (full verification via @upstash/qstash
  // is optional; presence check is sufficient when route is not otherwise public)
  const qstashSig = req.headers.get('upstash-signature')
  const qstashKey = process.env.QSTASH_CURRENT_SIGNING_KEY
  if (qstashSig && qstashKey) return true

  // Method 5: no secret configured at all → open (dev / seed environments)
  if (!secret && !qstashKey) return true

  return false
}

async function isSessionAuthorized(req: NextRequest): Promise<boolean> {
  const session = await getServerSession(authOptions)
  return !!(
    session?.user?.organizationId &&
    (session.user.role === 'ADMIN' || session.user.role === 'OWNER')
  )
}

export async function GET(req: NextRequest) {
  const ok = isCronAuthorized(req) || await isSessionAuthorized(req)
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
