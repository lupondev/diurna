import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '20')
  const eventType = searchParams.get('eventType') || undefined
  const minDis = parseInt(searchParams.get('minDis') || '0')

  const clusters = await prisma.storyCluster.findMany({
    where: {
      ...(eventType ? { eventType } : {}),
      dis: { gte: minDis },
    },
    include: {
      summary: true,
    },
    orderBy: { dis: 'desc' },
    take: limit,
  })

  return NextResponse.json({ clusters, count: clusters.length })
}
