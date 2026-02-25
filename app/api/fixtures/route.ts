import { NextRequest, NextResponse } from 'next/server'
import { getFixturesByDate } from '@/lib/api-football'

const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'P', 'LIVE', 'BT']
const FT_STATUSES = ['FT', 'AET', 'PEN']

export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get('date')
    const dateStr = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10)
    const fixtures = await getFixturesByDate(dateStr)

    const mapped = fixtures.slice(0, 30).map((f) => {
      const status = f.fixture.status.short
      const isLive = LIVE_STATUSES.includes(status)
      const isFT = FT_STATUSES.includes(status)

      return {
        id: f.fixture.id,
        homeTeam: f.teams.home.name,
        awayTeam: f.teams.away.name,
        homeLogo: f.teams.home.logo,
        awayLogo: f.teams.away.logo,
        homeScore: f.goals.home,
        awayScore: f.goals.away,
        time: new Date(f.fixture.date).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Sarajevo',
        }),
        elapsed: f.fixture.status.elapsed,
        status: isLive ? 'live' : isFT ? 'ft' : 'scheduled',
        league: f.league.name,
      }
    })

    return NextResponse.json({ fixtures: mapped }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
    })
  } catch (e) {
    console.error('[Fixtures API]', e instanceof Error ? e.message : e)
    return NextResponse.json({ fixtures: [] })
  }
}
