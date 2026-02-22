import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getDefaultSite } from '@/lib/db'
import { getArticleUrl } from '@/lib/article-url'
import { AdSlot } from '@/components/public/sportba'
import { MatchOfDay } from '@/components/public/sportba/match-of-day'
import { StandingsTable } from '@/components/public/sportba/standings-table'
import { ForYou } from '@/components/public/sportba/for-you'
import { ClubLogoStrip } from '@/components/public/ClubLogoStrip'
import { FixturesTicker } from '@/components/public/FixturesTicker'
import { VideoSection } from '@/components/public/VideoSection'
import { LegendsWidget } from '@/components/public/LegendsWidget'
import './home.css'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const site = await getDefaultSite()
  const siteName = site?.name || 'Diurna'
  return {
    title: `${siteName} \u2014 Sportske vijesti, transferi i rezultati`,
    description: 'Najnovije sportske vijesti, transferi, rezultati uživo i analize iz svijeta fudbala.',
  }
}

const GRADIENTS = [
  'linear-gradient(135deg,#1a1a2e,#0f3460)',
  'linear-gradient(135deg,#1e3a5f,#0d1b2a)',
  'linear-gradient(135deg,#3d1f00,#1a0d00)',
  'linear-gradient(135deg,#0d2818,#051208)',
  'linear-gradient(135deg,#3b0a0a,#1a0404)',
  'linear-gradient(135deg,#1a1a2e,#0a0a14)',
  'linear-gradient(135deg,#2d2d00,#141400)',
  'linear-gradient(135deg,#2d1b69,#11052c)',
]

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

