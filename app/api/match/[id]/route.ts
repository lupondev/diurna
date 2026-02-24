import { NextRequest, NextResponse } from 'next/server'
import { cachedFetch, CACHE_TTL } from '@/lib/api-football-cache'

const BASE = 'https://v3.football.api-sports.io'

async function apiFetch<T>(endpoint: string, ttl: number): Promise<T[]> {
  const key = process.env.API_FOOTBALL_KEY
  if (!key) return []
  const cacheKey = `match:${endpoint}`
  const { data } = await cachedFetch<T[]>(
    cacheKey,
    async () => {
      const res = await fetch(`${BASE}${endpoint}`, {
        headers: { 'x-apisports-key': key },
      })
      if (!res.ok) return []
      const json = (await res.json()) as { response?: T[] }
      return json.response ?? []
    },
    ttl,
  )
  return data
}

function mapStatus(short: string): 'live' | 'ft' | 'scheduled' {
  if (['1H', '2H', 'HT', 'ET', 'P', 'LIVE', 'BT'].includes(short)) return 'live'
  if (['FT', 'AET', 'PEN'].includes(short)) return 'ft'
  return 'scheduled'
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const fixtureId = Number(id)
  if (!fixtureId || isNaN(fixtureId)) {
    return NextResponse.json({ error: 'Invalid fixture ID' }, { status: 400 })
  }

  const fixtures = await apiFetch<any>(`/fixtures?id=${fixtureId}`, CACHE_TTL.FIXTURES_TODAY)
  const fixture = fixtures[0]
  if (!fixture) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  const status = mapStatus(fixture.fixture.status.short)
  const ttl = status === 'live' ? CACHE_TTL.LIVE : CACHE_TTL.FIXTURES_TODAY

  const homeTeamId = fixture.teams.home.id
  const awayTeamId = fixture.teams.away.id

  const [eventsRaw, lineupsRaw, statsRaw, h2hRaw] = await Promise.all([
    apiFetch<any>(`/fixtures/events?fixture=${fixtureId}`, ttl),
    apiFetch<any>(`/fixtures/lineups?fixture=${fixtureId}`, ttl),
    apiFetch<any>(`/fixtures/statistics?fixture=${fixtureId}`, ttl),
    apiFetch<any>(`/fixtures/headtohead?h2h=${homeTeamId}-${awayTeamId}&last=5`, CACHE_TTL.FIXTURES_TODAY),
  ])

  const events = eventsRaw.map((e: any) => ({
    min: e.time?.elapsed ?? 0,
    extra: e.time?.extra ?? null,
    type: mapEventType(e.type, e.detail),
    player: e.player?.name ?? '',
    detail: formatEventDetail(e.type, e.detail, e.assist?.name),
    team: e.team?.id === homeTeamId ? 'home' : 'away',
  }))

  const homeLineup = lineupsRaw.find((l: any) => l.team?.id === homeTeamId)
  const awayLineup = lineupsRaw.find((l: any) => l.team?.id === awayTeamId)

  const lineups = {
    home: homeLineup ? formatLineup(homeLineup) : null,
    away: awayLineup ? formatLineup(awayLineup) : null,
  }

  const homeStats = statsRaw.find((s: any) => s.team?.id === homeTeamId)
  const awayStats = statsRaw.find((s: any) => s.team?.id === awayTeamId)
  const statistics = formatStatistics(homeStats, awayStats)

  const h2h = h2hRaw.map((m: any) => ({
    date: new Date(m.fixture.date).toLocaleDateString('bs-BA', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    comp: m.league?.name ?? '',
    home: m.teams.home.name,
    away: m.teams.away.name,
    homeScore: m.goals.home ?? 0,
    awayScore: m.goals.away ?? 0,
    homeId: m.teams.home.id,
    awayId: m.teams.away.id,
  }))

  const match = {
    id: fixtureId,
    status,
    statusShort: fixture.fixture.status.short,
    elapsed: fixture.fixture.status.elapsed,
    date: fixture.fixture.date,
    venue: fixture.fixture.venue?.name ?? null,
    city: fixture.fixture.venue?.city ?? null,
    referee: fixture.fixture.referee ?? null,
    league: {
      id: fixture.league.id,
      name: fixture.league.name,
      round: fixture.league.round ?? null,
      logo: fixture.league.logo ?? null,
      country: fixture.league.country ?? null,
    },
    home: {
      id: homeTeamId,
      name: fixture.teams.home.name,
      logo: fixture.teams.home.logo,
      winner: fixture.teams.home.winner,
    },
    away: {
      id: awayTeamId,
      name: fixture.teams.away.name,
      logo: fixture.teams.away.logo,
      winner: fixture.teams.away.winner,
    },
    goals: {
      home: fixture.goals.home,
      away: fixture.goals.away,
    },
    score: fixture.score ?? null,
    events,
    lineups,
    statistics,
    h2h,
  }

  return NextResponse.json(match, {
    headers: {
      'Cache-Control': status === 'live'
        ? 'public, s-maxage=30, stale-while-revalidate=15'
        : 'public, s-maxage=300, stale-while-revalidate=60',
    },
  })
}

function mapEventType(type: string, detail: string): string {
  const t = type?.toLowerCase() ?? ''
  const d = detail?.toLowerCase() ?? ''
  if (t === 'goal' && d === 'own goal') return 'goal-og'
  if (t === 'goal' && d.includes('missed')) return 'penalty-missed'
  if (t === 'goal') return 'goal'
  if (t === 'card' && d === 'yellow card') return 'yellow'
  if (t === 'card' && d === 'second yellow card') return 'yellow2'
  if (t === 'card' && d === 'red card') return 'red'
  if (t === 'subst') return 'sub'
  if (t === 'var' || d.includes('cancelled') || d.includes('disallowed')) return 'var'
  return t
}

function formatEventDetail(type: string, detail: string, assist: string | null): string {
  const t = type?.toLowerCase() ?? ''
  const d = detail?.toLowerCase() ?? ''
  if (t === 'goal' && d === 'penalty') return 'Penal'
  if (t === 'goal' && d === 'own goal') return 'Autogol'
  if (t === 'goal' && assist) return `Asist: ${assist}`
  if (t === 'goal') return 'Gol'
  if (t === 'subst') return assist ? `Za: ${assist}` : ''
  if (t === 'card') return 'Faul'
  if (d.includes('cancelled') || d.includes('disallowed')) return detail ?? ''
  return detail ?? ''
}

function formatLineup(lineup: any) {
  return {
    formation: lineup.formation ?? '',
    startXI: (lineup.startXI ?? []).map((p: any) => ({
      id: p.player?.id,
      name: p.player?.name ?? '',
      number: p.player?.number ?? 0,
      pos: p.player?.pos ?? '',
      grid: p.player?.grid ?? null,
    })),
    substitutes: (lineup.substitutes ?? []).map((p: any) => ({
      id: p.player?.id,
      name: p.player?.name ?? '',
      number: p.player?.number ?? 0,
      pos: p.player?.pos ?? '',
    })),
    coach: lineup.coach ? { name: lineup.coach.name, photo: lineup.coach.photo } : null,
  }
}

function formatStatistics(home: any, away: any) {
  if (!home || !away) return []

  const statMap: Record<string, string> = {
    'Ball Possession': 'Posjed lopte',
    'Total Shots': 'Ukupno udaraca',
    'Shots on Goal': 'Udarci u okvir',
    'Shots off Goal': 'Udarci van okvira',
    'Corner Kicks': 'Korneri',
    'Fouls': 'Prekršaji',
    'Offsides': 'Ofsajdi',
    'Yellow Cards': 'Žuti kartoni',
    'Red Cards': 'Crveni kartoni',
    'Total passes': 'Dodavanja',
    'Passes %': 'Točnost dodavanja',
    'Goalkeeper Saves': 'Spašavanja',
    'expected_goals': 'xG',
  }

  const homeMap = new Map<string, any>()
  const awayMap = new Map<string, any>()
  for (const s of home.statistics ?? []) homeMap.set(s.type, s.value)
  for (const s of away.statistics ?? []) awayMap.set(s.type, s.value)

  const stats: { label: string; home: number; away: number; pct: boolean }[] = []

  for (const [apiKey, bsLabel] of Object.entries(statMap)) {
    let hv = homeMap.get(apiKey)
    let av = awayMap.get(apiKey)
    if (hv === undefined && av === undefined) continue

    const isPct = typeof hv === 'string' && hv.includes('%')
    hv = parseStatValue(hv)
    av = parseStatValue(av)

    stats.push({ label: bsLabel, home: hv, away: av, pct: isPct })
  }

  return stats
}

function parseStatValue(val: any): number {
  if (val === null || val === undefined) return 0
  if (typeof val === 'number') return val
  const s = String(val).replace('%', '')
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}
