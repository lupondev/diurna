import { prisma } from '@/lib/prisma'
import { getDefaultSite } from '@/lib/db'
import { SubscribeWidget } from '@/components/subscribe-widget'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PublicHomePage() {
  const site = await getDefaultSite()
  if (!site) {
    return (
      <div className="pub-container">
        <p>No site configured.</p>
      </div>
    )
  }

  const articles = await prisma.article.findMany({
    where: {
      siteId: site.id,
      status: 'PUBLISHED',
      deletedAt: null,
    },
    include: {
      category: { select: { name: true, slug: true } },
    },
    orderBy: { publishedAt: 'desc' },
    take: 13,
  })

  const featured = articles[0]
  const grid = articles.slice(1, 9)
  const trending = articles.slice(0, 5)

  return (
    <>
      {/* Hero */}
      {featured && (
        <section className="pub-hero">
          <div className="pub-hero-inner">
            <Link href={`/site/${featured.slug}`} className="pub-hero-link">
              {featured.category && (
                <span className="pub-hero-label">{featured.category.name}</span>
              )}
              <h1>{featured.title}</h1>
              {featured.excerpt && (
                <p className="pub-hero-excerpt">{featured.excerpt}</p>
              )}
              <div className="pub-hero-meta">
                {featured.publishedAt && formatDate(featured.publishedAt)}
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Content */}
      <div className="pub-container">
        <div className="pub-main-grid">
          {/* Articles Grid */}
          <div>
            <h2 className="pub-section-title">Latest Articles</h2>
            <div className="pub-grid">
              {grid.map((article) => (
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
          </div>

          {/* Sidebar */}
          <aside className="pub-sidebar">
            {/* Trending */}
            <div className="pub-sidebar-section">
              <div className="pub-sidebar-title">Trending</div>
              {trending.map((article, i) => (
                <Link key={article.id} href={`/site/${article.slug}`} className="pub-trending-item">
                  <span className="pub-trending-num">{i + 1}</span>
                  <div>
                    <div className="pub-trending-title">{article.title}</div>
                    <div className="pub-trending-date">
                      {article.publishedAt && formatDate(article.publishedAt)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Subscribe */}
            <div className="pub-subscribe">
              <SubscribeWidget siteName={site.name} />
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}
