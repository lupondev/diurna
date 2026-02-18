import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY
const API_BASE = 'https://v3.football.api-sports.io'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const session = await getServerSession(authOptions)
  const isCron = auth === `Bearer ${process.env.CRON_SECRET}` || auth === `Bearer ${process.env.FOOTBALL_API_KEY}`
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'

  if (!isCron && !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!API_FOOTBALL_KEY) {
    return NextResponse.json({ error: 'API_FOOTBALL_KEY not set. Set it in Vercel env vars to enable player enrichment.' })
  }

  const players = await prisma.player.findMany({
    where: { apiFootballId: null },
    take: 10,
  })

  let enriched = 0
  for (const player of players) {
    try {
      const res = await fetch(`${API_BASE}/players?search=${encodeURIComponent(player.name)}&season=2024`, {
        headers: { 'x-apisports-key': API_FOOTBALL_KEY },
      })
      const data = await res.json()

      if (data.response && data.response.length > 0) {
        const p = data.response[0]
        await prisma.player.update({
          where: { id: player.id },
          data: {
            apiFootballId: p.player.id,
            age: p.player.age,
            photo: p.player.photo,
            currentTeam: p.statistics?.[0]?.team?.name || player.currentTeam,
            lastSyncedAt: new Date(),
          },
        })
        enriched++
      }

      await new Promise(r => setTimeout(r, 1000))
    } catch (e) {
      console.error(`Failed to enrich ${player.name}:`, e)
    }
  }

  return NextResponse.json({ enriched, total: players.length })
}
