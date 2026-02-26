import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json() as Record<string, unknown>
  const { configId, config, id: _, ...data } = body

  const existing = await prisma.autopilotLeague.findFirst({
    where: { id, config: { orgId: session.user.organizationId } },
  })
  if (!existing) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  const league = await prisma.autopilotLeague.update({
    where: { id },
    data,
  })

  return NextResponse.json(league)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.autopilotLeague.findFirst({
    where: { id, config: { orgId: session.user.organizationId } },
  })
  if (!existing) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }
  await prisma.autopilotLeague.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
