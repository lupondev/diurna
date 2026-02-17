import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
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
        const data = await res.json()

        for (const fixture of (data.response || [])) {
          await prisma.matchResult.upsert({
            where: { apiFootballId: fixture.fixture.id },
            update: {
              homeScore: fixture.goals.home,
              awayScore: fixture.goals.away,
              status: fixture.fixture.status.short,
              events: fixture.events || [],
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
              events: fixture.events || [],
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
