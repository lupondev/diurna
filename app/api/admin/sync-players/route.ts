import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const API_KEY = process.env.FOOTBALL_API_KEY
const BASE = 'https://v3.football.api-sports.io'
const BATCH_SIZE = 10

const LEAGUES = [
  { id: 39, name: 'Premier League', season: 2024 },
  { id: 140, name: 'La Liga', season: 2024 },
  { id: 135, name: 'Serie A', season: 2024 },
  { id: 78, name: 'Bundesliga', season: 2024 },
  { id: 61, name: 'Ligue 1', season: 2024 },
]

async function fetchAPI(endpoint: string) {
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: { 'x-apisports-key': API_KEY! },
  })
  if (!res.ok) throw new Error(`API-Football error: ${res.status}`)
  const data = await res.json() as { response: any[] }
  return data.response
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const session = await getServerSession(authOptions)
  const isCron = auth === `Bearer ${process.env.CRON_SECRET}` || auth === `Bearer ${process.env.FOOTBALL_API_KEY}`
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'

  if (!isCron && !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const leagueId = parseInt(searchParams.get('league') || '39')
  const page = parseInt(searchParams.get('page') || '1')

  try {
    const players = await fetchAPI(
      `/players?league=${leagueId}&season=2024&page=${page}`
    )

    if (!players || players.length === 0) {
      return NextResponse.json({ done: true, page, synced: 0 })
    }

    let synced = 0

    for (const item of players.slice(0, BATCH_SIZE)) {
      const p = item.player
      const stats = item.statistics?.[0]

      if (!p?.id) continue

      const player = await prisma.player.upsert({
        where: { apiFootballId: p.id },
        create: {
          apiFootballId: p.id,
          name: p.name,
          firstName: p.firstname,
          lastName: p.lastname,
          nationality: p.nationality,
          dateOfBirth: p.birth?.date ? new Date(p.birth.date) : null,
          age: p.age,
          height: p.height,
          weight: p.weight,
          photo: p.photo,
          injured: p.injured || false,
          currentTeam: stats?.team?.name,
          currentTeamId: stats?.team?.id,
          currentLeague: stats?.league?.name,
          currentLeagueId: stats?.league?.id,
          position: stats?.games?.position,
          jerseyNumber: stats?.games?.number,
          lastSyncedAt: new Date(),
        },
        update: {
          name: p.name,
          age: p.age,
          photo: p.photo,
          injured: p.injured || false,
          currentTeam: stats?.team?.name,
          currentTeamId: stats?.team?.id,
          currentLeague: stats?.league?.name,
          currentLeagueId: stats?.league?.id,
          position: stats?.games?.position,
          jerseyNumber: stats?.games?.number,
          lastSyncedAt: new Date(),
        },
      })

      if (stats) {
        await prisma.playerSeason.upsert({
          where: {
            playerId_season_leagueId: {
              playerId: player.id,
              season: 2024,
              leagueId: stats.league?.id || 0,
            },
          },
          create: {
            playerId: player.id,
            season: 2024,
            leagueId: stats.league?.id,
            leagueName: stats.league?.name,
            teamId: stats.team?.id,
            teamName: stats.team?.name,
            appearances: stats.games?.appearences || 0,
            lineups: stats.games?.lineups || 0,
            minutes: stats.games?.minutes || 0,
            rating: stats.games?.rating ? parseFloat(stats.games.rating) : null,
            goals: stats.goals?.total || 0,
            assists: stats.goals?.assists || 0,
            shots: stats.shots?.total || 0,
            shotsOnTarget: stats.shots?.on || 0,
            totalPasses: stats.passes?.total || 0,
            keyPasses: stats.passes?.key || 0,
            passAccuracy: stats.passes?.accuracy ? parseFloat(stats.passes.accuracy) : null,
            tackles: stats.tackles?.total || 0,
            blocks: stats.tackles?.blocks || 0,
            interceptions: stats.tackles?.interceptions || 0,
            dribbleAttempts: stats.dribbles?.attempts || 0,
            dribbleSuccess: stats.dribbles?.success || 0,
            yellowCards: stats.cards?.yellow || 0,
            redCards: stats.cards?.red || 0,
            foulsCommitted: stats.fouls?.committed || 0,
            foulsDrawn: stats.fouls?.drawn || 0,
            saves: stats.goals?.saves,
            goalsConceded: stats.goals?.conceded,
          },
          update: {
            appearances: stats.games?.appearences || 0,
            lineups: stats.games?.lineups || 0,
            minutes: stats.games?.minutes || 0,
            rating: stats.games?.rating ? parseFloat(stats.games.rating) : null,
            goals: stats.goals?.total || 0,
            assists: stats.goals?.assists || 0,
            shots: stats.shots?.total || 0,
            shotsOnTarget: stats.shots?.on || 0,
            totalPasses: stats.passes?.total || 0,
            keyPasses: stats.passes?.key || 0,
            passAccuracy: stats.passes?.accuracy ? parseFloat(stats.passes.accuracy) : null,
            tackles: stats.tackles?.total || 0,
            blocks: stats.tackles?.blocks || 0,
            interceptions: stats.tackles?.interceptions || 0,
            dribbleAttempts: stats.dribbles?.attempts || 0,
            dribbleSuccess: stats.dribbles?.success || 0,
            yellowCards: stats.cards?.yellow || 0,
            redCards: stats.cards?.red || 0,
            foulsCommitted: stats.fouls?.committed || 0,
            foulsDrawn: stats.fouls?.drawn || 0,
            saves: stats.goals?.saves,
            goalsConceded: stats.goals?.conceded,
          },
        })
      }

      synced++
    }

    return NextResponse.json({
      done: false,
      league: leagueId,
      page,
      synced,
      nextPage: page + 1,
    })
  } catch (error) {
    console.error('Sync players error:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
