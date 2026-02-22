import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getDefaultSite } from '@/lib/db'
import { tiptapToHtml } from '@/lib/tiptap-html'
import { WidgetHydrator } from '@/components/public/widget-hydrator'
import { getArticleUrl } from '@/lib/article-url'
import { AdSlot } from '@/components/public/sportba'
import {
  ReadingProgress,
  ScrollDepthTracker,
  FloatingShareBar,
  BackToTop,
} from '@/components/public/sportba/article-widgets'
import { MetaBar } from '@/components/public/sportba/meta-bar'
import { Reactions } from '@/components/public/sportba/reactions'
import { NewsletterForm } from '@/components/public/sportba/newsletter-form'

export async function fetchArticle(slug: string, categorySlug?: string) {
  const site = await getDefaultSite()
  if (!site) return null

  const where: Record<string, unknown> = {
    siteId: site.id,
    slug,
    status: 'PUBLISHED',
    deletedAt: null,
    isTest: false,
  }
  if (categorySlug) {
    const category = await prisma.category.findFirst({
      where: { siteId: site.id, slug: categorySlug, deletedAt: null },
    })
    if (category) where.categoryId = category.id
  }

  const article = await prisma.article.findFirst({
    where,
    include: {
      category: { select: { id: true, name: true, slug: true } },
      tags: { include: { tag: true } },
    },
  })

  if (!article) return null

  let authorName = `Redakcija ${site?.name || 'Diurna'}`
  if (article.authorId && !article.aiGenerated) {
    const author = await prisma.user.findUnique({
      where: { id: article.authorId },
      select: { name: true },
    })
    if (author?.name) authorName = author.name
  }

  const related = await prisma.article.findMany({
    where: {
      siteId: site.id,
      categoryId: article.categoryId,
      status: 'PUBLISHED',
      deletedAt: null,
      isTest: false,
      id: { not: article.id },
    },
    select: { title: true, slug: true, featuredImage: true, category: { select: { slug: true, name: true } }, publishedAt: true },
    orderBy: { publishedAt: 'desc' },
    take: 3,
  })

  const trending = await prisma.article.findMany({
    where: {
      siteId: site.id,
      status: 'PUBLISHED',
      deletedAt: null,
      isTest: false,
      id: { not: article.id },
    },
    select: { title: true, slug: true, category: { select: { slug: true, name: true } }, publishedAt: true },
    orderBy: { publishedAt: 'desc' },
    take: 5,
  })

  return { article, authorName, related, trending, site }
}

export type ArticleData = NonNullable<Awaited<ReturnType<typeof fetchArticle>>>

