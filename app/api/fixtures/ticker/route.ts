import { NextResponse } from 'next/server'
import { getFixturesByDate, todayStr, dateOffsetStr } from '@/lib/api-football'

const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'P', 'LIVE', 'BT']
const FT_STATUSES = ['FT', 'AET', 'PEN']

export async function GET() {
  try {
    let fixtures = await getFixturesByDate(todayStr())

    // If fewer than 3 today, also fetch tomorrow
    if (fixtures.length < 3) {
      const tomorrow = await getFixturesByDate(dateOffsetStr(1))
      fixtures = [...fixtures, ...tomorrow]
    }

    const mapped = fixtures.slice(0, 20).map((f) => {
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

    return NextResponse.json({ fixtures: mapped })
  } catch (e) {
    console.error('[Ticker API]', e instanceof Error ? e.message : e)
    return NextResponse.json({ fixtures: [] })
  }
}
