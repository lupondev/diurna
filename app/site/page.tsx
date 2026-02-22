import { prisma } from '@/lib/prisma'
import { getDefaultSite } from '@/lib/db'
import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const site = await getDefaultSite()
  const siteName = site?.name || 'TodayFootballMatch'
  return {
    title: `${siteName} — Football News, Match Previews & Analysis`,
    description: `Latest football news, match previews, transfer updates and live scores from ${siteName}.`,
    openGraph: {
      title: siteName,
      description: `Latest football news, match previews, transfer updates and live scores.`,
      type: 'website',
    },
  }
}

function formatDate(date: Date): string {
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date)
}

function getImageOrFallback(img: string | null, category?: string | null): string {
  if (img) return img
  const c = (category || '').toLowerCase()
  if (c.includes('transfer')) return '/images/fallback/transfer.svg'
  if (c.includes('match') || c.includes('utakmic')) return '/images/fallback/match.svg'
  if (c.includes('injur') || c.includes('povred')) return '/images/fallback/injury.svg'
  return '/images/fallback/news.svg'
}

export default async function PublicHomePage() {
  const site = await getDefaultSite()
  if (!site) return <div className="pub-container"><p style={{ color: 'var(--pub-text-muted)' }}>No site configured.</p></div>

  const articles = await prisma.article.findMany({
    where: { siteId: site.id, status: 'PUBLISHED', deletedAt: null, isTest: false },
    include: { category: { select: { name: true, slug: true } } },
    orderBy: { publishedAt: 'desc' },
    take: 20,
  })

  if (articles.length === 0) {
    return (
      <div className="pub-container" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚽</div>
        <h2 style={{ fontFamily: 'var(--disp)', fontSize: '1.5rem', fontWeight: 400, color: 'var(--pub-text)', marginBottom: 8 }}>No articles yet</h2>
        <p style={{ color: 'var(--pub-text-muted)', fontSize: '0.9rem' }}>Check back soon for the latest football coverage.</p>
      </div>
    )
  }

  const featured = articles[0]
  const secondary = articles.slice(1, 4)
  const grid = articles.slice(4, 10)
  const trending = articles.slice(0, 6)
  const latest = articles.slice(10, 16)

  // Group by category for section strips
  const byCategory: Record<string, typeof articles> = {}
  for (const a of articles) {
    const cat = a.category?.name || 'Other'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(a)
  }

  return (
    <>
      {/* ── HERO SECTION ── */}
      <section className="tfm-hero">
        <div className="tfm-hero-inner">
          {/* Featured big card */}
          <Link href={`/site/${featured.slug}`} className="tfm-hero-featured">
            <div
              className="tfm-hero-img"
              style={featured.featuredImage ? { backgroundImage: `url(${featured.featuredImage})` } : undefined}
            >
              {!featured.featuredImage && <span className="tfm-hero-img-icon">⚽</span>}
              <div className="tfm-hero-img-overlay" />
            </div>
            <div className="tfm-hero-content">
              {featured.category && (
                <span className="tfm-badge tfm-badge-accent">{featured.category.name}</span>
              )}
              <h1 className="tfm-hero-title">{featured.title}</h1>
              {featured.excerpt && <p className="tfm-hero-excerpt">{featured.excerpt}</p>}
              <div className="tfm-hero-meta">
                <span>{featured.publishedAt && formatDate(featured.publishedAt)}</span>
                <span className="tfm-hero-read">Read more →</span>
              </div>
            </div>
          </Link>

          {/* Secondary 3-stack */}
          <div className="tfm-hero-stack">
            {secondary.map((a) => (
              <Link key={a.id} href={`/site/${a.slug}`} className="tfm-hero-secondary">
                <div
                  className="tfm-hero-secondary-img"
                  style={a.featuredImage ? { backgroundImage: `url(${a.featuredImage})` } : undefined}
                >
                  {!a.featuredImage && <span style={{ fontSize: 20 }}>⚽</span>}
                </div>
                <div className="tfm-hero-secondary-body">
                  {a.category && <span className="tfm-badge">{a.category.name}</span>}
                  <h3 className="tfm-hero-secondary-title">{a.title}</h3>
                  <div className="tfm-hero-secondary-date">{a.publishedAt && formatDate(a.publishedAt)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <div className="pub-container">
        <div className="tfm-layout">

          {/* LEFT — main content */}
          <main className="tfm-main">

            {/* Latest news grid */}
            <div className="tfm-section-head">
              <h2 className="tfm-section-title">Latest News</h2>
              <Link href="/site/category/news" className="tfm-section-more">View all →</Link>
            </div>
            <div className="tfm-grid">
              {grid.map((a) => (
                <Link key={a.id} href={`/site/${a.slug}`} className="tfm-card">
                  <div
                    className="tfm-card-img"
                    style={a.featuredImage ? { backgroundImage: `url(${a.featuredImage})` } : undefined}
                  >
                    {!a.featuredImage && <span className="tfm-card-img-icon">⚽</span>}
                  </div>
                  <div className="tfm-card-body">
                    {a.category && <span className="tfm-badge">{a.category.name}</span>}
                    <h3 className="tfm-card-title">{a.title}</h3>
                    {a.excerpt && <p className="tfm-card-excerpt">{a.excerpt}</p>}
                    <div className="tfm-card-date">{a.publishedAt && formatDate(a.publishedAt)}</div>
                  </div>
                </Link>
              ))}
            </div>

            {/* More recent */}
            {latest.length > 0 && (
              <>
                <div className="tfm-section-head" style={{ marginTop: 40 }}>
                  <h2 className="tfm-section-title">More Stories</h2>
                </div>
                <div className="tfm-list">
                  {latest.map((a) => (
                    <Link key={a.id} href={`/site/${a.slug}`} className="tfm-list-item">
                      <div
                        className="tfm-list-img"
                        style={a.featuredImage ? { backgroundImage: `url(${a.featuredImage})` } : undefined}
                      >
                        {!a.featuredImage && <span style={{ fontSize: 16 }}>⚽</span>}
                      </div>
                      <div className="tfm-list-body">
                        {a.category && <span className="tfm-badge" style={{ fontSize: '0.6rem' }}>{a.category.name}</span>}
                        <h3 className="tfm-list-title">{a.title}</h3>
                        <div className="tfm-list-date">{a.publishedAt && formatDate(a.publishedAt)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </main>

          {/* RIGHT — sidebar */}
          <aside className="tfm-sidebar">

            {/* Trending */}
            <div className="tfm-sidebar-widget">
              <div className="tfm-sidebar-widget-title">🔥 Trending</div>
              {trending.map((a, i) => (
                <Link key={a.id} href={`/site/${a.slug}`} className="tfm-trending-item">
                  <span className="tfm-trending-num">{i + 1}</span>
                  <div>
                    <div className="tfm-trending-title">{a.title}</div>
                    <div className="tfm-trending-meta">
                      {a.category?.name && <span>{a.category.name}</span>}
                      <span>{a.publishedAt && formatDate(a.publishedAt)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Ad slot */}
            <div className="tfm-ad-slot">
              <div className="tfm-ad-label">Advertisement</div>
              <div className="tfm-ad-placeholder">300 × 250</div>
            </div>

            {/* Categories */}
            <div className="tfm-sidebar-widget">
              <div className="tfm-sidebar-widget-title">📂 Categories</div>
              {Object.entries(byCategory).slice(0, 8).map(([cat, arts]) => (
                <Link
                  key={cat}
                  href={`/site/category/${arts[0]?.category?.slug || cat.toLowerCase()}`}
                  className="tfm-cat-item"
                >
                  <span className="tfm-cat-name">{cat}</span>
                  <span className="tfm-cat-count">{arts.length}</span>
                </Link>
              ))}
            </div>

          </aside>
        </div>
      </div>
    </>
  )
}
