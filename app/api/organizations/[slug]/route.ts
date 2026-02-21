import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultSite } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const site = await getDefaultSite()
    if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

    const org = await prisma.sportOrganization.findUnique({
      where: {
        siteId_slug: { siteId: site.id, slug },
      },
    })

    if (!org || org.deletedAt || org.status !== 'published') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(org, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' },
    })
  } catch (error) {
    console.error('Organization detail error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
