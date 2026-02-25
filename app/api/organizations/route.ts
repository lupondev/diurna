import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultSite } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    let organizationId: string | undefined
    const orgSlug = req.headers.get('x-org-slug')
    if (orgSlug) {
      const org = await prisma.organization.findUnique({
        where: { slug: orgSlug },
        select: { id: true },
      })
      organizationId = org?.id ?? undefined
    }
    const site = await getDefaultSite(organizationId)
    if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

    const { searchParams } = req.nextUrl
    const sport = searchParams.get('sport')
    const type = searchParams.get('type')
    const level = searchParams.get('level')
    const entity = searchParams.get('entity')
    const search = searchParams.get('search')
    const take = Math.min(parseInt(searchParams.get('take') || '100'), 200)
    const skip = parseInt(searchParams.get('skip') || '0')

    const orgs = await prisma.sportOrganization.findMany({
      where: {
        siteId: site.id,
        status: 'published',
        deletedAt: null,
        ...(sport && { sport }),
        ...(type && { type }),
        ...(level && { level }),
        ...(entity && { entity }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { nameShort: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        id: true,
        name: true,
        nameShort: true,
        slug: true,
        type: true,
        sport: true,
        level: true,
        entity: true,
        city: true,
        founded: true,
        logo: true,
        stats: true,
        featured: true,
      },
      orderBy: [{ featured: 'desc' }, { name: 'asc' }],
      take,
      skip,
    })

    return NextResponse.json(orgs, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' },
    })
  } catch (error) {
    console.error('Organizations list error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
