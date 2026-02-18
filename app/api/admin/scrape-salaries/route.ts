import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DELAY_MS = 3000
const BATCH_SIZE = 3

const CLUBS: Record<string, { slug: string; league: string }[]> = {
  'premier-league': [
    { slug: 'arsenal', league: 'Premier League' },
    { slug: 'aston-villa', league: 'Premier League' },
    { slug: 'bournemouth', league: 'Premier League' },
    { slug: 'brentford', league: 'Premier League' },
    { slug: 'brighton-and-hove-albion', league: 'Premier League' },
    { slug: 'chelsea', league: 'Premier League' },
    { slug: 'crystal-palace', league: 'Premier League' },
    { slug: 'everton', league: 'Premier League' },
    { slug: 'fulham', league: 'Premier League' },
    { slug: 'ipswich-town', league: 'Premier League' },
    { slug: 'leicester-city', league: 'Premier League' },
    { slug: 'liverpool', league: 'Premier League' },
    { slug: 'manchester-city', league: 'Premier League' },
    { slug: 'manchester-united', league: 'Premier League' },
    { slug: 'newcastle-united', league: 'Premier League' },
    { slug: 'nottingham-forest', league: 'Premier League' },
    { slug: 'southampton', league: 'Premier League' },
    { slug: 'tottenham-hotspur', league: 'Premier League' },
    { slug: 'west-ham-united', league: 'Premier League' },
    { slug: 'wolverhampton-wanderers', league: 'Premier League' },
  ],
  'la-liga': [
    { slug: 'real-madrid', league: 'La Liga' },
    { slug: 'fc-barcelona', league: 'La Liga' },
    { slug: 'atletico-madrid', league: 'La Liga' },
    { slug: 'real-sociedad', league: 'La Liga' },
    { slug: 'villarreal', league: 'La Liga' },
    { slug: 'real-betis', league: 'La Liga' },
    { slug: 'athletic-bilbao', league: 'La Liga' },
    { slug: 'sevilla-fc', league: 'La Liga' },
    { slug: 'girona-fc', league: 'La Liga' },
    { slug: 'getafe-cf', league: 'La Liga' },
  ],
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function slugToTeamName(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function parseSalary(s: string): number {
  const clean = s.replace(/[€£$,\s]/g, '')
  return parseInt(clean) || 0
}

async function scrapeClubSalaries(clubSlug: string, season: string) {
  const url = `https://www.capology.com/club/${clubSlug}/salaries/${season}/`

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })

  if (!res.ok) {
    console.error(`Capology ${clubSlug}: ${res.status}`)
    return []
  }

  const html = await res.text()

  const players: Array<{
    name: string
    position: string
    age: number
    grossWeekly: number
    netWeekly: number
    annualGross: number
    contractExpiry: string
  }> = []

  const rowRegex = /<tr[^>]*class="[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi
  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi

  let rowMatch
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const row = rowMatch[1]
    const cells: string[] = []
    let cellMatch
    while ((cellMatch = cellRegex.exec(row)) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]*>/g, '').trim())
    }

    if (cells.length >= 5) {
      const name = cells[0]?.replace(/\s+/g, ' ').trim()
      if (!name || name === 'Player' || name.length < 2) continue

      const position = cells[1] || ''
      const age = parseInt(cells[2]) || 0
      const grossWeekly = parseSalary(cells[4] || '0')
      const netWeekly = parseSalary(cells[5] || '0')
      const annualGross = grossWeekly * 52
      const contractExpiry = cells[6] || ''

      if (name && grossWeekly > 0) {
        players.push({ name, position, age, grossWeekly, netWeekly, annualGross, contractExpiry })
      }
    }
  }

  return players
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
  const league = searchParams.get('league') || 'premier-league'
  const offset = parseInt(searchParams.get('offset') || '0')

  const clubs = CLUBS[league]
  if (!clubs) {
    return NextResponse.json({ error: 'Unknown league' }, { status: 400 })
  }

  const batch = clubs.slice(offset, offset + BATCH_SIZE)
  if (batch.length === 0) {
    return NextResponse.json({ done: true, league, totalClubs: clubs.length })
  }

  let totalSynced = 0

  for (const club of batch) {
    try {
      const salaries = await scrapeClubSalaries(club.slug, '2024-25')

      for (const s of salaries) {
        const normalizedName = s.name.toLowerCase().trim()
        const lastName = normalizedName.split(' ').pop() || ''

        const existingPlayer = await prisma.player.findFirst({
          where: {
            OR: [
              { name: { contains: s.name, mode: 'insensitive' } },
              { shortName: { contains: s.name, mode: 'insensitive' } },
              { lastName: { contains: lastName, mode: 'insensitive' } },
            ],
            currentTeam: { contains: club.slug.split('-')[0], mode: 'insensitive' },
          },
        })

        if (existingPlayer) {
          await prisma.player.update({
            where: { id: existingPlayer.id },
            data: {
              salary: s.grossWeekly,
              salaryNet: s.netWeekly,
              salaryAnnual: s.annualGross,
              contractExpiry: s.contractExpiry ? new Date(s.contractExpiry) : null,
              capologySlug: club.slug,
              lastSalarySyncAt: new Date(),
            },
          })
          totalSynced++
        } else {
          await prisma.player.create({
            data: {
              name: s.name,
              position: s.position,
              age: s.age,
              currentTeam: slugToTeamName(club.slug),
              currentLeague: club.league,
              salary: s.grossWeekly,
              salaryNet: s.netWeekly,
              salaryAnnual: s.annualGross,
              contractExpiry: s.contractExpiry ? new Date(s.contractExpiry) : null,
              capologySlug: club.slug,
              lastSalarySyncAt: new Date(),
            },
          })
          totalSynced++
        }
      }

      if (salaries.length > 0) {
        const teamName = slugToTeamName(club.slug)
        const totalPayroll = salaries.reduce((sum, s) => sum + s.annualGross, 0)
        const sorted = [...salaries].sort((a, b) => b.grossWeekly - a.grossWeekly)
        const avgSalary = Math.round(salaries.reduce((sum, s) => sum + s.grossWeekly, 0) / salaries.length)

        await prisma.clubFinancials.upsert({
          where: { teamName_season: { teamName, season: 2024 } },
          create: {
            teamName,
            leagueName: club.league,
            season: 2024,
            totalPayroll,
            highestPaid: sorted[0]?.name,
            highestSalary: sorted[0]?.grossWeekly,
            averageSalary: avgSalary,
            squadSize: salaries.length,
            capologySlug: club.slug,
            lastSyncedAt: new Date(),
          },
          update: {
            totalPayroll,
            highestPaid: sorted[0]?.name,
            highestSalary: sorted[0]?.grossWeekly,
            averageSalary: avgSalary,
            squadSize: salaries.length,
            lastSyncedAt: new Date(),
          },
        })
      }

      await sleep(DELAY_MS)
    } catch (err) {
      console.error(`Capology scrape error for ${club.slug}:`, err)
    }
  }

  return NextResponse.json({
    done: offset + BATCH_SIZE >= clubs.length,
    league,
    offset,
    batchSize: batch.length,
    synced: totalSynced,
    nextOffset: offset + BATCH_SIZE,
  })
}
