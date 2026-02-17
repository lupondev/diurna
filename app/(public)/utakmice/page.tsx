import Link from 'next/link'
import type { Metadata } from 'next'
import { AdSlot } from '@/components/public/sportba'
import '../category.css'

export const metadata: Metadata = {
  title: 'Utakmice — Sport.ba',
  description: 'Najave utakmica, rezultati i analize iz najpopularnijih liga.',
}

const ARTICLES = [
  { slug: 'napoli-juventus-conte-osveta', title: 'Napoli-Juventus: Conte traži osvetu protiv bivšeg kluba', time: '5h', league: 'Serie A', bg: 'linear-gradient(135deg,#0d2818,#051208)' },
  { slug: 'el-clasico-pripreme-bez-mbappea', title: 'El Clásico pripreme bez Mbappéa', time: '4h', league: 'La Liga', bg: 'linear-gradient(135deg,#2d1b69,#11052c)' },
  { slug: 'derbi-della-madonnina-inter-milan', title: 'Derbi della Madonnina: Inter favorit protiv slabog Milana', time: '14h', league: 'Serie A', bg: 'linear-gradient(135deg,#1a1a2e,#0a0a14)' },
  { slug: 'ligasko-kolo-42-gola-vikend', title: 'Ligaško kolo u brojkama: 42 gola za vikend', time: '5h', league: 'Pregled kola', bg: 'linear-gradient(135deg,#6b2f00,#2c1203)' },
  { slug: 'arsenal-inter-najava-lp', title: 'Arsenal – Inter: Najava utakmice osmine finala Lige prvaka', time: '1d', league: 'Liga prvaka', bg: 'linear-gradient(135deg,#1e3a5f,#0d1b2a)' },
  { slug: 'bayern-psg-liga-prvaka', title: 'Bayern München – PSG: Klasik u nokaut fazi', time: '2d', league: 'Liga prvaka', bg: 'linear-gradient(135deg,#3b0a0a,#1a0404)' },
  { slug: 'premijer-liga-kolo-25-najava', title: 'Premijer liga 25. kolo — najave svih utakmica', time: '3d', league: 'Premier League', bg: 'linear-gradient(135deg,#1b4332,#081c15)' },
]

export default function UtakmicePage() {
  return (
    <main className="sba-cat">
      <div className="sba-cat-header">
        <h1 className="sba-cat-title">Utakmice</h1>
        <p className="sba-cat-desc">Najave, rezultati i analize utakmica</p>
      </div>

      <div className="sba-cat-layout">
        <div className="sba-cat-main">
          <Link href={`/utakmice/${ARTICLES[0].slug}`} className="sba-cat-featured">
            <div className="sba-cat-featured-bg" style={{ background: ARTICLES[0].bg }} />
            <div className="sba-cat-featured-content">
              <span className="sba-cat-badge">Utakmice</span>
              <h2 className="sba-cat-featured-title">{ARTICLES[0].title}</h2>
              <span className="sba-cat-featured-meta">{ARTICLES[0].time} · {ARTICLES[0].league}</span>
            </div>
          </Link>

          <div className="sba-cat-grid">
            {ARTICLES.slice(1).map((a) => (
              <Link key={a.slug} href={`/utakmice/${a.slug}`} className="sba-cat-card">
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
