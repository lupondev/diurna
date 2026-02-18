import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const session = await getServerSession(authOptions)
  const isCron = auth === `Bearer ${process.env.CRON_SECRET}` || auth === `Bearer ${process.env.FOOTBALL_API_KEY}`
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'

  if (!isCron && !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.API_FOOTBALL_KEY) {
    return NextResponse.json({ error: 'API_FOOTBALL_KEY not set. Set it in Vercel env vars to enable match verification.' })
  }

  const leagues = [39, 140, 135, 78, 61]
  let total = 0

  for (const league of leagues) {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    for (const date of [yesterday, today]) {
      try {
        const res = await fetch(
          `https://v3.football.api-sports.io/fixtures?league=${league}&date=${date}&season=2024`,
          { headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! } }
        )
        const data = await res.json() as { response?: Array<{ fixture: { id: number; date: string; status: { short: string } }; teams: { home: { name: string }; away: { name: string } }; goals: { home: number | null; away: number | null }; league: { name: string; season: number }; events?: Record<string, unknown>[] }> }

        for (const fixture of (data.response || [])) {
          await prisma.matchResult.upsert({
            where: { apiFootballId: fixture.fixture.id },
            update: {
              homeScore: fixture.goals.home,
              awayScore: fixture.goals.away,
              status: fixture.fixture.status.short,
              events: (fixture.events || []) as Prisma.InputJsonValue,
              lastUpdated: new Date(),
            },
            create: {
              apiFootballId: fixture.fixture.id,
              homeTeam: fixture.teams.home.name,
              awayTeam: fixture.teams.away.name,
              homeScore: fixture.goals.home,
              awayScore: fixture.goals.away,
              league: `${fixture.league.name}`,
              season: `${fixture.league.season}`,
              matchDate: new Date(fixture.fixture.date),
              status: fixture.fixture.status.short,
              events: (fixture.events || []) as Prisma.InputJsonValue,
            },
          })
          total++
        }

        await new Promise(r => setTimeout(r, 1000))
      } catch (e) {
        console.error(`Failed to fetch league ${league} on ${date}:`, e)
      }
    }
  }

  return NextResponse.json({ matches: total })
}
