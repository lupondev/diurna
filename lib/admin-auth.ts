import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { prisma } from './prisma'
import { NextResponse } from 'next/server'

export async function requireAdmin(allowedRoles: string[] = ['OWNER', 'ADMIN']) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.organizationId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), session: null, orgId: '' }
  }

  const membership = await prisma.userOnOrganization.findFirst({
    where: {
      userId: session.user.id,
      organizationId: session.user.organizationId,
      deletedAt: null,
    },
  })

  if (!membership || !allowedRoles.includes(membership.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), session: null, orgId: '' }
  }

  return { error: null, session, orgId: session.user.organizationId, role: membership.role }
}
