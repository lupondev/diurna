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
      // Return mock data when no API key
      const mockFixtures = generateMockFixtures()
      return NextResponse.json({ fixtures: mockFixtures, live: [], source: 'mock', fetchedAt: new Date().toISOString() })
    }

    const headers = { 'x-apisports-key': API_KEY }

    // Fetch upcoming fixtures + live
    const [upcomingRes, liveRes] = await Promise.allSettled([
      fetch(`${BASE}/fixtures?next=10`, { headers }),
      fetch(`${BASE}/fixtures?live=all`, { headers }),
    ])

    const upcoming = upcomingRes.status === 'fulfilled' && upcomingRes.value.ok
      ? await upcomingRes.value.json()
      : { response: [] }

    const live = liveRes.status === 'fulfilled' && liveRes.value.ok
      ? await liveRes.value.json()
      : { response: [] }

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
    return NextResponse.json({ error: 'Failed to fetch fixtures' }, { status: 500 })
  }
}

function generateMockFixtures() {
  const teams = [
    ['Arsenal', 'Chelsea'], ['Manchester City', 'Liverpool'],
    ['Barcelona', 'Real Madrid'], ['Bayern Munich', 'Dortmund'],
    ['PSG', 'Marseille'], ['Juventus', 'AC Milan'],
    ['Inter Milan', 'Napoli'], ['Tottenham', 'Manchester United'],
  ]
  const leagues = ['Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1']

  return teams.map(([home, away], i) => {
    const date = new Date()
    date.setDate(date.getDate() + i + 1)
    return {
      id: 1000 + i,
      date: date.toISOString(),
      status: 'NS',
      elapsed: null,
      league: leagues[i % leagues.length],
      country: 'England',
      homeTeam: home,
      awayTeam: away,
      homeGoals: null,
      awayGoals: null,
    }
  })
}
