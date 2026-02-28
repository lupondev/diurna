import Link from 'next/link'
import type { Metadata } from 'next'
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
import { PreloadHeroImage } from '@/components/public/PreloadHeroImage'
import { MetaBar } from '@/components/public/sportba/meta-bar'
import { Reactions } from '@/components/public/sportba/reactions'
import { NewsletterForm } from '@/components/public/sportba/newsletter-form'
import { canonicalUrl, toAbsUrl, buildMetadata } from '@/lib/seo'

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

  let authorName = `Redakcija ${site.name || 'Sport'}`
  let authorImage: string | null = null
  if (article.authorId && !article.aiGenerated) {
    const author = await prisma.user.findUnique({
      where: { id: article.authorId },
      select: { name: true, image: true },
    })
    if (author?.name) authorName = author.name
    if (author?.image) authorImage = author.image
  }

  const byAuthor = article.authorId
    ? await prisma.article.findMany({
        where: {
          siteId: site.id,
          authorId: article.authorId,
          status: 'PUBLISHED',
          deletedAt: null,
          isTest: false,
          id: { not: article.id },
        },
        select: { title: true, slug: true, featuredImage: true, category: { select: { slug: true, name: true } }, publishedAt: true },
        orderBy: { publishedAt: 'desc' },
        take: 3,
      })
    : []

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

  const articleTagIds = article.tags.map((t) => t.tagId)
  let tagRelated: typeof related = []

  if (articleTagIds.length > 0) {
    const tagOverlap = await prisma.article.findMany({
      where: {
        siteId: site.id,
        status: 'PUBLISHED',
        deletedAt: null,
        isTest: false,
        id: { not: article.id },
        tags: { some: { tagId: { in: articleTagIds } } },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        featuredImage: true,
        category: { select: { slug: true, name: true } },
        publishedAt: true,
        tags: { select: { tagId: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 10,
    })

    tagRelated = tagOverlap
      .map((a) => ({
        ...a,
        overlap: a.tags.filter((t) => articleTagIds.includes(t.tagId)).length,
      }))
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 3)
      .map(({ overlap: _o, tags: _t, id: _id, ...rest }) => rest)
  }

  const relatedSlugs = new Set<string>()
  const mergedRelated: typeof related = []
  for (const r of [...tagRelated, ...related]) {
    if (!relatedSlugs.has(r.slug)) {
      relatedSlugs.add(r.slug)
      mergedRelated.push(r)
    }
    if (mergedRelated.length >= 3) break
  }

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

  return { article, authorName, authorImage, byAuthor, related: mergedRelated, trending, site }
}

export type ArticleData = NonNullable<Awaited<ReturnType<typeof fetchArticle>>>

export async function buildArticleMetadata(slug: string, categorySlug?: string): Promise<Metadata> {
  const result = await fetchArticle(slug, categorySlug)
  if (!result) return { title: 'Not Found' }

  const { article } = result
  const title = article.metaTitle || article.title
  const description = article.metaDescription || article.excerpt || undefined

  // canonical path = /vijesti/{slug} — Bosnian path is always canonical
  const canonicalPath = `/vijesti/${article.slug}`

  return buildMetadata({
    pageTitle: title,
    description: description || '',
    canonicalPath,
    ogType: 'article',
    ogImage: article.featuredImage,
    publishedTime: (article.publishedAt || article.createdAt).toISOString(),
    modifiedTime: article.updatedAt.toISOString(),
    section: article.category?.name,
  })
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

function injectEntityLinks(
  html: string,
  tags: { tag: { id: string; name: string; slug?: string } }[]
): string {
  if (!tags || tags.length === 0) return html

  let result = html
  const linked = new Set<string>()

  const sortedTags = [...tags]
    .map((t) => t.tag)
    .filter((t) => t.name.length >= 3 && /^[A-ZČĆŠŽĐ]/.test(t.name))
    .sort((a, b) => b.name.length - a.name.length)

  for (const tag of sortedTags) {
    if (linked.has(tag.name.toLowerCase())) continue

    const slug =
      tag.slug ||
      tag.name
        .toLowerCase()
        .replace(/[čć]/g, 'c')
        .replace(/š/g, 's')
        .replace(/ž/g, 'z')
        .replace(/đ/g, 'dj')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

    const escaped = tag.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Word boundary after name so we don't match inside longer words (e.g. tag "La" in "LaLiga")
    const pattern = new RegExp(
      `(?<![<\\w])(${escaped})(?!\\w)(?![^<]*>)(?![^<]*</a>)`,
      'i'
    )

    const match = result.match(pattern)
    if (match && match.index !== undefined) {
      const before = result.slice(0, match.index)
      const after = result.slice(match.index + match[0].length)
      const link = `<a href="/tag/${slug}" class="sba-entity-link" style="color:#1e3a5f;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;text-decoration-thickness:1.5px;text-decoration-color:#00D4AA;font-weight:600">${match[0]}</a>`
      result = before + link + after
      linked.add(tag.name.toLowerCase())
    }
  }

  return result
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

type RelatedItem = { title: string; slug: string; category: { slug: string; name: string } | null; publishedAt: Date | null }
function injectInlineRelated(html: string, related: RelatedItem[], getArticleUrl: (r: RelatedItem) => string): string {
  if (related.length === 0) return html
  const parts = html.split(/(<\/p>\s*)/i)
  const result: string[] = []
  let paragraphCount = 0
  let relatedIndex = 0
  for (let i = 0; i < parts.length; i++) {
    result.push(parts[i])
    if (/<\/p>/i.test(parts[i])) {
      paragraphCount++
      if (paragraphCount >= 3 && relatedIndex < related.length) {
        const r = related[relatedIndex]
        const href = getArticleUrl(r)
        const cat = (r.category?.name || 'Vijesti').toUpperCase()
        result.push(
          `<div class="sba-inline-related"><p class="sba-inline-related-label">Pročitaj još</p><a href="${href}" class="sba-inline-related-link"><span class="sba-inline-related-cat">${cat}</span><span class="sba-inline-related-title">${r.title.replace(/</g, '&lt;').replace(/"/g, '&quot;')}</span></a></div>`
        )
        relatedIndex++
        paragraphCount = 0
      }
    }
  }
  return result.join('')
}

export function ArticlePage({ data }: { data: ArticleData }) {
  const { article, authorName, authorImage, byAuthor, related, trending, site } = data
  const siteName = site?.name || process.env.NEXT_PUBLIC_SITE_NAME || 'TodayFootballMatch'
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://todayfootballmatch.com').replace(/\/$/, '')
  const rawHtml = tiptapToHtml(article.content)
  const bodyHtml = removeLeadingTitle(rawHtml, article.title)
  const linkedHtml = injectEntityLinks(bodyHtml, article.tags)
  const wordCount = linkedHtml.replace(/<[^>]*>/g, '').split(/\s+/).length
  const readTime = Math.max(1, Math.round(wordCount / 200))
  const categoryName = article.category?.name || 'Vijesti'
  const categorySlug = article.category?.slug || 'vijesti'
  const pubDate = article.publishedAt || article.createdAt
  const articleUrl = canonicalUrl(`/vijesti/${article.slug}`)
  const imageUrl = article.featuredImage || getCategoryFallback(categorySlug)

  return (
    <main className="sba-article">
      {/* JSON-LD: NewsArticle with full required fields for Google News */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: article.title,
            description: article.metaDescription || article.excerpt || '',
            url: articleUrl,
            mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
            image: toAbsUrl(imageUrl),
            datePublished: pubDate.toISOString(),
            dateModified: article.updatedAt.toISOString(),
            author: { '@type': 'Person', name: authorName },
            publisher: {
              '@type': 'Organization',
              name: siteName,
              logo: { '@type': 'ImageObject', url: `${siteUrl}/logo.png` },
            },
            articleSection: categoryName,
            inLanguage: 'bs',
          }),
        }}
      />
      <PreloadHeroImage src={imageUrl || ''} />
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

          <header className="sba-article-hero">
            <img
              src={imageUrl}
              alt=""
              className="sba-article-hero-img"
              fetchPriority="high"
            />
            <div className="sba-article-hero-overlay">
              <span className="sba-article-hero-badge">{categoryName}</span>
              <h1 className="sba-article-hero-title">{article.title}</h1>
              {article.excerpt && (
                <p className="sba-article-hero-excerpt">{article.excerpt}</p>
              )}
            </div>
          </header>

          <MetaBar
            author={authorName}
            date={formatDate(pubDate)}
            readTime={readTime}
            views=""
          />

          <div className="sba-article-body">
            <WidgetHydrator html={injectInlineRelated(linkedHtml, related, getArticleUrl)} />
          </div>

          {article.tags.length > 0 && (
            <div className="sba-article-tags">
              {article.tags.map(({ tag }) => (
                <Link
                  key={tag.id}
                  href={`/tag/${tag.slug || tag.name.toLowerCase().replace(/[čć]/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z').replace(/đ/g, 'dj').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`}
                  className="sba-tag"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          )}

          <Reactions />

          <section className="sba-author-card">
            <div className="sba-author-card-inner">
              {authorImage ? (
                <img src={authorImage} alt="" className="sba-author-card-avatar" width={64} height={64} />
              ) : (
                <div className="sba-author-card-avatar sba-author-card-avatar--fallback" aria-hidden />
              )}
              <div className="sba-author-card-body">
                <span className="sba-author-card-label">Autor</span>
                <span className="sba-author-card-name">{authorName}</span>
                {byAuthor.length > 0 && (
                  <div className="sba-author-card-more">
                    <span className="sba-author-card-more-label">Još od autora</span>
                    <ul className="sba-author-card-links">
                      {byAuthor.map((a) => (
                        <li key={a.slug}>
                          <Link href={getArticleUrl(a)} className="sba-author-card-link">{a.title}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>

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
