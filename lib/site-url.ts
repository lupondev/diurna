import { prisma } from './prisma'

/**
 * Get the base URL from the first site's domain in the database,
 * falling back to NEXTAUTH_URL or hardcoded default.
 */
export async function getSiteBaseUrl(): Promise<string> {
  try {
    const site = await prisma.site.findFirst({
      where: { deletedAt: null, domain: { not: null } },
      select: { domain: true },
      orderBy: { createdAt: 'asc' },
    })
    if (site?.domain) {
      const domain = site.domain
      return domain.startsWith('http') ? domain : `https://${domain}`
    }
  } catch {
    // DB may not be available during build
  }
  return process.env.NEXTAUTH_URL || 'https://diurna.io'
}
