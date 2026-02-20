import Link from 'next/link'
import type { Metadata } from 'next'
import { AdSlot } from '@/components/public/sportba'
import '../category.css'

export const metadata: Metadata = {
  title: 'Utakmice — Diurna',
  description: 'Najave utakmica, rezultati i analize iz najpopularnijih liga.',
}

const LIVE_MATCHES = [
  { id: '1', home: 'Arsenal', away: 'Chelsea', homeScore: 2, awayScore: 1, minute: 67, league: 'Premier League', status: 'live' as const },
  { id: '2', home: 'Barcelona', away: 'Real Madrid', homeScore: 1, awayScore: 1, minute: 34, league: 'La Liga', status: 'live' as const },
  { id: '3', home: 'Bayern', away: 'Dortmund', homeScore: 3, awayScore: 0, league: 'Bundesliga', status: 'ft' as const },
  { id: '4', home: 'Inter', away: 'Milan', league: 'Serie A', time: '20:45', status: 'scheduled' as const },
  { id: '5', home: 'Liverpool', away: 'Man City', league: 'Premier League', time: '21:00', status: 'scheduled' as const },
  { id: '6', home: 'PSG', away: 'Lyon', homeScore: 2, awayScore: 2, minute: 78, league: 'Ligue 1', status: 'live' as const },
]

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

      {/* ── Live Today ── */}
      <div className="sba-cat-layout">
        <div className="sba-cat-main">
          <style>{`
.sba-live-section { margin-bottom: 32px; }
.sba-live-section-head {
  display: flex; align-items: center; gap: 8px; margin-bottom: 16px;
  font-family: var(--sba-mono); font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.1em; color: var(--sba-accent);
}
.sba-live-section-dot {
  width: 8px; height: 8px; border-radius: 50%; background: var(--sba-live);
  animation: sba-pulse 2s ease-in-out infinite;
}
.sba-live-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;
}
@media (min-width: 768px) { .sba-live-grid { grid-template-columns: repeat(3, 1fr); } }

.sba-match-card {
  display: flex; flex-direction: column; align-items: center;
  background: var(--sba-bg-1); border: 1px solid var(--sba-border);
  border-radius: 12px; padding: 16px; text-decoration: none;
  cursor: pointer; transition: all 0.15s ease;
}
.sba-match-card:hover {
  background: var(--sba-bg-2); border-color: var(--sba-accent);
}
.sba-match-card--live { border-left: 3px solid var(--sba-live); }
.sba-match-card--ft { border-left: 3px solid var(--sba-text-3); }

.sba-match-card-league {
  font-family: var(--sba-mono); font-size: 10px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--sba-text-3); margin-bottom: 10px;
}
.sba-match-card-teams {
  display: flex; align-items: center; justify-content: center;
  gap: 12px; width: 100%;
}
.sba-match-card-team {
  font-size: 14px; font-weight: 600; color: var(--sba-text-0);
  text-align: center; flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sba-match-card-score {
  font-family: var(--sba-mono); font-size: 24px; font-weight: 700;
  color: var(--sba-text-0); flex-shrink: 0;
}
.sba-match-card-time {
  font-family: var(--sba-mono); font-size: 16px; font-weight: 600;
  color: var(--sba-text-2); flex-shrink: 0;
}
.sba-match-card-status {
  display: flex; align-items: center; gap: 4px;
  font-family: var(--sba-mono); font-size: 12px; font-weight: 600;
  margin-top: 8px;
}
.sba-match-card-status--live { color: var(--sba-live); }
.sba-match-card-status--ft { color: var(--sba-text-3); }
.sba-match-card-status--sched { color: var(--sba-text-3); }
.sba-match-card-status-dot {
  width: 6px; height: 6px; border-radius: 50%; background: var(--sba-live);
  animation: sba-pulse 2s ease-in-out infinite;
}
          `}</style>

          <section className="sba-live-section">
            <div className="sba-live-section-head">
              <span className="sba-live-section-dot" />
              Danas uživo
            </div>
            <div className="sba-live-grid">
              {LIVE_MATCHES.map((m) => (
                <Link
                  key={m.id}
                  href={`/utakmica/${m.id}`}
                  className={`sba-match-card${m.status === 'live' ? ' sba-match-card--live' : ''}${m.status === 'ft' ? ' sba-match-card--ft' : ''}`}
                >
                  <div className="sba-match-card-league">{m.league}</div>
                  <div className="sba-match-card-teams">
                    <span className="sba-match-card-team">{m.home}</span>
                    {m.status === 'live' || m.status === 'ft' ? (
                      <span className="sba-match-card-score">{m.homeScore} &ndash; {m.awayScore}</span>
                    ) : (
                      <span className="sba-match-card-time">{m.time}</span>
                    )}
                    <span className="sba-match-card-team">{m.away}</span>
                  </div>
                  <div className={`sba-match-card-status sba-match-card-status--${m.status === 'scheduled' ? 'sched' : m.status}`}>
                    {m.status === 'live' && (
                      <>
                        <span className="sba-match-card-status-dot" />
                        UŽIVO &middot; {m.minute}&apos;
                      </>
                    )}
                    {m.status === 'ft' && 'Završeno'}
                    {m.status === 'scheduled' && m.time}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ── Article Feed ── */}
          <div className="sba-section-head" style={{ marginBottom: 16 }}>
            <h2 className="sba-section-title" style={{ fontFamily: 'var(--sba-mono)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sba-text-3)' }}>
              Vijesti o utakmicama
            </h2>
          </div>

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
