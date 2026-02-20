import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getDefaultSite } from '@/lib/db'
import { AdSlot } from '@/components/public/sportba'
import { MatchOfDay } from '@/components/public/sportba/match-of-day'
import { StandingsTable } from '@/components/public/sportba/standings-table'
import { ForYou } from '@/components/public/sportba/for-you'
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

/* ── Demo Data (fallback) ── */

const HERO_DEMO = [
  {
    title: 'Haaland postiže hat-trick dok City uništava Arsenal u velikom derbiju',
    cat: 'Vijesti',
    href: '/vijesti/haaland-hat-trick-city-arsenal-derbi',
    meta: '45 min \u00b7 Premier League',
    bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  },
  {
    title: 'Barcelonin novi ugovor sa Laportom \u2014 detalji posla od 80M\u20ac',
    cat: 'Transferi',
    href: '/transferi/barcelona-laporte-ugovor-80m',
    meta: '2h \u00b7 La Liga',
    bg: 'linear-gradient(135deg, #2d1b69 0%, #11052c 100%)',
  },
  {
    title: 'VAR kontroverza: Tri penala u 10 minuta mijenjaju utakmicu',
    cat: 'Vijesti',
    href: '/vijesti/var-kontroverza-tri-penala',
    meta: '3h \u00b7 Premier League',
    bg: 'linear-gradient(135deg, #1b4332 0%, #081c15 100%)',
  },
  {
    title: 'Ligaško kolo u brojkama: 42 gola za vikend',
    cat: 'Utakmice',
    href: '/utakmice/ligasko-kolo-42-gola-vikend',
    meta: '5h \u00b7 Pregled kola',
    bg: 'linear-gradient(135deg, #6b2f00 0%, #2c1203 100%)',
  },
]

const NEWS_DEMO = [
  { cat: 'VIJESTI', title: "Mourinho se vraća: 'Imam nedovršenog posla u Premijer ligi'", time: '2h', href: '/vijesti/mourinho-povratak-premijer-liga', bg: 'linear-gradient(135deg,#1e3a5f,#0d1b2a)' },
  { cat: 'TRANSFERI', title: 'PSG spreman platiti 120M\u20ac za Floriana Wirtza', time: '4h', href: '/transferi/psg-120m-florian-wirtz', bg: 'linear-gradient(135deg,#3d1f00,#1a0d00)' },
  { cat: 'UTAKMICE', title: 'Napoli-Juventus: Conte traži osvetu protiv bivšeg kluba', time: '5h', href: '/utakmice/napoli-juventus-conte-osveta', bg: 'linear-gradient(135deg,#0d2818,#051208)' },
  { cat: 'POVREDE', title: 'Mbappé propušta El Clásico \u2014 problemi sa koljenom', time: '6h', href: '/povrede/mbappe-propusta-el-clasico', bg: 'linear-gradient(135deg,#3b0a0a,#1a0404)' },
  { cat: 'VIDEO', title: 'Top 10: Najljepši golovi vikenda u Ligi prvaka', time: '8h', href: '/video/top-10-golovi-vikenda-liga-prvaka', bg: 'linear-gradient(135deg,#1a1a2e,#0a0a14)' },
  { cat: 'VIJESTI', title: 'FIFA potvrđuje novo pravilo o ofsajdu za sezonu 2026/27', time: '10h', href: '/vijesti/fifa-novo-pravilo-ofsajd-2026', bg: 'linear-gradient(135deg,#2d2d00,#141400)' },
  { cat: 'TRANSFERI', title: 'Arsenal u pregovorima za Osimhena \u2014 ponuda od 70M\u20ac', time: '12h', href: '/transferi/arsenal-osimhen-ponuda-70m', bg: 'linear-gradient(135deg,#1e3a5f,#0d1b2a)' },
  { cat: 'UTAKMICE', title: 'Derbi della Madonnina: Inter favorit protiv slabog Milana', time: '14h', href: '/utakmice/derbi-della-madonnina-inter-milan', bg: 'linear-gradient(135deg,#0d2818,#051208)' },
]

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

