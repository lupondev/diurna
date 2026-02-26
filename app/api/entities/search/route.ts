import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

const limiter = rateLimit({ interval: 60_000 })

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  try {
    await limiter.check(60, `entities:${ip}`)
  } catch {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''

  if (q.length < 2) {
    return NextResponse.json({ entities: [] })
  }

  const entities = await prisma.entity.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { aliases: { has: q } },
      ],
      type: { in: ['LEAGUE', 'CLUB', 'COMPETITION'] },
    },
    select: { name: true, type: true, aliases: true },
    take: 10,
  })

  return NextResponse.json({ entities })
}
