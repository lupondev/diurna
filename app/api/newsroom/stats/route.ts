import { NextResponse } from 'next/server'

const API_KEY = process.env.FOOTBALL_API_KEY || process.env.API_FOOTBALL_KEY
const BASE = 'https://v3.football.api-sports.io'

let cache: { data: unknown; ts: number } | null = null
const CACHE_TTL = 15 * 60 * 1000

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return NextResponse.json(cache.data)
    }

    if (!API_KEY) {
      return NextResponse.json({
        standings: [],
        topScorers: [],
        source: 'no-key',
        fetchedAt: new Date().toISOString(),
      })
    }

    const headers = { 'x-apisports-key': API_KEY }
    const season = new Date().getFullYear()

    const [standingsRes, scorersRes] = await Promise.allSettled([
      fetch(`${BASE}/standings?league=39&season=${season}`, { headers }),
      fetch(`${BASE}/players/topscorers?league=39&season=${season}`, { headers }),
    ])

    type StandingsTeam = {
      rank: number
      team: { name: string; logo: string }
      points: number
      all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } }
    }

    type TopScorer = {
      player: { name: string; photo: string; nationality: string }
      statistics: Array<{ team: { name: string }; goals: { total: number }; games: { appearences: number } }>
    }

    let standings: unknown[] = []
    let topScorers: unknown[] = []

    if (standingsRes.status === 'fulfilled' && standingsRes.value.ok) {
      const data = await standingsRes.value.json() as { response?: any[] }
      const league = data.response?.[0]?.league?.standings?.[0] || []
      standings = league.map((t: StandingsTeam) => ({
        rank: t.rank,
        team: t.team.name,
        logo: t.team.logo,
        points: t.points,
        played: t.all.played,
        won: t.all.win,
        drawn: t.all.draw,
        lost: t.all.lose,
        gf: t.all.goals.for,
        ga: t.all.goals.against,
        gd: t.all.goals.for - t.all.goals.against,
      }))
    }

    if (scorersRes.status === 'fulfilled' && scorersRes.value.ok) {
      const data = await scorersRes.value.json() as { response?: any[] }
      topScorers = (data.response || []).slice(0, 10).map((p: TopScorer) => ({
        name: p.player.name,
        photo: p.player.photo,
        nationality: p.player.nationality,
        team: p.statistics[0]?.team.name || '',
        goals: p.statistics[0]?.goals.total || 0,
        appearances: p.statistics[0]?.games.appearences || 0,
      }))
    }

    const result = { standings, topScorers, source: 'api-football', fetchedAt: new Date().toISOString() }
    cache = { data: result, ts: Date.now() }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ standings: [], topScorers: [], source: 'error', fetchedAt: new Date().toISOString() })
  }
}

