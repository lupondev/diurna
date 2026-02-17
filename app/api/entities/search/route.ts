import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
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
