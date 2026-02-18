import { prisma } from '@/lib/prisma'
import { getDefaultSite } from '@/lib/db'
import { tiptapToHtml } from '@/lib/tiptap-html'
import { generateNewsArticleSchema } from '@/lib/seo'
import { ArticleRenderer } from '@/components/public/article-renderer'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

type Props = {
  params: { category: string; slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const site = await getDefaultSite()
  if (!site) return { title: 'Not Found' }

  const category = await prisma.category.findFirst({
    where: { siteId: site.id, slug: params.category, deletedAt: null },
  })
  if (!category) return { title: 'Not Found' }

  const article = await prisma.article.findFirst({
    where: { siteId: site.id, slug: params.slug, categoryId: category.id, status: 'PUBLISHED', deletedAt: null },
    select: { title: true, excerpt: true, metaTitle: true, metaDescription: true },
  })
  if (!article) return { title: 'Not Found' }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://diurna.vercel.app'
  const title = article.metaTitle || article.title

  return {
    title: `${title} - ${site.name}`,
    description: article.metaDescription || article.excerpt || undefined,
    openGraph: {
      title,
      description: article.metaDescription || article.excerpt || undefined,
      type: 'article',
      images: [`${baseUrl}/api/og?title=${encodeURIComponent(article.title)}`],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: article.metaDescription || article.excerpt || undefined,
      images: [`${baseUrl}/api/og?title=${encodeURIComponent(article.title)}`],
    },
  }
}

export default async function PublicArticlePage({ params }: Props) {
  const site = await getDefaultSite()
  if (!site) notFound()

  const category = await prisma.category.findFirst({
    where: { siteId: site.id, slug: params.category, deletedAt: null },
  })
  if (!category) notFound()

  const article = await prisma.article.findFirst({
    where: {
      siteId: site.id,
      slug: params.slug,
      categoryId: category.id,
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

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://diurna.vercel.app'
  const articleSchema = generateNewsArticleSchema({
    title: article.title,
    description: article.metaDescription || article.excerpt || '',
    url: `${baseUrl}/${category.slug}/${article.slug}`,
    imageUrl: `${baseUrl}/api/og/${article.id}`,
    authorName,
    publishedAt: (article.publishedAt || article.createdAt).toISOString(),
    modifiedAt: article.updatedAt.toISOString(),
    siteName: site.name,
    category: category.name,
  })

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px', fontFamily: 'var(--sans)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Breadcrumb */}
      <nav style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20, display: 'flex', gap: 6, alignItems: 'center' }}>
        <Link href="/site" style={{ color: '#64748b', textDecoration: 'none' }}>Home</Link>
        <span>/</span>
        <Link href={`/site/category/${category.slug}`} style={{ color: '#f97316', textDecoration: 'none', fontWeight: 600 }}>
          {category.name}
        </Link>
      </nav>

      {/* Article Header */}
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', lineHeight: 1.3, margin: '0 0 16px' }}>
          {article.title}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#64748b' }}>
          <span style={{ fontWeight: 600 }}>{authorName}</span>
          <span style={{ color: '#d1d5db' }}>|</span>
          {article.publishedAt && (
            <time dateTime={article.publishedAt.toISOString()}>
              {new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(article.publishedAt)}
            </time>
          )}
          <span style={{ color: '#d1d5db' }}>|</span>
          <span style={{ color: '#f97316', fontWeight: 600 }}>{category.name}</span>
        </div>
      </header>

      {/* Article Body */}
      <article style={{ fontSize: 16, lineHeight: 1.75, color: '#374151' }}>
        <ArticleRenderer html={bodyHtml} />
      </article>

      {/* Tags */}
      {article.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 32, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
          {article.tags.map(({ tag }) => (
            <span key={tag.id} style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: 12, fontWeight: 500 }}>
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <footer style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
        <p style={{ fontSize: 10, color: '#d1d5db' }}>
          Diurna v1.0 &middot; Powered by Lupon Media SSP &middot; &copy; 2026
        </p>
      </footer>
    </div>
  )
}
