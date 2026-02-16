import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { getSiteBaseUrl } from '@/lib/site-url'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await getSiteBaseUrl()

  const articles = await prisma.article.findMany({
    where: { status: 'PUBLISHED', deletedAt: null },
    select: { slug: true, updatedAt: true, site: { select: { slug: true } } },
    orderBy: { publishedAt: 'desc' },
  })

  const articleEntries: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${baseUrl}/${a.site.slug}/${a.slug}`,
    lastModified: a.updatedAt,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  const publicArticleEntries: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${baseUrl}/site/${a.slug}`,
    lastModified: a.updatedAt,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    select: { slug: true },
  })

  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${baseUrl}/site/category/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/site`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/site/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/site/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/site/impressum`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    ...articleEntries,
    ...publicArticleEntries,
    ...categoryEntries,
  ]
}