const TRANSFERS = [
  { status: 'hot' as const, emoji: '\ud83d\udd25', label: 'HOT', player: 'Florian Wirtz', from: 'Leverkusen', to: 'Barcelona', fee: '120M\u20ac' },
  { status: 'confirmed' as const, emoji: '\u2705', label: 'CONFIRMED', player: 'João Neves', from: 'Benfica', to: 'Man City', fee: '85M\u20ac' },
  { status: 'rumour' as const, emoji: '\ud83d\udcac', label: 'RUMOUR', player: 'Victor Osimhen', from: 'Napoli', to: 'Arsenal', fee: '70M\u20ac' },
  { status: 'hot' as const, emoji: '\ud83d\udd25', label: 'HOT', player: 'Lamine Yamal', from: 'Barcelona', to: 'Produženje', fee: '\u2014' },
  { status: 'confirmed' as const, emoji: '\u2705', label: 'CONFIRMED', player: 'Kolo Muani', from: 'PSG', to: 'Juventus', fee: '65M\u20ac' },
  { status: 'rumour' as const, emoji: '\ud83d\udcac', label: 'RUMOUR', player: 'Alexander Isak', from: 'Newcastle', to: 'Real Madrid', fee: '90M\u20ac' },
]

const TRENDING_DEMO = [
  { title: 'Haaland hat-trick protiv Arsenala', meta: 'Vijesti \u00b7 2h', href: '/vijesti/haaland-hat-trick-city-arsenal-derbi' },
  { title: 'El Clásico pripreme bez Mbappéa', meta: 'Utakmice \u00b7 4h', href: '/utakmice/el-clasico-pripreme-bez-mbappea' },
  { title: 'Transfer Wirtza u Barcelonu', meta: 'Transferi \u00b7 5h', href: '/transferi/wirtz-transfer-barcelona' },
  { title: 'VAR kontroverza u Premijer ligi', meta: 'Vijesti \u00b7 6h', href: '/vijesti/var-kontroverza-tri-penala' },
  { title: 'Conte vs Juventus \u2014 najava utakmice', meta: 'Utakmice \u00b7 8h', href: '/utakmice/napoli-juventus-conte-osveta' },
]

const QUICK_STANDINGS = [
  { pos: 1, team: 'Arsenal', p: 24, gd: '+38', pts: 58 },
  { pos: 2, team: 'Man City', p: 24, gd: '+32', pts: 55 },
  { pos: 3, team: 'Liverpool', p: 24, gd: '+30', pts: 54 },
  { pos: 4, team: 'Aston Villa', p: 24, gd: '+18', pts: 50 },
  { pos: 5, team: 'Tottenham', p: 24, gd: '+10', pts: 45 },
]

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

