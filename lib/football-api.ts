const API_HOST = 'v3.football.api-sports.io'
const API_KEY = process.env.FOOTBALL_API_KEY || ''
const CACHE_TTL = 5 * 60 * 1000
const MAX_CACHE_SIZE = 100

type CacheEntry = { data: unknown; ts: number }
const cache = new Map<string, CacheEntry>()

function evictStaleEntries() {
  const now = Date.now()
  const keysToDelete: string[] = []
  cache.forEach((entry, key) => {
    if (now - entry.ts >= CACHE_TTL) {
      keysToDelete.push(key)
    }
  })
  keysToDelete.forEach((key) => cache.delete(key))

  if (cache.size > MAX_CACHE_SIZE) {
    const entries: Array<[string, CacheEntry]> = []
    cache.forEach((entry, key) => entries.push([key, entry]))
    entries.sort((a, b) => a[1].ts - b[1].ts)
    const removeCount = cache.size - MAX_CACHE_SIZE
    for (let i = 0; i < removeCount; i++) {
      cache.delete(entries[i][0])
    }
  }
}

async function apiFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams(params).toString()
  const url = `https://${API_HOST}/${endpoint}${qs ? `?${qs}` : ''}`
  const cacheKey = url

  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data as T
  }

  const res = await fetch(url, {
    headers: { 'x-apisports-key': API_KEY },
    next: { revalidate: 300 },
  })

  if (!res.ok) {
    throw new Error(`Football API error: ${res.status} ${res.statusText}`)
  }

  const json = await res.json() as T
  evictStaleEntries()
  cache.set(cacheKey, { data: json, ts: Date.now() })
  return json
}

export type ApiResponse<T> = {
  get: string
  parameters: Record<string, string>
  errors: unknown[]
  results: number
  paging: { current: number; total: number }
  response: T[]
}

export type FixtureResponse = {
  fixture: {
    id: number
    referee: string | null
    timezone: string
    date: string
    timestamp: number
    status: {
      long: string
      short: string
      elapsed: number | null
    }
  }
  league: {
    id: number
    name: string
    country: string
    logo: string
    flag: string
    season: number
    round: string
  }
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null }
    away: { id: number; name: string; logo: string; winner: boolean | null }
  }
  goals: {
    home: number | null
    away: number | null
  }
  score: {
    halftime: { home: number | null; away: number | null }
    fulltime: { home: number | null; away: number | null }
  }
}

export type StandingTeam = {
  rank: number
  team: { id: number; name: string; logo: string }
  points: number
  goalsDiff: number
  group: string
  form: string
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } }
}

export type StandingsResponse = {
  league: {
    id: number
    name: string
    country: string
    logo: string
    season: number
    standings: StandingTeam[][]
  }
}

export type H2HResponse = FixtureResponse

export async function getTodayMatches() {
  const today = new Date().toISOString().split('T')[0]
  return apiFetch<ApiResponse<FixtureResponse>>('fixtures', { date: today })
}

export async function getLiveScores(leagueId?: number) {
  const params: Record<string, string> = { live: 'all' }
  if (leagueId) params.league = String(leagueId)
  return apiFetch<ApiResponse<FixtureResponse>>('fixtures', params)
}

export async function getLeagueStandings(leagueId: number, season?: number) {
  const s = season || new Date().getFullYear()
  return apiFetch<ApiResponse<StandingsResponse>>('standings', {
    league: String(leagueId),
    season: String(s),
  })
}

export async function getHeadToHead(team1Id: number, team2Id: number, last?: number) {
  return apiFetch<ApiResponse<H2HResponse>>('fixtures/headtohead', {
    h2h: `${team1Id}-${team2Id}`,
    last: String(last || 10),
  })
}

export async function getFixturesByLeague(leagueId: number, season?: number) {
  const s = season || new Date().getFullYear()
  const today = new Date().toISOString().split('T')[0]
  return apiFetch<ApiResponse<FixtureResponse>>('fixtures', {
    league: String(leagueId),
    season: String(s),
    date: today,
  })
}
