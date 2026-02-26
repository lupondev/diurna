import { prisma } from './prisma'
import { ArticleStatus } from '@prisma/client'

export async function getArticles(filters?: {
  status?: ArticleStatus
  siteId?: string
  organizationId?: string
  take?: number
}) {
  return prisma.article.findMany({
    where: {
      deletedAt: null,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.siteId && { siteId: filters.siteId }),
      ...(filters?.organizationId && { site: { organizationId: filters.organizationId } }),
    },
    include: {
      category: { select: { name: true, slug: true } },
      site: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: filters?.take ?? 50,
  })
}

export async function getArticleBySlug(siteId: string, slug: string) {
  return prisma.article.findFirst({
    where: { siteId, slug, deletedAt: null },
    include: {
      category: true,
      aiRevisions: { orderBy: { version: 'desc' }, take: 5 },
    },
  })
}

export async function getArticleById(id: string, siteId?: string) {
  return prisma.article.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(siteId && { siteId }),
    },
    include: {
      category: { select: { name: true, slug: true } },
      site: { select: { id: true, name: true, domain: true, organizationId: true } },
      aiRevisions: { orderBy: { version: 'desc' }, take: 5 },
    },
  })
}

export async function getDashboardStats(organizationId: string) {
  const orgFilter = { site: { organizationId } }

  const [published, drafts, aiGenerated, teamMembers] = await Promise.all([
    prisma.article.count({ where: { status: 'PUBLISHED', deletedAt: null, ...orgFilter } }),
    prisma.article.count({ where: { status: 'DRAFT', deletedAt: null, ...orgFilter } }),
    prisma.article.count({ where: { aiGenerated: true, deletedAt: null, ...orgFilter } }),
    prisma.userOnOrganization.count({ where: { organizationId, deletedAt: null } }),
  ])
  return { published, drafts, aiGenerated, teamMembers }
}

export async function getCategories(siteId: string) {
  return prisma.category.findMany({
    where: { siteId, deletedAt: null },
    orderBy: { order: 'asc' },
  })
}

export async function getDefaultSite(organizationId?: string) {
  try {
    const siteWithDomain = await prisma.site.findFirst({
      where: {
        deletedAt: null,
        domain: { not: null },
        ...(organizationId && { organizationId }),
      },
      orderBy: { createdAt: 'asc' },
    })
    if (siteWithDomain) return siteWithDomain

    return prisma.site.findFirst({
      where: {
        deletedAt: null,
        ...(organizationId && { organizationId }),
      },
      orderBy: { createdAt: 'asc' },
    })
  } catch {
    return null
  }
}

export async function getTeamMembers(organizationId?: string) {
  return prisma.userOnOrganization.findMany({
    where: {
      deletedAt: null,
      ...(organizationId && { organizationId }),
    },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: [
      { role: 'asc' },
      { joinedAt: 'asc' },
    ],
  })
}