export default async function HomePage() {
  // Fetch real articles from DB
  const site = await getDefaultSite()
  let dbNews: typeof NEWS_DEMO = []
  let dbHero: typeof HERO_DEMO = []
  let dbTrending: typeof TRENDING_DEMO = []

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

    if (articles.length > 0) {
      // First article → hero main, next 3 → hero sides
      const heroArticles = articles.slice(0, 4)
      dbHero = heroArticles.map((a, i) => ({
        title: a.title,
        cat: a.category?.name || 'Vijesti',
        href: `/${a.category?.slug || 'vijesti'}/${a.slug}`,
        meta: `${a.publishedAt ? timeAgo(a.publishedAt) : 'Novo'} \u00b7 ${a.category?.name || 'Vijesti'}`,
        bg: a.featuredImage
          ? `url(${a.featuredImage}) center/cover no-repeat`
          : GRADIENTS[i % GRADIENTS.length],
      }))

      // Rest → news feed
      const newsArticles = articles.slice(4)
      dbNews = newsArticles.map((a, i) => ({
        cat: (a.category?.name || 'Vijesti').toUpperCase(),
        title: a.title,
        time: a.publishedAt ? timeAgo(a.publishedAt) : 'Novo',
        href: `/${a.category?.slug || 'vijesti'}/${a.slug}`,
        bg: GRADIENTS[(i + 4) % GRADIENTS.length],
      }))

      // Trending = first 5 articles
      dbTrending = articles.slice(0, 5).map((a) => ({
        title: a.title,
        meta: `${a.category?.name || 'Vijesti'} \u00b7 ${a.publishedAt ? timeAgo(a.publishedAt) : 'Novo'}`,
        href: `/${a.category?.slug || 'vijesti'}/${a.slug}`,
      }))
    }
  }

  // Use DB data if available, otherwise fall back to demo
  const HERO = dbHero.length >= 4 ? dbHero : [...dbHero, ...HERO_DEMO.slice(dbHero.length)]
  const NEWS = dbNews.length > 0 ? [...dbNews, ...NEWS_DEMO.slice(Math.max(0, 8 - dbNews.length))] : NEWS_DEMO
  const TRENDING = dbTrending.length >= 3 ? dbTrending : [...dbTrending, ...TRENDING_DEMO.slice(dbTrending.length)]

  return (
    <main className="sba-home">
      {/* Leaderboard Ad */}
      <div className="sba-home-leaderboard">
        <AdSlot variant="leaderboard" />
      </div>

      <div className="sba-home-layout">
        {/* MAIN COLUMN */}
        <div className="sba-home-main">
          {/* Hero Bento */}
          <section className="sba-hero">
            <Link href={HERO[0].href} className="sba-hero-card sba-hero-main">
              <div className="sba-hero-bg" style={{ background: HERO[0].bg }} />
              <div className="sba-hero-content">
                <span className="sba-hero-badge">{HERO[0].cat}</span>
                <h1 className="sba-hero-title">{HERO[0].title}</h1>
                <p className="sba-hero-meta">{HERO[0].meta}</p>
              </div>
            </Link>
            {HERO.slice(1, 4).map((h, i) => (
              <Link key={i} href={h.href} className="sba-hero-card sba-hero-side">
                <div className="sba-hero-bg" style={{ background: h.bg }} />
                <div className="sba-hero-content">
                  <span className="sba-hero-badge">{h.cat}</span>
                  <h2 className="sba-hero-title">{h.title}</h2>
                </div>
              </Link>
            ))}
          </section>

          <MatchOfDay />
          <StandingsTable />
          <AdSlot variant="rectangle" />

          {/* News Feed */}
          <section>
            <div className="sba-section-head">
              <h2 className="sba-section-title">Najnovije vijesti</h2>
              <Link href="/vijesti" className="sba-section-more">Sve vijesti &rarr;</Link>
            </div>
            <div className="sba-feed">
              {NEWS.slice(0, 4).map((n, i) => (
                <Link key={i} href={n.href} className="sba-feed-card">
                  <div className="sba-feed-thumb">
                    <div className="sba-feed-thumb-bg" style={{ background: n.bg }} />
                  </div>
                  <div className="sba-feed-body">
                    <span className="sba-feed-cat">{n.cat}</span>
                    <span className="sba-feed-title">{n.title}</span>
                    <span className="sba-feed-meta">{n.time}</span>
                  </div>
                </Link>
              ))}

              {/* Native Ad */}
              <div className="sba-feed-sponsored">
                <div className="sba-feed-thumb">
                  <div className="sba-feed-thumb-bg" style={{ background: 'linear-gradient(135deg,#1a1d27,#262a38)' }} />
                </div>
                <div className="sba-feed-body">
                  <span className="sba-feed-sponsored-label">Sponzorisano</span>
                  <span className="sba-feed-title">Kladi se odgovorno &mdash; Najbolje kvote za Premijer ligu</span>
                </div>
              </div>

              {NEWS.slice(4, 8).map((n, i) => (
                <Link key={i + 4} href={n.href} className="sba-feed-card">
                  <div className="sba-feed-thumb">
                    <div className="sba-feed-thumb-bg" style={{ background: n.bg }} />
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

          {/* Transfer Radar */}
          <section>
            <div className="sba-section-head">
              <h2 className="sba-section-title">Transfer radar</h2>
              <Link href="/transferi" className="sba-section-more">Svi transferi &rarr;</Link>
            </div>
            <div className="sba-transfers-scroll">
              {TRANSFERS.map((t, i) => (
                <div key={i} className="sba-transfer-card">
                  <span className={`sba-transfer-badge sba-transfer-badge--${t.status}`}>
                    {t.emoji} {t.label}
                  </span>
                  <span className="sba-transfer-player">{t.player}</span>
                  <span className="sba-transfer-clubs">
                    {t.from} <span className="sba-transfer-arrow">&rarr;</span> {t.to}
                  </span>
                  <span className="sba-transfer-fee">{t.fee}</span>
                </div>
              ))}
            </div>
          </section>

          <ForYou />
        </div>

        {/* RIGHT RAIL */}
        <aside className="sba-home-rail">
          <div className="sba-rail-card">
            <div className="sba-rail-head">U trendu</div>
            <div className="sba-trending-list">
              {TRENDING.map((t, i) => (
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

          <div className="sba-rail-sticky">
            <AdSlot variant="skyscraper" />

            <div className="sba-rail-card" style={{ marginTop: 24 }}>
              <div className="sba-rail-head">Premier League</div>
              <table className="sba-quicktable">
                <thead>
                  <tr>
                    <th>Klub</th>
                    <th>U</th>
                    <th>GR</th>
                    <th>B</th>
                  </tr>
                </thead>
                <tbody>
                  {QUICK_STANDINGS.map((r) => (
                    <tr key={r.pos}>
                      <td>{r.pos}. {r.team}</td>
                      <td>{r.p}</td>
                      <td>{r.gd}</td>
                      <td className="sba-quicktable-pts">{r.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </aside>
      </div>

      <div className="sba-home-prefooter">
        <AdSlot variant="leaderboard" />
      </div>
    </main>
  )
}
