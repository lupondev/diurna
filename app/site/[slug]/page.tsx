import { prisma } from '@/lib/prisma'
import { getDefaultSite } from '@/lib/db'
import { tiptapToHtml } from '@/lib/tiptap-html'
import { generateNewsArticleSchema } from '@/lib/seo'
import { SubscribeWidget } from '@/components/subscribe-widget'
import { ShareButtons } from '@/components/public/share-buttons'
import { WidgetHydrator } from '@/components/public/widget-hydrator'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const site = await getDefaultSite()
  if (!site) return { title: 'Not Found' }

  const article = await prisma.article.findFirst({
    where: { siteId: site.id, slug: params.slug, status: 'PUBLISHED', deletedAt: null, isTest: false },
    select: { title: true, excerpt: true, featuredImage: true, publishedAt: true },
  })
  if (!article) return { title: 'Not Found' }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://diurna.vercel.app'

  const description = article.excerpt || undefined
  const imageUrl = article.featuredImage || `${baseUrl}/api/og?title=${encodeURIComponent(article.title)}`
  return {
    title: `${article.title} | ${site.name}`,
    description,
    openGraph: {
      title: article.title,
      description,
      images: [imageUrl],
      type: 'article',
      publishedTime: article.publishedAt?.toISOString(),
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description,
      images: [imageUrl],
    },
  }
}

function getCategoryFallback(slug?: string): string {
  const map: Record<string, string> = {
    transferi: '/images/fallback/transfer.svg',
    utakmice: '/images/fallback/match.svg',
    povrede: '/images/fallback/injury.svg',
  }
  return map[slug || ''] || '/images/fallback/news.svg'
}

function removeLeadingTitle(html: string, title: string): string {
  const normalized = title.trim().toLowerCase()
  const match = html.match(/^\s*<(h[12])[^>]*>(.*?)<\/\1>/i)
  if (match && match[2].trim().toLowerCase() === normalized) {
    return html.slice(match[0].length).trim()
  }
  return html
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const site = await getDefaultSite()
  if (!site) notFound()

  const article = await prisma.article.findFirst({
    where: {
      siteId: site.id,
      slug: params.slug,
      status: 'PUBLISHED',
      deletedAt: null,
      isTest: false,
    },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      tags: { include: { tag: true } },
    },
  })

  if (!article) notFound()

  const rawHtml = tiptapToHtml(article.content)
  const bodyHtml = removeLeadingTitle(rawHtml, article.title)

  let authorName = 'Editorial Team'
  if (article.authorId) {
    const author = await prisma.user.findUnique({
      where: { id: article.authorId },
      select: { name: true },
    })
    if (author?.name) authorName = author.name
  }

  const related = article.categoryId
    ? await prisma.article.findMany({
        where: {
          siteId: site.id,
          categoryId: article.categoryId,
          status: 'PUBLISHED',
          deletedAt: null,
          isTest: false,
          id: { not: article.id },
        },
        include: { category: { select: { name: true, slug: true } } },
        orderBy: { publishedAt: 'desc' },
        take: 3,
      })
    : []

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://diurna.vercel.app'
  const articleSchema = generateNewsArticleSchema({
    title: article.title,
    description: article.excerpt || '',
    url: `${baseUrl}/site/${article.slug}`,
    imageUrl: `${baseUrl}/api/og/${article.id}`,
    authorName,
    publishedAt: (article.publishedAt || article.createdAt).toISOString(),
    modifiedAt: article.updatedAt.toISOString(),
    siteName: site.name,
    category: article.category?.name,
  })

  return (
    <div className="pub-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <div className="pub-main-grid">
        <article className="pub-article">
          <header className="pub-article-header">
            {article.category && (
              <Link href={`/${article.category.slug}`} className="pub-hero-label">
                {article.category.name}
              </Link>
            )}
            <h1>{article.title}</h1>
            <div className="pub-article-meta">
              <span>{authorName}</span>
              <span className="pub-article-meta-sep">|</span>
              {article.publishedAt && (
                <span>{formatDate(article.publishedAt)}</span>
              )}
              {article.category && (
                <>
                  <span className="pub-article-meta-sep">|</span>
                  <Link href={`/${article.category.slug}`}>
                    {article.category.name}
                  </Link>
                </>
              )}
            </div>
          </header>

          {/* Featured Image */}
          <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.featuredImage || getCategoryFallback(article.category?.slug)}
              alt={article.title}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>

          <WidgetHydrator html={bodyHtml} />

          {article.tags.length > 0 && (
            <div className="pub-tags">
              {article.tags.map(({ tag }) => (
                <span key={tag.id} className="pub-tag">#{tag.name}</span>
              ))}
            </div>
          )}

          <ShareButtons title={article.title} />

          {related.length > 0 && (
            <div className="pub-related">
              <h2 className="pub-related-title">Related Articles</h2>
              <div className="pub-grid">
                {related.map((rel) => (
                  <Link key={rel.id} href={`/site/${rel.slug}`} className="pub-card">
                    <div className="pub-card-thumb">&#9998;</div>
                    <div className="pub-card-body">
                      {rel.category && (
                        <span className="pub-card-badge">{rel.category.name}</span>
                      )}
                      <h3>{rel.title}</h3>
                      <div className="pub-card-date">
                        {rel.publishedAt && formatDate(rel.publishedAt)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="pub-comments">
            Comments coming soon. Stay tuned!
          </div>
        </article>

        <aside className="pub-sidebar">
          <div className="pub-ad-slot">
            Lupon Media SSP — 300x250
          </div>

          <div className="pub-subscribe">
            <SubscribeWidget siteName={site.name} />
          </div>
        </aside>
      </div>
    </div>
  )
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}
