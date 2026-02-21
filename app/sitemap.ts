import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { getSiteBaseUrl } from '@/lib/site-url'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await getSiteBaseUrl()

  const articles = await prisma.article.findMany({
    where: { status: 'PUBLISHED', deletedAt: null, isTest: false },
    select: {
      slug: true,
      updatedAt: true,
      category: { select: { slug: true } },
    },
    orderBy: { publishedAt: 'desc' },
  })

  const articleEntries: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${baseUrl}/${a.category?.slug || 'vijesti'}/${a.slug}`,
    lastModified: a.updatedAt,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    select: { slug: true },
  })

  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${baseUrl}/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const staticPages: MetadataRoute.Sitemap = [
    '/o-nama', '/impressum', '/privatnost', '/uslovi', '/kontakt', '/marketing',
    '/igraci', '/tabela', '/legende', '/organizacije',
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  // Athletes
  const athletes = await prisma.athlete.findMany({
    where: { status: 'published', deletedAt: null },
    select: { slug: true, updatedAt: true },
    orderBy: { legendRank: 'asc' },
  })

  const athleteEntries: MetadataRoute.Sitemap = athletes.map((a) => ({
    url: `${baseUrl}/legende/${a.slug}`,
    lastModified: a.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  // Organizations
  const organizations = await prisma.sportOrganization.findMany({
    where: { status: 'published', deletedAt: null },
    select: { slug: true, updatedAt: true },
  })

  const orgEntries: MetadataRoute.Sitemap = organizations.map((o) => ({
    url: `${baseUrl}/organizacije/${o.slug}`,
    lastModified: o.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    ...staticPages,
    ...categoryEntries,
    ...articleEntries,
    ...athleteEntries,
    ...orgEntries,
  ]
}
