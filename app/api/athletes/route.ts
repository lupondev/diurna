import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultSite } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const site = await getDefaultSite()
    if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

    const { searchParams } = req.nextUrl
    const sport = searchParams.get('sport')
    const status = searchParams.get('status') || 'published'
    const take = Math.min(parseInt(searchParams.get('take') || '100'), 200)
    const skip = parseInt(searchParams.get('skip') || '0')
    const search = searchParams.get('search')

    const athletes = await prisma.athlete.findMany({
      where: {
        siteId: site.id,
        status,
        deletedAt: null,
        ...(sport && { sport }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { nickname: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        sport: true,
        position: true,
        legendRank: true,
        isGoat: true,
        photo: true,
        nationality: true,
        careerStart: true,
        careerEnd: true,
        totalApps: true,
        totalGoals: true,
        intApps: true,
        intGoals: true,
        nickname: true,
      },
      orderBy: [{ legendRank: 'asc' }],
      take,
      skip,
    })

    return NextResponse.json(athletes, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    })
  } catch (error) {
    console.error('Athletes list error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
