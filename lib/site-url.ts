import { prisma } from './prisma'

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
  }
  return process.env.NEXTAUTH_URL || 'https://diurna.io'
}
