import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const primarySite = await prisma.site.findFirst({
      where: { domain: { contains: 'todayfootballmatch' }, deletedAt: null },
    })

    if (!primarySite) {
      return NextResponse.json({ error: 'Primary site not found' }, { status: 404 })
    }

    const sources = await prisma.feedSource.findMany()
    const fixes: { id: string; name: string; url: string; updates: Record<string, unknown> }[] = []

    for (const source of sources) {
      const updates: Record<string, unknown> = {}

      if (source.siteId !== primarySite.id) {
        updates.siteId = primarySite.id
      }

      let url = source.url
      if (url.includes(',')) {
        url = url.replace(/,/g, '.')
        updates.url = url
      }
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`
        updates.url = url
      }

      if (Object.keys(updates).length > 0) {
        await prisma.feedSource.update({
          where: { id: source.id },
          data: updates,
        })
        fixes.push({ id: source.id, name: source.name, url: source.url, updates })
      }
    }

    return NextResponse.json({
      message: `Fixed ${fixes.length} sources`,
      primarySiteId: primarySite.id,
      fixes,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fix sources' }, { status: 500 })
  }
}
