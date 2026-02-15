'use client'

import Link from 'next/link'

const articles = [
  { badge: 'live', label: '● LIVE', cat: 'Premier League', title: 'Man City vs Liverpool: Title Race Showdown', excerpt: 'The two title rivals meet at the Etihad in what could be a defining moment in the Premier League race.', time: 'Live Now', comments: 156 },
  { badge: 'video', label: '▶ 8:24', cat: 'Video Analysis', title: "Tactical Breakdown: Liverpool's New Formation", excerpt: "How Slot's 4-3-3 is revolutionizing Liverpool's approach and dominating midfield battles.", time: '2h ago', comments: 89 },
  { badge: 'exclusive', label: 'EXCLUSIVE', cat: 'Interview', title: 'Haaland: "I\'m Just Getting Started"', excerpt: 'The Man City striker opens up about his record-breaking season and future ambitions.', time: '4h ago', comments: 234 },
]

const opinions = [
  { avatar: '👨‍💼', name: 'James Martinez', role: 'Chief Football Writer', quote: '"Why Real Madrid\'s depth makes them Champions League favorites"' },
  { avatar: '👩‍💼', name: 'Sarah Chen', role: 'Tactics Analyst', quote: '"Arsenal\'s set-piece revolution is changing English football"' },
  { avatar: '👨‍💼', name: 'Marco Rossi', role: 'Serie A Correspondent', quote: '"Inter\'s dominance signals a new era for Italian football"' },
  { avatar: '👨‍💼', name: 'David Wilson', role: 'Transfer Expert', quote: '"The summer window will reshape the Premier League top four"' },
]

