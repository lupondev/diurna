import { prisma } from '@/lib/prisma'
import { getDefaultSite } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const site = await getDefaultSite()
  if (!site) return { title: 'Not Found' }

  const category = await prisma.category.findFirst({
    where: { siteId: site.id, slug: params.slug, deletedAt: null },
    select: { name: true },
  })
  if (!category) return { title: 'Not Found' }

  return {
    title: `${category.name} - ${site.name}`,
    description: `Browse ${category.name} articles on ${site.name}`,
    openGraph: {
      title: `${category.name} - ${site.name}`,
      description: `Browse ${category.name} articles on ${site.name}`,
    },
  }
}

const PER_PAGE = 12

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { page?: string }
}) {
  const site = await getDefaultSite()
  if (!site) notFound()

  const category = await prisma.category.findFirst({
    where: { siteId: site.id, slug: params.slug, deletedAt: null },
  })
  if (!category) notFound()

  const page = Math.max(1, parseInt(searchParams.page || '1', 10) || 1)
  const skip = (page - 1) * PER_PAGE

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where: {
        siteId: site.id,
        categoryId: category.id,
        status: 'PUBLISHED',
        deletedAt: null,
      },
      include: { category: { select: { name: true, slug: true } } },
      orderBy: { publishedAt: 'desc' },
      skip,
      take: PER_PAGE,
    }),
    prisma.article.count({
      where: {
        siteId: site.id,
        categoryId: category.id,
        status: 'PUBLISHED',
        deletedAt: null,
      },
    }),
  ])

  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div className="pub-container">
      <div className="pub-category-header">
        <h1>{category.name}</h1>
        <p className="pub-category-count">
          {total} {total === 1 ? 'article' : 'articles'}
        </p>
      </div>

      <div className="pub-grid">
        {articles.map((article) => (
          <Link key={article.id} href={`/site/${article.slug}`} className="pub-card">
            <div className="pub-card-thumb">&#9998;</div>
            <div className="pub-card-body">
              {article.category && (
                <span className="pub-card-badge">{article.category.name}</span>
              )}
              <h3>{article.title}</h3>
              {article.excerpt && (
                <p className="pub-card-excerpt">{article.excerpt}</p>
              )}
              <div className="pub-card-date">
                {article.publishedAt && formatDate(article.publishedAt)}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pub-pagination">
          {page > 1 && (
            <Link href={`/site/category/${params.slug}?page=${page - 1}`}>
              &larr; Prev
            </Link>
          )}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            p === page ? (
              <span key={p} className="active">{p}</span>
            ) : (
              <Link key={p} href={`/site/category/${params.slug}?page=${p}`}>
                {p}
              </Link>
            )
          ))}
          {page < totalPages && (
            <Link href={`/site/category/${params.slug}?page=${page + 1}`}>
              Next &rarr;
            </Link>
          )}
        </div>
      )}
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
