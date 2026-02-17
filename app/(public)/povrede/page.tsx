import Link from 'next/link'
import type { Metadata } from 'next'
import { AdSlot } from '@/components/public/sportba'
import '../category.css'

export const metadata: Metadata = {
  title: 'Povrede — Sport.ba',
  description: 'Najnovije informacije o povredama igrača i očekivanim povratcima.',
}

const ARTICLES = [
  { slug: 'mbappe-propusta-el-clasico', title: 'Mbappé propušta El Clásico — problemi sa koljenom', time: '6h', league: 'La Liga', bg: 'linear-gradient(135deg,#3b0a0a,#1a0404)' },
  { slug: 'de-bruyne-povratak-trening', title: 'De Bruyne se vraća na trening — City dobija pojačanje', time: '1d', league: 'Premier League', bg: 'linear-gradient(135deg,#1e3a5f,#0d1b2a)' },
  { slug: 'neymar-al-hilal-operacija', title: 'Neymar ponovo operisan — sezona gotova', time: '2d', league: 'Saudi Pro League', bg: 'linear-gradient(135deg,#2d1b69,#11052c)' },
  { slug: 'gavi-barcelona-oporavak', title: 'Gavi napreduje u oporavku — Barcelona optimistična', time: '3d', league: 'La Liga', bg: 'linear-gradient(135deg,#0d2818,#051208)' },
  { slug: 'chiesa-liverpool-mišić', title: 'Chiesa pauzira 3 sedmice — povreda mišića', time: '3d', league: 'Premier League', bg: 'linear-gradient(135deg,#1a1a2e,#0a0a14)' },
  { slug: 'ter-stegen-povratak-barcelona', title: 'Ter Stegen se bliži povratku nakon teške povrede koljena', time: '4d', league: 'La Liga', bg: 'linear-gradient(135deg,#3d1f00,#1a0d00)' },
  { slug: 'arsenal-povrede-update', title: 'Arsenal: Ažuriranje stanja povreda pred Ligu prvaka', time: '5d', league: 'Premier League', bg: 'linear-gradient(135deg,#2d2d00,#141400)' },
]

export default function PovredePage() {
  return (
    <main className="sba-cat">
      <div className="sba-cat-header">
        <h1 className="sba-cat-title">Povrede</h1>
        <p className="sba-cat-desc">Informacije o povredama igrača i očekivanim povratcima</p>
      </div>

      <div className="sba-cat-layout">
        <div className="sba-cat-main">
          <Link href={`/povrede/${ARTICLES[0].slug}`} className="sba-cat-featured">
            <div className="sba-cat-featured-bg" style={{ background: ARTICLES[0].bg }} />
            <div className="sba-cat-featured-content">
              <span className="sba-cat-badge">Povrede</span>
              <h2 className="sba-cat-featured-title">{ARTICLES[0].title}</h2>
              <span className="sba-cat-featured-meta">{ARTICLES[0].time} · {ARTICLES[0].league}</span>
            </div>
          </Link>

          <div className="sba-cat-grid">
            {ARTICLES.slice(1).map((a) => (
              <Link key={a.slug} href={`/povrede/${a.slug}`} className="sba-cat-card">
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
