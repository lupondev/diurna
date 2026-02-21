import { NextRequest, NextResponse } from 'next/server'
import { getStandings, CURRENT_SEASON } from '@/lib/api-football'

const ALLOWED_LEAGUES = [39, 140, 135, 78]

export async function GET(req: NextRequest) {
  const leagueParam = req.nextUrl.searchParams.get('league')
  const leagueId = leagueParam ? parseInt(leagueParam, 10) : 39

  if (!ALLOWED_LEAGUES.includes(leagueId)) {
    return NextResponse.json({ clubs: [] })
  }

  try {
    const standings = await getStandings(leagueId)

    const clubs = standings.map((s) => ({
      id: s.team.id,
      name: s.team.name,
      logo: s.team.logo,
      rank: s.rank,
    }))

    return NextResponse.json({ clubs, league: leagueId, season: CURRENT_SEASON }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' },
    })
  } catch (e) {
    console.error('[Clubs API]', e instanceof Error ? e.message : e)
    return NextResponse.json({ clubs: [] })
  }
}
