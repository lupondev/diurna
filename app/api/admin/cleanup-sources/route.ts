import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const brokenSourceIds = [
    'cmm58tveh00eal1042d4awwzu', // Klix Sport
    'cmm57xc2n00r5js04qgsj1eua', // Novi.ba
    'cmm5dam4b0000l504277rnh28', // as (wrong URL: "as.com" no protocol)
    'cmm5d9oti0001jx04dghmf0f0', // marca (wrong URL: "marca.com" no protocol)
    'cmm5d9db60000jx04wrfrlgam', // sport (wrong URL: "sport,ba" has comma)
    'cmm5da31v0000jm04vycme6pq', // sportsport (wrong URL: "sportsport.ba" no protocol)
  ]

  const result = await prisma.feedSource.deleteMany({
    where: { id: { in: brokenSourceIds } },
  })

  return NextResponse.json({ deleted: result.count })
}
