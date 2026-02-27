import { prisma } from './prisma'

/**
 * Resolve the primary site for an organization.
 * Prefers a site with a domain (production site),
 * then falls back to the first created site.
 */
export async function getPrimarySite(organizationId: string) {
  return (
    await prisma.site.findFirst({
      where: { organizationId, domain: { not: null }, deletedAt: null },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })
  ) ?? (
    await prisma.site.findFirst({
      where: { organizationId, deletedAt: null },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })
  )
}

