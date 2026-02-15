import { prisma } from './prisma'
import { ArticleStatus } from '@prisma/client'

// NOTE: These helpers don't filter by org yet (no auth).
// When auth is added, wrap with getOrgId() per SPEC §4.3

export async function getArticles(filters?: {
  status?: ArticleStatus
  siteId?: string
}) {
  return prisma.article.findMany({
    where: {
      deletedAt: null,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.siteId && { siteId: filters.siteId }),
    },
    include: {
      category: { select: { name: true, slug: true } },
      site: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
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

export async function getArticleById(id: string) {
  return prisma.article.findFirst({
    where: { id, deletedAt: null },
    include: {
      category: true,
      site: true,
      aiRevisions: { orderBy: { version: 'desc' }, take: 5 },
    },
  })
}

export async function getDashboardStats() {
  const [published, drafts, aiGenerated, teamMembers] = await Promise.all([
    prisma.article.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
    prisma.article.count({ where: { status: 'DRAFT', deletedAt: null } }),
    prisma.article.count({ where: { aiGenerated: true, deletedAt: null } }),
    prisma.userOnOrganization.count({ where: { deletedAt: null } }),
  ])
  return { published, drafts, aiGenerated, teamMembers }
}

export async function getCategories(siteId: string) {
  return prisma.category.findMany({
    where: { siteId, deletedAt: null },
    orderBy: { order: 'asc' },
  })
}

export async function getDefaultSite() {
  return prisma.site.findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
  })
}
