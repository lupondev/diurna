import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const updated = await prisma.autopilotLeague.updateMany({
      where: { apiFootballId: 210, name: 'Premijer Liga BiH' },
      data: { apiFootballId: 262 },
    })

    return NextResponse.json({
      message: `Updated ${updated.count} leagues`,
      fix: 'Premijer Liga BiH: apiFootballId 210 → 262 (Bosnia Premier League)',
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fix league' }, { status: 500 })
  }
}
