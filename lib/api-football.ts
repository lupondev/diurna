import type { LiveMatch } from '@/components/public/sportba'

const BASE = 'https://v3.football.api-sports.io'

export const LEAGUES = {
  PL: 39,
  LALIGA: 140,
  SERIEA: 135,
  BUNDESLIGA: 78,
  LIGUE1: 61,
  UCL: 2,
} as const

export const LEAGUE_IDS: number[] = Object.values(LEAGUES)

export const LEAGUE_META: Record<number, { name: string; country: string }> = {
  39: { name: 'Premier League', country: 'England' },
  140: { name: 'La Liga', country: 'Spain' },
  135: { name: 'Serie A', country: 'Italy' },
  78: { name: 'Bundesliga', country: 'Germany' },
  61: { name: 'Ligue 1', country: 'France' },
  2: { name: 'Champions League', country: 'Europe' },
}

function getCurrentSeason(): number {
  const now = new Date()
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
}

export const CURRENT_SEASON = getCurrentSeason()

/* ── API response types ── */

export interface ApiFixture {
  fixture: {
    id: number
    date: string
    timestamp: number
    status: { short: string; elapsed: number | null }
  }
  league: { id: number; name: string; logo: string; round?: string }
  teams: {
    home: { id: number; name: string; logo: string }
    away: { id: number; name: string; logo: string }
  }
  goals: { home: number | null; away: number | null }
}

export interface ApiStanding {
  rank: number
  team: { id: number; name: string; logo: string }
  points: number
  goalsDiff: number
  form: string | null
  all: {
    played: number
    win: number
    draw: number
    lose: number
    goals: { for: number; against: number }
  }
}

export interface ApiPlayer {
  player: {
    id: number
    name: string
    firstname: string
    lastname: string
    photo: string
    nationality: string
    age: number
    birth: { date: string; place: string | null; country: string | null }
    height: string | null
    weight: string | null
  }
  statistics: Array<{
    team: { id: number; name: string; logo: string }
    league: { id: number; name: string }
    games: { appearances: number | null; position: string | null; minutes: number | null }
    goals: { total: number | null; assists: number | null }
    cards: { yellow: number | null; red: number | null }
    passes: { total: number | null; accuracy: number | null }
    shots: { total: number | null; on: number | null }
  }>
}

/* ── Base fetcher ── */

async function apiFootball<T>(endpoint: string, revalidate = 60): Promise<T[]> {
  const key = process.env.API_FOOTBALL_KEY
  if (!key) {
    console.warn('[API-Football] API_FOOTBALL_KEY not set')
    return []
  }

  const res = await fetch(`${BASE}${endpoint}`, {
    headers: { 'x-apisports-key': key },
    next: { revalidate },
  })

  if (!res.ok) {
    console.error(`[API-Football] ${res.status} ${res.statusText} for ${endpoint}`)
    return []
  }

  const json = (await res.json()) as { response?: T[] }
  return json.response ?? []
}

async function apiFootballRaw<T>(endpoint: string, revalidate = 60): Promise<{ response: T[]; paging?: { current: number; total: number } }> {
  const key = process.env.API_FOOTBALL_KEY
  if (!key) return { response: [], paging: { current: 1, total: 0 } }

  const res = await fetch(`${BASE}${endpoint}`, {
    headers: { 'x-apisports-key': key },
    next: { revalidate },
  })

  if (!res.ok) return { response: [], paging: { current: 1, total: 0 } }
  return (await res.json()) as { response: T[]; paging?: { current: number; total: number } }
}

/* ── Helpers ── */

function mapStatus(short: string): 'live' | 'ft' | 'scheduled' {
  if (['1H', '2H', 'HT', 'ET', 'P', 'LIVE', 'BT'].includes(short)) return 'live'
  if (['FT', 'AET', 'PEN'].includes(short)) return 'ft'
  return 'scheduled'
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Sarajevo' })
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function dateOffsetStr(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/* ── Public API ── */

export async function getLiveMatches(): Promise<LiveMatch[]> {
  // Try live fixtures first
  let fixtures = await apiFootball<ApiFixture>('/fixtures?live=all')
  fixtures = fixtures.filter((f) => LEAGUE_IDS.includes(f.league.id))

  // Fallback to today's fixtures
  if (fixtures.length === 0) {
    const all = await apiFootball<ApiFixture>(`/fixtures?date=${todayStr()}&season=${CURRENT_SEASON}`)
    fixtures = all.filter((f) => LEAGUE_IDS.includes(f.league.id))
  }

  return fixtures.slice(0, 15).map((f) => ({
    id: f.fixture.id.toString(),
    home: f.teams.home.name,
    away: f.teams.away.name,
    homeScore: f.goals.home ?? undefined,
    awayScore: f.goals.away ?? undefined,
    status: mapStatus(f.fixture.status.short),
    minute: f.fixture.status.elapsed ?? undefined,
    time: formatTime(f.fixture.date),
  }))
}

export async function getFixturesByDate(date: string): Promise<ApiFixture[]> {
  const all = await apiFootball<ApiFixture>(`/fixtures?date=${date}&season=${CURRENT_SEASON}`)
  return all.filter((f) => LEAGUE_IDS.includes(f.league.id))
}

export async function getFixturesRange(days: number): Promise<ApiFixture[]> {
  const dates = Array.from({ length: days }, (_, i) => dateOffsetStr(i))
  const results = await Promise.all(dates.map((d) => getFixturesByDate(d)))
  return results.flat()
}

export async function getStandings(leagueId: number): Promise<ApiStanding[]> {
  const data = await apiFootball<{ league: { standings: ApiStanding[][] } }>(
    `/standings?league=${leagueId}&season=${CURRENT_SEASON}`,
    3600,
  )
  return data[0]?.league?.standings?.[0] ?? []
}

export async function searchPlayers(params: {
  league?: number
  search?: string
  page?: number
}): Promise<{ players: ApiPlayer[]; totalPages: number }> {
  const parts: string[] = []
  if (params.search && params.search.length >= 3) parts.push(`search=${encodeURIComponent(params.search)}`)
  if (params.league) parts.push(`league=${params.league}`)
  parts.push(`season=${CURRENT_SEASON}`)
  parts.push(`page=${params.page || 1}`)

  if (!params.search && !params.league) {
    parts.push(`league=${LEAGUES.PL}`)
  }

  const data = await apiFootballRaw<ApiPlayer>(`/players?${parts.join('&')}`, 300)
  return {
    players: data.response ?? [],
    totalPages: data.paging?.total ?? 0,
  }
}

export async function getPlayer(id: number): Promise<ApiPlayer | null> {
  const data = await apiFootball<ApiPlayer>(`/players?id=${id}&season=${CURRENT_SEASON}`, 300)
  return data[0] ?? null
}

export { formatTime, todayStr, dateOffsetStr, mapStatus }
