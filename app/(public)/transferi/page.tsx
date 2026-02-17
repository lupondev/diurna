import Link from 'next/link'
import type { Metadata } from 'next'
import { AdSlot } from '@/components/public/sportba'
import '../category.css'

export const metadata: Metadata = {
  title: 'Transferi — Sport.ba',
  description: 'Najnoviji transferi, glasine i potpisi iz svijeta fudbala.',
}

const ARTICLES = [
  { slug: 'psg-120m-florian-wirtz', title: 'PSG spreman platiti 120M€ za Floriana Wirtza', time: '4h', league: 'Ligue 1', bg: 'linear-gradient(135deg,#3d1f00,#1a0d00)' },
  { slug: 'barcelona-laporte-ugovor-80m', title: 'Barcelonin novi ugovor sa Laportom — detalji posla od 80M€', time: '2h', league: 'La Liga', bg: 'linear-gradient(135deg,#2d1b69,#11052c)' },
  { slug: 'arsenal-osimhen-ponuda-70m', title: 'Arsenal u pregovorima za Osimhena — ponuda od 70M€', time: '12h', league: 'Premier League', bg: 'linear-gradient(135deg,#1e3a5f,#0d1b2a)' },
  { slug: 'joao-neves-man-city-85m', title: 'João Neves potvrđen u Manchester Cityu za 85M€', time: '1d', league: 'Premier League', bg: 'linear-gradient(135deg,#1b4332,#081c15)' },
  { slug: 'kolo-muani-juventus-65m', title: 'Kolo Muani prelazi iz PSG-a u Juventus za 65M€', time: '1d', league: 'Serie A', bg: 'linear-gradient(135deg,#1a1a2e,#0a0a14)' },
  { slug: 'isak-real-madrid-glasine', title: 'Alexander Isak na radaru Real Madrida — 90M€ procjena', time: '2d', league: 'La Liga', bg: 'linear-gradient(135deg,#3b0a0a,#1a0404)' },
  { slug: 'lamine-yamal-produzenje-ugovora', title: 'Barcelona želi produžiti ugovor sa Lamineom Yamalom', time: '2d', league: 'La Liga', bg: 'linear-gradient(135deg,#2d2d00,#141400)' },
]

export default function TransferiPage() {
  return (
    <main className="sba-cat">
      <div className="sba-cat-header">
        <h1 className="sba-cat-title">Transferi</h1>
        <p className="sba-cat-desc">Najnoviji transferi, glasine i potpisi</p>
      </div>

      <div className="sba-cat-layout">
        <div className="sba-cat-main">
          <Link href={`/transferi/${ARTICLES[0].slug}`} className="sba-cat-featured">
            <div className="sba-cat-featured-bg" style={{ background: ARTICLES[0].bg }} />
            <div className="sba-cat-featured-content">
              <span className="sba-cat-badge">Transferi</span>
              <h2 className="sba-cat-featured-title">{ARTICLES[0].title}</h2>
              <span className="sba-cat-featured-meta">{ARTICLES[0].time} · {ARTICLES[0].league}</span>
            </div>
          </Link>

          <div className="sba-cat-grid">
            {ARTICLES.slice(1).map((a) => (
              <Link key={a.slug} href={`/transferi/${a.slug}`} className="sba-cat-card">
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
