import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { prisma } from './prisma'

export async function getApiContext() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.organizationId) {
    return null
  }

  const site = await prisma.site.findFirst({
    where: { organizationId: session.user.organizationId, deletedAt: null },
    select: {
      id: true,
      organizationId: true,
      name: true,
      domain: true,
      language: true,
      timezone: true,
    },
  })

  if (!site) return null

  return {
    userId: session.user.id,
    orgId: session.user.organizationId,
    siteId: site.id,
    site,
    role: session.user.role ?? 'JOURNALIST',
  }
}
