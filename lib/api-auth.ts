import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDefaultSite } from '@/lib/db'
import type { Site } from '@prisma/client'

export type ApiContext = {
  userId: string
  orgId: string
  siteId: string
  site: Site
  role: string
}

export async function getApiContext(): Promise<ApiContext | null> {
  const session = await getServerSession(authOptions)
  const orgId = session?.user?.organizationId ?? null
  if (!session?.user?.id || !orgId) return null
  const site = await getDefaultSite(orgId)
  if (!site) return null
  return {
    userId: session.user.id,
    orgId,
    siteId: site.id,
    site,
    role: session.user.role ?? 'JOURNALIST',
  }
}
