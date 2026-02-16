import { prisma } from '@/lib/prisma'
import { getDefaultSite } from '@/lib/db'
import { tiptapToHtml } from '@/lib/tiptap-html'
import { generateNewsArticleSchema } from '@/lib/seo'
import { SubscribeWidget } from '@/components/subscribe-widget'
import { ShareButtons } from '@/components/public/share-buttons'
import { ArticleRenderer } from '@/components/public/article-renderer'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const site = await getDefaultSite()
  if (!site) return { title: 'Not Found' }

  const article = await prisma.article.findFirst({
    where: { siteId: site.id, slug: params.slug, status: 'PUBLISHED', deletedAt: null },
    select: { title: true, excerpt: true },
  })
  if (!article) return { title: 'Not Found' }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://diurna.vercel.app'

  return {
    title: `${article.title} - ${site.name}`,
    description: article.excerpt || undefined,
    openGraph: {
      title: article.title,
      description: article.excerpt || undefined,
      type: 'article',
      images: [`${baseUrl}/api/og?title=${encodeURIComponent(article.title)}`],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt || undefined,
      images: [`${baseUrl}/api/og?title=${encodeURIComponent(article.title)}`],
    },
  }
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
    },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      tags: { include: { tag: true } },
    },
  })

  if (!article) notFound()

  const bodyHtml = tiptapToHtml(article.content)

  let authorName = 'Editorial Team'
  if (article.authorId) {
    const author = await prisma.user.findUnique({
      where: { id: article.authorId },
      select: { name: true },
    })
    if (author?.name) authorName = author.name
  }

  // Related articles (same category)
  const related = article.categoryId
    ? await prisma.article.findMany({
        where: {
          siteId: site.id,
          categoryId: article.categoryId,
          status: 'PUBLISHED',
          deletedAt: null,
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
        {/* Article */}
        <article className="pub-article">
          <header className="pub-article-header">
            {article.category && (
              <Link href={`/site/category/${article.category.slug}`} className="pub-hero-label">
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
                  <Link href={`/site/category/${article.category.slug}`}>
                    {article.category.name}
                  </Link>
                </>
              )}
            </div>
          </header>

          <ArticleRenderer html={bodyHtml} />

          {/* Tags */}
          {article.tags.length > 0 && (
            <div className="pub-tags">
              {article.tags.map(({ tag }) => (
                <span key={tag.id} className="pub-tag">#{tag.name}</span>
              ))}
            </div>
          )}

          {/* Share */}
          <ShareButtons title={article.title} />

          {/* Related */}
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

          {/* Comments placeholder */}
          <div className="pub-comments">
            Comments coming soon. Stay tuned!
          </div>
        </article>

        {/* Sidebar */}
        <aside className="pub-sidebar">
          {/* Ad Slot */}
          <div className="pub-ad-slot">
            Lupon Media SSP — 300x250
          </div>

          {/* Subscribe */}
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
