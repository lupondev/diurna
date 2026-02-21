import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { systemLog } from '@/lib/system-log'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId || !['ADMIN', 'OWNER'].includes((session.user as { role?: string }).role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { action } = await req.json() as { action: string }

  switch (action) {
    case 'run-autopilot': {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
      const res = await fetch(`${baseUrl}/api/cron/autopilot?force=true`, {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
        signal: AbortSignal.timeout(55000),
      })
      const data = await res.json()
      await systemLog('info', 'system', 'Manual autopilot trigger from health dashboard', { result: data })
      return NextResponse.json({ result: data })
    }

    case 'backfill-images': {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
      const res = await fetch(`${baseUrl}/api/admin/backfill-images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
        signal: AbortSignal.timeout(55000),
      })
      const data = await res.json()
      await systemLog('info', 'unsplash', 'Image backfill triggered from health dashboard', { result: data })
      return NextResponse.json({ result: data })
    }

    case 'clear-duplicates': {
      const site = await prisma.site.findFirst({
        where: { organizationId: session.user.organizationId },
      })
      if (!site) return NextResponse.json({ result: { deleted: 0 } })

      const duplicates = await prisma.$queryRaw<{ slug: string; cnt: bigint }[]>`
        SELECT slug, COUNT(*) as cnt FROM "Article"
        WHERE "siteId" = ${site.id} AND "deletedAt" IS NULL
        GROUP BY slug HAVING COUNT(*) > 1
      `

      let deleted = 0
      for (const dup of duplicates) {
        const articles = await prisma.article.findMany({
          where: { siteId: site.id, slug: dup.slug, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        })
        // Keep the newest, soft-delete the rest
        for (const article of articles.slice(1)) {
          await prisma.article.update({
            where: { id: article.id },
            data: { deletedAt: new Date() },
          })
          deleted++
        }
      }

      await systemLog('info', 'system', `Cleared ${deleted} duplicate articles`, { slugs: duplicates.map(d => d.slug) })
      return NextResponse.json({ result: { deleted, duplicateSlugs: duplicates.map(d => d.slug) } })
    }

    case 'purge-logs': {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const result = await prisma.systemLog.deleteMany({
        where: { createdAt: { lt: thirtyDaysAgo } },
      })
      return NextResponse.json({ result: { deleted: result.count } })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
