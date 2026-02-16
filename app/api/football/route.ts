import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getTodayMatches,
  getLiveScores,
  getLeagueStandings,
  getHeadToHead,
} from '@/lib/football-api'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const action = searchParams.get('action')

  try {
    switch (action) {
      case 'today': {
        const data = await getTodayMatches()
        return NextResponse.json(data)
      }

      case 'live': {
        const league = searchParams.get('league')
        const data = await getLiveScores(league ? Number(league) : undefined)
        return NextResponse.json(data)
      }

      case 'standings': {
        const league = searchParams.get('league')
        if (!league) {
          return NextResponse.json({ error: 'league parameter required' }, { status: 400 })
        }
        const season = searchParams.get('season')
        const data = await getLeagueStandings(Number(league), season ? Number(season) : undefined)
        return NextResponse.json(data)
      }

      case 'h2h': {
        const team1 = searchParams.get('team1')
        const team2 = searchParams.get('team2')
        if (!team1 || !team2) {
          return NextResponse.json({ error: 'team1 and team2 parameters required' }, { status: 400 })
        }
        const last = searchParams.get('last')
        const data = await getHeadToHead(Number(team1), Number(team2), last ? Number(last) : undefined)
        return NextResponse.json(data)
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use: today, live, standings, h2h' }, { status: 400 })
    }
  } catch (error) {
    console.error('Football API error:', error)
    return NextResponse.json({ error: 'Failed to fetch football data' }, { status: 500 })
  }
}
