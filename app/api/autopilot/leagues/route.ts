import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const config = await prisma.autopilotConfig.findUnique({
    where: { orgId: session.user.organizationId },
  })
  if (!config) {
    return NextResponse.json({ error: 'Config not found' }, { status: 404 })
  }

  const body = await req.json()
  const league = await prisma.autopilotLeague.create({
    data: {
      configId: config.id,
      name: body.name,
      apiFootballId: body.apiFootballId || null,
      flag: body.flag || null,
      weight: body.weight || 10,
      isActive: body.isActive ?? true,
    },
  })

  return NextResponse.json(league, { status: 201 })
}
