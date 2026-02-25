import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const site = await prisma.site.findFirst({
    where: { organizationId: session.user.organizationId },
    select: { id: true },
  })
  if (!site) {
    return NextResponse.json({ error: 'No site found' }, { status: 400 })
  }
  const body = await req.json() as { active?: boolean }
  const existing = await prisma.feedSource.findFirst({
    where: { id, siteId: site.id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 })
  }
  const updated = await prisma.feedSource.update({
    where: { id },
    data: { ...(typeof body.active === 'boolean' && { active: body.active }) },
  })
  return NextResponse.json(updated)
}
