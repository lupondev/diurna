import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const API_KEY = process.env.FOOTBALL_API_KEY
const BASE = 'https://v3.football.api-sports.io'

let cache: { data: unknown; ts: number } | null = null
const CACHE_TTL = 5 * 60 * 1000

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return NextResponse.json(cache.data)
    }

    if (!API_KEY) {
      return NextResponse.json({ fixtures: [], live: [], source: 'no-key', fetchedAt: new Date().toISOString() })
    }

    const headers = { 'x-apisports-key': API_KEY }

    const [upcomingRes, liveRes] = await Promise.allSettled([
      fetch(`${BASE}/fixtures?next=10`, { headers }),
      fetch(`${BASE}/fixtures?live=all`, { headers }),
    ])

    const upcoming = upcomingRes.status === 'fulfilled' && upcomingRes.value.ok
      ? await upcomingRes.value.json() as { response: any[] }
      : { response: [] as any[] }

    const live = liveRes.status === 'fulfilled' && liveRes.value.ok
      ? await liveRes.value.json() as { response: any[] }
      : { response: [] as any[] }

    type FixtureResponse = {
      fixture: { id: number; date: string; status: { short: string; elapsed: number | null } }
      league: { name: string; country: string; logo: string }
      teams: { home: { name: string; logo: string }; away: { name: string; logo: string } }
      goals: { home: number | null; away: number | null }
    }

    const fixtures = (upcoming.response || []).map((f: FixtureResponse) => ({
      id: f.fixture.id,
      date: f.fixture.date,
      status: f.fixture.status.short,
      elapsed: f.fixture.status.elapsed,
      league: f.league.name,
      country: f.league.country,
      leagueLogo: f.league.logo,
      homeTeam: f.teams.home.name,
      homeLogo: f.teams.home.logo,
      awayTeam: f.teams.away.name,
      awayLogo: f.teams.away.logo,
      homeGoals: f.goals.home,
      awayGoals: f.goals.away,
    }))

    const liveMatches = (live.response || []).map((f: FixtureResponse) => ({
      id: f.fixture.id,
      date: f.fixture.date,
      status: f.fixture.status.short,
      elapsed: f.fixture.status.elapsed,
      league: f.league.name,
      homeTeam: f.teams.home.name,
      awayTeam: f.teams.away.name,
      homeGoals: f.goals.home,
      awayGoals: f.goals.away,
    }))

    const result = { fixtures, live: liveMatches, source: 'api-football', fetchedAt: new Date().toISOString() }
    cache = { data: result, ts: Date.now() }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Fixtures error:', error)
    return NextResponse.json({ fixtures: [], live: [], source: 'error', fetchedAt: new Date().toISOString() })
  }
}

