import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  let orgId: string | undefined

  const secret = req.headers.get('authorization')
  if (secret === `Bearer ${process.env.CRON_SECRET}`) {
    const firstOrg = await prisma.organization.findFirst()
    orgId = firstOrg?.id
  } else {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const role = session.user.role
    if (role !== 'ADMIN' && role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    orgId = session.user.organizationId
  }

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as { siteId?: string }
  const siteId = body.siteId

  if (!siteId) {
    return NextResponse.json({ error: 'siteId is required' }, { status: 400 })
  }

  const site = await prisma.site.findFirst({
    where: { id: siteId, organizationId: orgId, deletedAt: { not: null } },
  })
  if (!site) {
    return NextResponse.json({ error: 'Site not found or not deleted' }, { status: 404 })
  }

  await prisma.site.update({
    where: { id: siteId },
    data: { deletedAt: null },
  })

  return NextResponse.json({ recovered: 1 })
}