export default async function HomePage() {
  const site = await getDefaultSite()

  type HeroItem = { title: string; cat: string; href: string; meta: string; bg: string }
  type NewsItem = { cat: string; title: string; time: string; href: string; bg: string; image: string | null }
  type TrendingItem = { title: string; meta: string; href: string }
  type TransferItem = { title: string; href: string; badge: 'hot' | 'confirmed' | 'rumour'; time: string }

  let heroItems: HeroItem[] = []
  let newsItems: NewsItem[] = []
  let trendingItems: TrendingItem[] = []
  let transferItems: TransferItem[] = []

  if (site) {
    const articles = await prisma.article.findMany({
      where: {
        siteId: site.id,
        status: 'PUBLISHED',
        deletedAt: null,
        isTest: false,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        featuredImage: true,
        publishedAt: true,
        category: { select: { name: true, slug: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 20,
    })

    // Transfer articles for Transfer Radar
    const transferArticles = await prisma.article.findMany({
      where: {
        siteId: site.id,
        status: 'PUBLISHED',
        deletedAt: null,
        isTest: false,
        category: { slug: 'transferi' },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
        excerpt: true,
        category: { select: { name: true, slug: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 5,
    })

    transferItems = transferArticles.map((a) => {
      const titleLower = a.title.toLowerCase()
      const excerptLower = (a.excerpt || '').toLowerCase()
      const combined = titleLower + ' ' + excerptLower
      let badge: 'hot' | 'confirmed' | 'rumour' = 'rumour'
      if (combined.includes('potvrđen') || combined.includes('zvanič') || combined.includes('potpis') || combined.includes('confirmed') || combined.includes('official')) {
        badge = 'confirmed'
      } else if (combined.includes('blizu') || combined.includes('dogovor') || combined.includes('ponuda') || combined.includes('pregovor') || combined.includes('close') || combined.includes('bid')) {
        badge = 'hot'
      }
      return {
        title: a.title,
        href: getArticleUrl(a),
        badge,
        time: a.publishedAt ? timeAgo(a.publishedAt) : 'Novo',
      }
    })

    if (articles.length > 0) {
      const heroArticles = articles.slice(0, 4)
      heroItems = heroArticles.map((a, i) => ({
        title: a.title,
        cat: a.category?.name || 'Vijesti',
        href: getArticleUrl(a),
        meta: `${a.publishedAt ? timeAgo(a.publishedAt) : 'Novo'} \u00b7 ${a.category?.name || 'Vijesti'}`,
        bg: a.featuredImage
          ? `url(${a.featuredImage}) center/cover no-repeat`
          : GRADIENTS[i % GRADIENTS.length],
      }))

      const newsArticles = articles.slice(4)
      newsItems = newsArticles.map((a, i) => ({
        cat: (a.category?.name || 'Vijesti').toUpperCase(),
        title: a.title,
        time: a.publishedAt ? timeAgo(a.publishedAt) : 'Novo',
        href: getArticleUrl(a),
        bg: GRADIENTS[(i + 4) % GRADIENTS.length],
        image: a.featuredImage ?? null,
      }))

      trendingItems = articles.slice(0, 5).map((a) => ({
        title: a.title,
        meta: `${a.category?.name || 'Vijesti'} \u00b7 ${a.publishedAt ? timeAgo(a.publishedAt) : 'Novo'}`,
        href: getArticleUrl(a),
      }))
    }
  }

  return (
    <main className="sba-home">
      <ClubLogoStrip />
      <FixturesTicker />

      <div className="sba-home-leaderboard">
        <AdSlot variant="leaderboard" />
      </div>

      <div className="sba-home-layout">
        {/* MAIN COLUMN */}
        <div className="sba-home-main">
          {/* Hero Bento */}
          {heroItems.length > 0 && (
            <section className="sba-hero">
              <Link href={heroItems[0].href} className="sba-hero-card sba-hero-main">
                <div className="sba-hero-bg" style={{ background: heroItems[0].bg }} />
                <div className="sba-hero-content">
                  <span className="sba-hero-badge">{heroItems[0].cat}</span>
                  <h1 className="sba-hero-title">{heroItems[0].title}</h1>
                  <p className="sba-hero-meta">{heroItems[0].meta}</p>
                </div>
              </Link>
              {heroItems.slice(1, 4).map((h, i) => (
                <Link key={i} href={h.href} className="sba-hero-card sba-hero-side">
                  <div className="sba-hero-bg" style={{ background: h.bg }} />
                  <div className="sba-hero-content">
                    <span className="sba-hero-badge">{h.cat}</span>
                    <h2 className="sba-hero-title">{h.title}</h2>
                  </div>
                </Link>
              ))}
            </section>
          )}

          <MatchOfDay />
          <StandingsTable />
          <AdSlot variant="rectangle" />

          {/* News Feed */}
          {newsItems.length > 0 && (
            <section>
              <div className="sba-section-head">
                <h2 className="sba-section-title">Najnovije vijesti</h2>
                <Link href="/vijesti" className="sba-section-more">Sve vijesti &rarr;</Link>
              </div>
              <div className="sba-feed">
                {newsItems.slice(0, 8).map((n, i) => (
                  <Link key={i} href={n.href} className="sba-feed-card">
                    <div className="sba-feed-thumb">
                      {n.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={n.image}
                          alt={n.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <div className="sba-feed-thumb-bg" style={{ background: n.bg }} />
                      )}
                    </div>
                    <div className="sba-feed-body">
                      <span className="sba-feed-cat">{n.cat}</span>
                      <span className="sba-feed-title">{n.title}</span>
                      <span className="sba-feed-meta">{n.time}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Transfer Radar */}
          {transferItems.length > 0 && (
            <section>
              <div className="sba-section-head">
                <h2 className="sba-section-title">Transfer radar</h2>
                <Link href="/transferi" className="sba-section-more">Svi transferi &rarr;</Link>
              </div>
              <div className="sba-transfers-scroll">
                {transferItems.map((t, i) => (
                  <Link key={i} href={t.href} className="sba-transfer-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <span className={`sba-transfer-badge sba-transfer-badge--${t.badge}`}>
                      {t.badge === 'hot' ? '🔥 HOT' : t.badge === 'confirmed' ? '✅ POTVRĐENO' : '💬 GLASINA'}
                    </span>
                    <span className="sba-transfer-player">{t.title}</span>
                    <span className="sba-transfer-fee">{t.time}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Video Section */}
          <VideoSection />

          <ForYou />
        </div>

        {/* RIGHT RAIL */}
        <aside className="sba-home-rail">
          {trendingItems.length > 0 && (
            <div className="sba-rail-card">
              <div className="sba-rail-head">U trendu</div>
              <div className="sba-trending-list">
                {trendingItems.map((t, i) => (
                  <Link key={i} href={t.href} className="sba-trending-item">
                    <span className="sba-trending-rank">{i + 1}</span>
                    <div className="sba-trending-body">
                      <span className="sba-trending-title">{t.title}</span>
                      <span className="sba-trending-meta">{t.meta}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <LegendsWidget />

          <div className="sba-rail-sticky">
            <AdSlot variant="skyscraper" />
          </div>
        </aside>
      </div>

      <div className="sba-home-prefooter">
        <AdSlot variant="leaderboard" />
      </div>
    </main>
  )
}
