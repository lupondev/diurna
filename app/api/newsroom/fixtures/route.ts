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
      return NextResponse.json({ fixtures: generateMockFixtures(), live: generateMockLive(), source: 'mock', fetchedAt: new Date().toISOString() })
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
    return NextResponse.json({ fixtures: generateMockFixtures(), live: generateMockLive(), source: 'mock-fallback', fetchedAt: new Date().toISOString() })
  }
}

function generateMockFixtures() {
  const matches = [
    { home: 'Arsenal', away: 'Chelsea', league: 'Premier League', daysAhead: 1, hour: 15 },
    { home: 'Manchester City', away: 'Liverpool', league: 'Premier League', daysAhead: 2, hour: 17 },
    { home: 'Newcastle', away: 'Tottenham', league: 'Premier League', daysAhead: 3, hour: 15 },
    { home: 'Aston Villa', away: 'Manchester United', league: 'Premier League', daysAhead: 4, hour: 20 },
    { home: 'Brighton', away: 'West Ham', league: 'Premier League', daysAhead: 5, hour: 15 },
    { home: 'Barcelona', away: 'Real Madrid', league: 'La Liga', daysAhead: 2, hour: 21 },
    { home: 'Bayern Munich', away: 'Dortmund', league: 'Bundesliga', daysAhead: 3, hour: 18 },
    { home: 'PSG', away: 'Marseille', league: 'Ligue 1', daysAhead: 4, hour: 21 },
  ]
  return matches.map((m, i) => {
    const date = new Date()
    date.setDate(date.getDate() + m.daysAhead)
    date.setHours(m.hour, 0, 0, 0)
    return {
      id: 1000 + i, date: date.toISOString(), status: 'NS', elapsed: null,
      league: m.league, country: 'Europe', homeTeam: m.home, awayTeam: m.away,
      homeGoals: null, awayGoals: null,
    }
  })
}

function generateMockLive() {
  return [
    {
      id: 2001, elapsed: 67, league: 'Champions League',
      homeTeam: 'Real Madrid', awayTeam: 'Manchester City',
      homeGoals: 2, awayGoals: 1, status: '2H',
      events: [
        { minute: 12, type: 'goal', detail: 'Vinicius Jr. scores for Real Madrid', team: 'Real Madrid' },
        { minute: 34, type: 'goal', detail: 'Haaland equalizes', team: 'Manchester City' },
        { minute: 58, type: 'goal', detail: 'Bellingham header! Real Madrid lead!', team: 'Real Madrid' },
        { minute: 61, type: 'yellow', detail: 'Yellow card for Rodri', team: 'Manchester City' },
      ],
    },
    {
      id: 2002, elapsed: 38, league: 'Premier League',
      homeTeam: 'Arsenal', awayTeam: 'Liverpool',
      homeGoals: 1, awayGoals: 1, status: '1H',
      events: [
        { minute: 15, type: 'goal', detail: 'Saka curls one in from the edge of the box', team: 'Arsenal' },
        { minute: 29, type: 'goal', detail: 'Salah equalizes with a clinical finish', team: 'Liverpool' },
        { minute: 33, type: 'yellow', detail: 'Yellow card for Rice', team: 'Arsenal' },
      ],
    },
    {
      id: 2003, elapsed: 72, league: 'La Liga',
      homeTeam: 'Barcelona', awayTeam: 'Atletico Madrid',
      homeGoals: 3, awayGoals: 0, status: '2H',
      events: [
        { minute: 8, type: 'goal', detail: 'Lamine Yamal opens the scoring', team: 'Barcelona' },
        { minute: 27, type: 'goal', detail: 'Lewandowski doubles the lead from the penalty spot', team: 'Barcelona' },
        { minute: 41, type: 'red', detail: 'Red card for Savic — violent conduct', team: 'Atletico Madrid' },
        { minute: 55, type: 'goal', detail: 'Pedri makes it three with a tap-in', team: 'Barcelona' },
        { minute: 68, type: 'yellow', detail: 'Yellow card for Gavi', team: 'Barcelona' },
      ],
    },
  ]
}