export async function buildArticleMetadata(slug: string, categorySlug?: string): Promise<Metadata> {
  const result = await fetchArticle(slug, categorySlug)
  if (!result) return { title: 'Not Found' }

  const { article, site } = result
  const siteName = site?.name || 'Diurna'
  const title = article.metaTitle || article.title
  const description = article.metaDescription || article.excerpt || undefined
  const imageUrl = article.featuredImage || '/images/og-default.svg'

  return {
    title: `${title} | ${siteName}`,
    description,
    openGraph: {
      title,
      description,
      images: [imageUrl],
      type: 'article',
      publishedTime: (article.publishedAt || article.createdAt).toISOString(),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

function formatDate(date: Date): string {
  const formatted = new Intl.DateTimeFormat('bs-BA', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
  return formatted.replace(/\.+$/, '') + '.'
}

function removeLeadingTitle(html: string, title: string): string {
  const normalized = title.trim().toLowerCase()
  const match = html.match(/^\s*<(h[12])[^>]*>(.*?)<\/\1>/i)
  if (match && match[2].trim().toLowerCase() === normalized) {
    return html.slice(match[0].length).trim()
  }
  return html
}

function getCategoryFallback(slug?: string): string {
  const map: Record<string, string> = {
    transferi: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1080&q=80',
    utakmice: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1080&q=80',
    povrede: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=1080&q=80',
    vijesti: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1080&q=80',
  }
  return map[slug || ''] || 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1080&q=80'
}

export function ArticlePage({ data }: { data: ArticleData }) {
  const { article, authorName, related, trending, site } = data
  const siteName = site?.name || 'Diurna'
  const rawHtml = tiptapToHtml(article.content)
  const bodyHtml = removeLeadingTitle(rawHtml, article.title)
  const wordCount = bodyHtml.replace(/<[^>]*>/g, '').split(/\s+/).length
  const readTime = Math.max(1, Math.round(wordCount / 200))
  const categoryName = article.category?.name || 'Vijesti'
  const categorySlug = article.category?.slug || 'vijesti'
  const pubDate = article.publishedAt || article.createdAt

  return (
    <main className="sba-article">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: article.title,
            description: article.metaDescription || article.excerpt || '',
            datePublished: pubDate.toISOString(),
            dateModified: article.updatedAt.toISOString(),
            author: { '@type': 'Person', name: authorName },
            publisher: { '@type': 'Organization', name: siteName },
            articleSection: categoryName,
          }),
        }}
      />
      <ReadingProgress />
      <ScrollDepthTracker />

      <div className="sba-article-leaderboard">
        <AdSlot variant="leaderboard" />
      </div>

      <div className="sba-article-layout">
        <article className="sba-article-main">
          <nav className="sba-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Početna</Link>
            <span className="sba-breadcrumb-sep">/</span>
            <Link href={`/${categorySlug}`}>{categoryName}</Link>
          </nav>

          <span className="sba-article-cat">{categoryName}</span>
          <h1 className="sba-article-title">{article.title}</h1>

          {article.excerpt && (
            <p className="sba-article-subtitle">{article.excerpt}</p>
          )}

          <MetaBar
            author={authorName}
            date={formatDate(pubDate)}
            readTime={readTime}
            views=""
          />

          <div className="sba-featured-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.featuredImage || getCategoryFallback(categorySlug)}
              alt={article.title}
              className="sba-featured-img-real"
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12, display: 'block' }}
            />
          </div>

          <div className="sba-article-body">
            <WidgetHydrator html={bodyHtml} />
          </div>

          {article.tags.length > 0 && (
            <div className="sba-article-tags">
              {article.tags.map(({ tag }) => (
                <Link key={tag.id} href={`/${categorySlug}`} className="sba-tag">
                  {tag.name}
                </Link>
              ))}
            </div>
          )}

          <Reactions />

          {related.length > 0 && (
            <section className="sba-related">
              <div className="sba-section-head">
                <h2 className="sba-section-title">Povezani članci</h2>
              </div>
              <div className="sba-related-grid">
                {related.map((r) => (
                  <Link key={r.slug} href={getArticleUrl(r)} className="sba-related-card">
                    <div className="sba-related-card-img">
                      {r.featuredImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.featuredImage}
                          alt={r.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <div
                          className="sba-related-card-img-bg"
                          style={{ background: 'linear-gradient(135deg, #1e3a5f, #0d1b2a)', width: '100%', height: '100%' }}
                        />
                      )}
                    </div>
                    <div className="sba-related-card-body">
                      <span className="sba-related-card-cat">{r.category?.name?.toUpperCase() || 'VIJESTI'}</span>
                      <span className="sba-related-card-title">{r.title}</span>
                      {r.publishedAt && (
                        <span className="sba-related-card-meta">{timeAgo(r.publishedAt)}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="sba-article-native-ad">
            <AdSlot variant="native" />
          </div>
        </article>

        <aside className="sba-article-sidebar">
          <div className="sba-sidebar-sticky">
            <AdSlot variant="rectangle" />

            {trending.length > 0 && (
              <div className="sba-rail-card">
                <div className="sba-rail-head">U trendu</div>
                <div className="sba-trending-list">
                  {trending.map((t, i) => (
                    <Link key={t.slug} href={getArticleUrl(t)} className="sba-trending-item">
                      <span className="sba-trending-rank">{i + 1}</span>
                      <div className="sba-trending-body">
                        <span className="sba-trending-title">{t.title}</span>
                        <span className="sba-trending-meta">
                          {t.category?.name || 'Vijesti'}{t.publishedAt ? ` · ${timeAgo(t.publishedAt)}` : ''}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <NewsletterForm />
          </div>
        </aside>
      </div>

      <div className="sba-article-prefooter">
        <AdSlot variant="leaderboard" />
      </div>

      <FloatingShareBar />
      <BackToTop />
    </main>
  )
}
