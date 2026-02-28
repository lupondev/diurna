import { prisma } from '@/lib/prisma'
import { getDefaultSite } from '@/lib/db'
import Link from 'next/link'
import { getArticleUrl } from '@/lib/article-url'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

type Props = { params: Promise<{ slug: string }> }

function slugifyName(t: string): string {
  return t
    .toLowerCase()
    .replace(/[čć]/g, 'c')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/đ/g, 'dj')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const site = await getDefaultSite()
  if (!site) return { title: 'Tag Not Found' }

  let tag = await prisma.tag.findFirst({ where: { siteId: site.id, slug } })
  if (!tag) {
    const allTags = await prisma.tag.findMany({ where: { siteId: site.id }, take: 500 })
    tag = allTags.find((t) => slugifyName(t.name) === slug) || null
  }
  if (!tag) return { title: 'Tag Not Found' }
  return {
    title: `${tag.name} — Vijesti i članci`,
    description: `Svi članci povezani sa: ${tag.name}`,
  }
}

export default async function TagPage({ params }: Props) {
  const { slug } = await params
  const site = await getDefaultSite()
  if (!site) notFound()

  let tag = await prisma.tag.findFirst({ where: { siteId: site.id, slug } })
  if (!tag) {
    const allTags = await prisma.tag.findMany({ where: { siteId: site.id }, take: 500 })
    tag = allTags.find((t) => slugifyName(t.name) === slug) || null
  }

  if (!tag) notFound()

  const articles = await prisma.article.findMany({
    where: {
      siteId: site.id,
      status: 'PUBLISHED',
      deletedAt: null,
      isTest: false,
      tags: { some: { tagId: tag.id } },
    },
    select: {
      title: true,
      slug: true,
      excerpt: true,
      featuredImage: true,
      publishedAt: true,
      category: { select: { name: true, slug: true } },
    },
    orderBy: { publishedAt: 'desc' },
    take: 30,
  })

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px' }}>
      <nav style={{ fontSize: 13, color: '#71717A', marginBottom: 16 }}>
        <Link href="/" style={{ color: '#00A888' }}>
          Početna
        </Link>
        <span style={{ margin: '0 6px' }}>/</span>
        <span>{tag.name}</span>
      </nav>

      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#18181B', margin: 0 }}>{tag.name}</h1>
        <p style={{ fontSize: 14, color: '#71717A', marginTop: 4 }}>
          {articles.length}{' '}
          {articles.length === 1 ? 'članak' : articles.length < 5 ? 'članka' : 'članaka'}
        </p>
      </header>

      {articles.length === 0 ? (
        <p style={{ fontSize: 15, color: '#A1A1AA' }}>Nema članaka za ovaj tag.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={getArticleUrl(article)}
              style={{
                display: 'flex',
                gap: 16,
                textDecoration: 'none',
                color: 'inherit',
                padding: 16,
                borderRadius: 12,
                border: '1px solid #F4F4F5',
                transition: 'border-color 0.15s',
              }}
            >
              {article.featuredImage && (
                <img
                  src={article.featuredImage}
                  alt=""
                  style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                />
              )}
              <div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#00A888',
                    textTransform: 'uppercase',
                  }}
                >
                  {article.category?.name || 'Vijesti'}
                </span>
                <h2
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#18181B',
                    margin: '4px 0',
                    lineHeight: 1.3,
                  }}
                >
                  {article.title}
                </h2>
                {article.excerpt && (
                  <p style={{ fontSize: 13, color: '#71717A', margin: 0, lineHeight: 1.4 }}>
                    {article.excerpt.substring(0, 120)}...
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