export default function EditorialTemplate() {
  return (
    <div style={{
      '--bg-primary': '#FFFFFF', '--bg-secondary': '#F8FAFC', '--bg-tertiary': '#F1F5F9',
      '--bg-card': '#FFFFFF', '--bg-hover': '#F1F5F9', '--text-primary': '#0F172A',
      '--text-secondary': '#475569', '--text-tertiary': '#94A3B8', '--border': '#E2E8F0',
      '--accent': '#00D4AA', '--accent-light': '#E6FBF6', '--accent-dark': '#00A888',
      '--coral': '#EF4444', '--coral-light': '#FEF2F2',
    } as React.CSSProperties}>
      <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontFamily: 'var(--sans)' }}>

        {/* Back bar */}
        <div style={{ padding: '12px 24px', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/widgets" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-dark)', textDecoration: 'none' }}>← Back to Dashboard</Link>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>Template Preview: Clean Editorial</span>
        </div>

        {/* Header */}
        <header style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontFamily: 'var(--disp)', fontSize: '2rem', color: 'var(--text-primary)', letterSpacing: '-.02em' }}>SportNews<span style={{ color: 'var(--accent)' }}>.</span></span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Saturday, February 15, 2025</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button style={{ padding: '10px 16px', fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 10, background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>🔍 Search</button>
                <button style={{ padding: '10px 20px', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 10, background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Sign In</button>
                <button style={{ padding: '10px 20px', fontSize: 14, fontWeight: 600, background: 'var(--accent)', color: 'var(--bg-primary)', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Subscribe</button>
              </div>
            </div>
            <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0' }}>
              {['Home', 'Premier League', 'La Liga', 'Champions League', 'Bundesliga', 'Serie A', 'Transfers', 'Analysis'].map((l, i) => (
                <span key={l} style={{ padding: '8px 16px', fontSize: 14, fontWeight: 600, color: i === 0 ? 'var(--accent-dark)' : 'var(--text-secondary)', background: i === 0 ? 'var(--accent-light)' : 'transparent', borderRadius: 10 }}>{l}</span>
              ))}
              <span style={{ padding: '8px 16px', fontSize: 14, fontWeight: 600, color: 'var(--coral)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, background: 'var(--coral)', borderRadius: '50%' }} />Live Scores
              </span>
            </nav>
          </div>
        </header>

        {/* Breaking Bar */}
        <div style={{ background: 'var(--coral)', color: 'white', padding: '10px 0' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, padding: '4px 12px', background: 'rgba(255,255,255,.2)', borderRadius: 6, flexShrink: 0 }}>BREAKING</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Kylian Mbappé agrees personal terms with Real Madrid — Official announcement expected within 24 hours</span>
          </div>
        </div>

        <main style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 40, padding: '40px 0' }}>
            {/* Content */}
            <div>
              {/* Hero */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, marginBottom: 48 }}>
                <div style={{ borderRadius: 20, overflow: 'hidden', background: 'var(--bg-card)', boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}>
                  <div style={{ aspectRatio: '16/10', background: 'linear-gradient(135deg, #1e3a5f, #0f2744)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, position: 'relative' }}>
                    ⚽
                  </div>
                  <div style={{ padding: 28 }}>
                    <span style={{ display: 'inline-block', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--accent-dark)', background: 'var(--accent-light)', padding: '4px 12px', borderRadius: 6, marginBottom: 12 }}>El Cl&aacute;sico Preview</span>
                    <h1 style={{ fontFamily: 'var(--disp)', fontSize: '1.75rem', fontWeight: 500, lineHeight: 1.25, color: 'var(--text-primary)', marginBottom: 12 }}>Can Barcelona Stop Vin&iacute;cius Jr at the Bernab&eacute;u? Complete Tactical Analysis</h1>
                    <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>Real Madrid host Barcelona in Sunday&apos;s El Cl&aacute;sico with just three points separating the rivals.</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: 'var(--text-tertiary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, background: 'var(--accent-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent-dark)' }}>JM</div>
                        James Martinez
                      </div>
                      <span>15 min read</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { cat: 'Transfer', title: 'Mbappé Agrees Personal Terms with Real Madrid', time: '45 minutes ago' },
                    { cat: 'Champions League', title: 'Bayern Edge Past Arsenal 2-1 in UCL Thriller', time: '2 hours ago' },
                    { cat: 'Premier League', title: 'Haaland Hat-trick Fires City to Crucial Win', time: '3 hours ago' },
                    { cat: 'Serie A', title: 'Inter Clinch Serie A Title with Three Games Left', time: '5 hours ago' },
                  ].map((c) => (
                    <div key={c.title} style={{ display: 'flex', gap: 16, padding: 16, background: 'var(--bg-card)', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,.08)', transition: 'all .2s' }}>
                      <div style={{ width: 100, height: 80, borderRadius: 10, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>⚽</div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--coral)', marginBottom: 4 }}>{c.cat}</span>
                        <h3 style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35, flex: 1 }}>{c.title}</h3>
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>{c.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Latest News */}
              <section style={{ marginBottom: 48 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 12, borderBottom: '2px solid var(--text-primary)' }}>
                  <h2 style={{ fontFamily: 'var(--disp)', fontSize: '1.5rem' }}>Latest News</h2>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['All', 'Premier League', 'La Liga', 'Transfers'].map((t, i) => (
                      <span key={t} style={{ padding: '6px 14px', fontSize: 13, fontWeight: 600, color: i === 0 ? 'var(--accent-dark)' : 'var(--text-tertiary)', background: i === 0 ? 'var(--accent-light)' : 'transparent', borderRadius: 10 }}>{t}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                  {articles.map((a) => (
                    <div key={a.title} style={{ background: 'var(--bg-card)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.08)', transition: 'all .2s' }}>
                      <div style={{ position: 'relative', aspectRatio: '16/10', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                        ⚽
                        {a.badge && (
                          <span style={{
                            position: 'absolute', top: 12, left: 12, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                            background: a.badge === 'live' ? 'var(--coral)' : a.badge === 'video' ? 'rgba(0,0,0,.75)' : '#F59E0B',
                            color: a.badge === 'exclusive' ? 'var(--text-primary)' : '#fff',
                          }}>{a.label}</span>
                        )}
                      </div>
                      <div style={{ padding: 20 }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--accent-dark)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>{a.cat}</span>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.4, marginBottom: 10 }}>{a.title}</h3>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.excerpt}</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-tertiary)' }}>
                          <span>{a.time}</span><span>{a.comments} comments</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Expert Opinions */}
              <section style={{ marginBottom: 48 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 12, borderBottom: '2px solid var(--text-primary)' }}>
                  <h2 style={{ fontFamily: 'var(--disp)', fontSize: '1.5rem' }}>Expert Opinions</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                  {opinions.map((o) => (
                    <div key={o.name} style={{ padding: 20, background: 'var(--bg-card)', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,.08)', textAlign: 'center', borderTop: '3px solid var(--accent)' }}>
                      <div style={{ width: 64, height: 64, background: 'var(--bg-tertiary)', borderRadius: '50%', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{o.avatar}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{o.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>{o.role}</div>
                      <p style={{ fontFamily: 'var(--disp)', fontSize: 15, fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{o.quote}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {/* Matches */}
              <div style={{ background: 'var(--bg-card)', borderRadius: 20, boxShadow: '0 1px 3px rgba(0,0,0,.08)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700 }}>⚽ Live Scores</h3>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>See all</span>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  {[
                    { league: 'Premier League', home: '🔵 Man City', away: 'Liverpool 🔴', score: '2 - 1', min: "78'", live: true },
                    { league: 'La Liga', home: '⚪ Real Madrid', away: 'Barcelona 🔵🔴', score: '1 - 1', min: "62'", live: true },
                    { league: 'Serie A', home: '⚫🔵 Inter', away: 'Juventus ⚪⚫', score: '20:45', min: '', live: false },
                  ].map((m) => (
                    <div key={m.league} style={{ padding: 14, background: m.live ? 'var(--coral-light)' : 'var(--bg-secondary)', borderRadius: 10, marginBottom: 10, borderLeft: m.live ? '3px solid var(--coral)' : 'none' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 10 }}>{m.league}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                        <span>{m.home}</span>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: m.live ? '1.1rem' : 11, fontWeight: 800 }}>{m.score}</div>
                          {m.min && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: 'var(--coral)' }}>{m.min}</div>}
                        </div>
                        <span>{m.away}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Poll */}
              <div style={{ background: 'var(--bg-card)', borderRadius: 20, boxShadow: '0 1px 3px rgba(0,0,0,.08)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700 }}>🗳️ Fan Poll</h3>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Who will win El Cl&aacute;sico?</p>
                  {[
                    { label: 'Real Madrid', pct: 45 },
                    { label: 'Barcelona', pct: 35 },
                    { label: 'Draw', pct: 20 },
                  ].map((o) => (
                    <div key={o.label} style={{ position: 'relative', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${o.pct}%`, background: 'var(--accent-light)', transition: 'width .5s' }} />
                      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{o.label}</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: 'var(--accent-dark)' }}>{o.pct}%</span>
                      </div>
                    </div>
                  ))}
                  <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>12,847 votes</p>
                </div>
              </div>

              {/* Newsletter */}
              <div style={{ padding: 24, background: 'linear-gradient(135deg, var(--accent-light), #E0FFF8)', borderRadius: 20, textAlign: 'center' }}>
                <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Never Miss a Goal</h4>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Get the latest football news delivered to your inbox</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ flex: 1, padding: '12px 14px', border: '2px solid var(--border)', borderRadius: 10, fontSize: 14, background: 'var(--bg-primary)' }} placeholder="Your email" readOnly />
                  <button style={{ padding: '12px 20px', background: 'var(--accent)', color: 'var(--bg-primary)', fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Subscribe</button>
                </div>
              </div>
            </aside>
          </div>
        </main>

        {/* Footer */}
        <footer style={{ background: 'var(--text-primary)', color: 'var(--bg-secondary)', marginTop: 60, padding: '48px 0 24px' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,.1)', fontSize: 13, color: 'var(--text-tertiary)' }}>
              <span>&copy; 2025 SportNews. All rights reserved.</span>
              <span style={{ fontSize: 12 }}>Powered by <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Diurna</span></span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
