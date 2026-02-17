import Link from 'next/link'
import type { Metadata } from 'next'
import { AdSlot } from '@/components/public/sportba'
import '../category.css'

export const metadata: Metadata = {
  title: 'Vijesti — Sport.ba',
  description: 'Najnovije sportske vijesti iz svijeta fudbala, košarke i ostalih sportova.',
}

const ARTICLES = [
  { slug: 'haaland-hat-trick-city-arsenal-derbi', title: 'Haaland postiže hat-trick dok City uništava Arsenal u velikom derbiju', time: '45 min', league: 'Premier League', bg: 'linear-gradient(135deg,#1a1a2e,#0f3460)' },
  { slug: 'mourinho-povratak-premijer-liga', title: "Mourinho se vraća: 'Imam nedovršenog posla u Premijer ligi'", time: '2h', league: 'Premier League', bg: 'linear-gradient(135deg,#1e3a5f,#0d1b2a)' },
  { slug: 'var-kontroverza-tri-penala', title: 'VAR kontroverza: Tri penala u 10 minuta mijenjaju utakmicu', time: '3h', league: 'Premier League', bg: 'linear-gradient(135deg,#1b4332,#081c15)' },
  { slug: 'fifa-novo-pravilo-ofsajd-2026', title: 'FIFA potvrđuje novo pravilo o ofsajdu za sezonu 2026/27', time: '10h', league: 'FIFA', bg: 'linear-gradient(135deg,#2d2d00,#141400)' },
  { slug: 'arsenal-liga-prvaka-pohod-2025', title: 'Arsenal na pragu historije — pohod ka prvom naslovu u Ligi prvaka', time: '1d', league: 'Liga prvaka', bg: 'linear-gradient(135deg,#3b0a0a,#1a0404)' },
  { slug: 'guardiola-priznaje-arsenal-najbolji', title: 'Guardiola priznaje: Arsenal je najbolji tim u Engleskoj', time: '1d', league: 'Premier League', bg: 'linear-gradient(135deg,#1e3a5f,#0d1b2a)' },
  { slug: 'premier-liga-pregled-24-kola', title: 'Pregled 24. kola Premijer lige — sve utakmice i rezultati', time: '2d', league: 'Premier League', bg: 'linear-gradient(135deg,#0d2818,#051208)' },
  { slug: 'serie-a-napoli-dominacija', title: 'Napoli nastavlja dominaciju u Seriji A — Conte genij', time: '2d', league: 'Serie A', bg: 'linear-gradient(135deg,#1a1a2e,#0a0a14)' },
]

export default function VijestiPage() {
  return (
    <main className="sba-cat">
      <div className="sba-cat-header">
        <h1 className="sba-cat-title">Vijesti</h1>
        <p className="sba-cat-desc">Najnovije sportske vijesti iz svijeta fudbala</p>
      </div>

      <div className="sba-cat-layout">
        <div className="sba-cat-main">
          {/* Featured */}
          <Link href={`/vijesti/${ARTICLES[0].slug}`} className="sba-cat-featured">
            <div className="sba-cat-featured-bg" style={{ background: ARTICLES[0].bg }} />
            <div className="sba-cat-featured-content">
              <span className="sba-cat-badge">Vijesti</span>
              <h2 className="sba-cat-featured-title">{ARTICLES[0].title}</h2>
              <span className="sba-cat-featured-meta">{ARTICLES[0].time} · {ARTICLES[0].league}</span>
            </div>
          </Link>

          {/* Grid */}
          <div className="sba-cat-grid">
            {ARTICLES.slice(1).map((a) => (
              <Link key={a.slug} href={`/vijesti/${a.slug}`} className="sba-cat-card">
                <div className="sba-cat-card-thumb">
                  <div className="sba-cat-card-thumb-bg" style={{ background: a.bg }} />
                </div>
                <div className="sba-cat-card-body">
                  <span className="sba-cat-card-title">{a.title}</span>
                  <span className="sba-cat-card-meta">{a.time} · {a.league}</span>
                </div>
              </Link>
            ))}
          </div>

          <AdSlot variant="rectangle" />
        </div>

        <aside className="sba-cat-rail">
          <AdSlot variant="skyscraper" />
        </aside>
      </div>
    </main>
  )
}
