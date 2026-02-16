import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const API_KEY = process.env.FOOTBALL_API_KEY
const BASE = 'https://v3.football.api-sports.io'

let cache: { data: unknown; ts: number } | null = null
const CACHE_TTL = 15 * 60 * 1000

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
      return NextResponse.json({
        standings: getMockStandings(),
        topScorers: getMockScorers(),
        source: 'mock',
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
      const data = await standingsRes.value.json()
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
      const data = await scorersRes.value.json()
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
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}

function getMockStandings() {
  const teams = [
    { team: 'Arsenal', pts: 65, w: 20, d: 5, l: 4, gf: 62, ga: 24 },
    { team: 'Liverpool', pts: 63, w: 19, d: 6, l: 4, gf: 68, ga: 29 },
    { team: 'Manchester City', pts: 60, w: 18, d: 6, l: 5, gf: 61, ga: 28 },
    { team: 'Chelsea', pts: 52, w: 15, d: 7, l: 7, gf: 50, ga: 35 },
    { team: 'Newcastle', pts: 50, w: 14, d: 8, l: 7, gf: 48, ga: 32 },
    { team: 'Aston Villa', pts: 48, w: 14, d: 6, l: 9, gf: 51, ga: 40 },
    { team: 'Tottenham', pts: 45, w: 13, d: 6, l: 10, gf: 55, ga: 48 },
    { team: 'Manchester United', pts: 42, w: 12, d: 6, l: 11, gf: 39, ga: 42 },
  ]
  return teams.map((t, i) => ({
    rank: i + 1, team: t.team, points: t.pts,
    played: t.w + t.d + t.l, won: t.w, drawn: t.d, lost: t.l,
    gf: t.gf, ga: t.ga, gd: t.gf - t.ga,
  }))
}

function getMockScorers() {
  return [
    { name: 'Erling Haaland', team: 'Manchester City', goals: 22, appearances: 27 },
    { name: 'Mohamed Salah', team: 'Liverpool', goals: 19, appearances: 28 },
    { name: 'Alexander Isak', team: 'Newcastle', goals: 17, appearances: 26 },
    { name: 'Bukayo Saka', team: 'Arsenal', goals: 15, appearances: 28 },
    { name: 'Cole Palmer', team: 'Chelsea', goals: 14, appearances: 27 },
  ]
}
