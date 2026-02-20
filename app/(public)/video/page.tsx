import Link from 'next/link'
import type { Metadata } from 'next'
import { AdSlot } from '@/components/public/sportba'
import '../category.css'

export const metadata: Metadata = {
  title: 'Video — Diurna',
  description: 'Video sadržaj — golovi, highlighti, analize i intervjui.',
}

const ARTICLES = [
  { slug: 'top-10-golovi-vikenda-liga-prvaka', title: 'Top 10: Najljepši golovi vikenda u Ligi prvaka', time: '8h', league: 'Liga prvaka', bg: 'linear-gradient(135deg,#1a1a2e,#0a0a14)' },
  { slug: 'haaland-hat-trick-highlights', title: 'Haaland hat-trick — svi golovi i asistencije', time: '1d', league: 'Premier League', bg: 'linear-gradient(135deg,#1e3a5f,#0d1b2a)' },
  { slug: 'el-clasico-historijski-golovi', title: 'El Clásico: 10 historijskih golova koje nikad nećete zaboraviti', time: '2d', league: 'La Liga', bg: 'linear-gradient(135deg,#2d1b69,#11052c)' },
  { slug: 'arteta-press-konferencija', title: 'Arteta pred Inter: Kompletna press konferencija', time: '2d', league: 'Liga prvaka', bg: 'linear-gradient(135deg,#0d2818,#051208)' },
  { slug: 'saka-skills-compilation', title: 'Bukayo Saka — Skills & Goals 2025/26 kompilacija', time: '3d', league: 'Premier League', bg: 'linear-gradient(135deg,#3b0a0a,#1a0404)' },
  { slug: 'serie-a-kolo-highlights', title: 'Serie A kolo highlights — svi golovi', time: '3d', league: 'Serie A', bg: 'linear-gradient(135deg,#3d1f00,#1a0d00)' },
  { slug: 'champions-league-draw-reakcije', title: 'Liga prvaka žrijeb — reakcije i analiza', time: '5d', league: 'Liga prvaka', bg: 'linear-gradient(135deg,#2d2d00,#141400)' },
]

export default function VideoPage() {
  return (
    <main className="sba-cat">
      <div className="sba-cat-header">
        <h1 className="sba-cat-title">Video</h1>
        <p className="sba-cat-desc">Golovi, highlighti, analize i intervjui</p>
      </div>

      <div className="sba-cat-layout">
        <div className="sba-cat-main">
          <Link href={`/video/${ARTICLES[0].slug}`} className="sba-cat-featured">
            <div className="sba-cat-featured-bg" style={{ background: ARTICLES[0].bg }} />
            <div className="sba-cat-featured-content">
              <span className="sba-cat-badge">Video</span>
              <h2 className="sba-cat-featured-title">{ARTICLES[0].title}</h2>
              <span className="sba-cat-featured-meta">{ARTICLES[0].time} · {ARTICLES[0].league}</span>
            </div>
          </Link>

          <div className="sba-cat-grid">
            {ARTICLES.slice(1).map((a) => (
              <Link key={a.slug} href={`/video/${a.slug}`} className="sba-cat-card">
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
