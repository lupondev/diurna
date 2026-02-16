'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const articles = [
  { badge: 'live', badgeLabel: '● LIVE', cat: 'Premier League', title: 'Man City vs Liverpool: Title Race Showdown at the Etihad', time: '2 hours ago', comments: 89, img: '🏟️' },
  { badge: 'breaking', badgeLabel: 'BREAKING', cat: 'Transfer', title: 'Chelsea Submit €100m Bid for Osimhen', time: '3 hours ago', comments: 156, img: '💰' },
  { badge: 'video', badgeLabel: '▶ 4:32', cat: 'Analysis', title: 'Tactical Breakdown: Liverpool\'s New Formation', time: '5 hours ago', comments: 67, img: '📐' },
  { badge: '', badgeLabel: '', cat: 'Interview', title: 'Haaland: "I\'m Just Getting Started"', time: '6 hours ago', comments: 234, img: '🎤' },
]

const standings = [
  { pos: 1, icon: '🔴', name: 'Arsenal', gd: '+42', pts: 73, top: true },
  { pos: 2, icon: '🔵', name: 'Man City', gd: '+45', pts: 70, top: true },
  { pos: 3, icon: '🔴', name: 'Liverpool', gd: '+38', pts: 68, top: true },
  { pos: 4, icon: '⚪', name: 'Tottenham', gd: '+18', pts: 60, top: true },
  { pos: 5, icon: '🔵', name: 'Chelsea', gd: '+14', pts: 55, top: false },
]

const trending = [
  { num: '01', title: 'Mbapp\u00e9 Transfer Saga: Latest Updates', reads: '2.4K reading' },
  { num: '02', title: 'Champions League Quarter-Final Draw', reads: '1.8K reading' },
  { num: '03', title: 'Haaland Breaks Scoring Record', reads: '1.2K reading' },
  { num: '04', title: 'Premier League Title Race Analysis', reads: '980 reading' },
]

const navItems = [
  { label: 'Home', href: '/site' },
  { label: 'Premier League', href: '/site/category/premier-league' },
  { label: 'La Liga', href: '/site/category/la-liga' },
  { label: 'Champions League', href: '/site/category/champions-league' },
  { label: 'Bundesliga', href: '/site/category/bundesliga' },
  { label: 'Serie A', href: '/site/category/serie-a' },
  { label: 'Transfers', href: '/site/category/transfers' },
]

export default function MidnightTemplate() {
  const router = useRouter()
  const [applying, setApplying] = useState(false)

  async function applyTheme() {
    setApplying(true)
    try {
      const res = await fetch('/api/site', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'midnight' }),
      })
      if (res.ok) router.push('/site')
    } catch (e) {
      console.error('Apply theme error:', e)
    } finally {
      setApplying(false)
    }
  }

  return (
    <div style={{
      '--bg-primary': '#0A0A0F', '--bg-secondary': '#12121A', '--bg-card': '#16161F',
      '--bg-hover': '#242430', '--text-primary': '#FFFFFF', '--text-secondary': '#A1A1AA',
      '--text-tertiary': '#71717A', '--border': '#2A2A35', '--accent': '#00D4AA',
      '--accent-light': 'rgba(0,212,170,0.15)', '--coral': '#FF6B6B',
    } as React.CSSProperties}>
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'var(--sans)' }}>

        {/* Preview Banner */}
        <div style={{ padding: '14px 24px', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', borderBottom: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>This is a preview of the Midnight Pro theme</span>
          <button onClick={applyTheme} disabled={applying} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 700, background: 'var(--accent)', color: '#0A0A0F', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
            {applying ? 'Applying...' : 'Apply Theme'}
          </button>
          <Link href="/settings" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)', textDecoration: 'none', marginLeft: 8 }}>Back to Settings</Link>
        </div>

        {/* Header */}
        <header style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
              <Link href="/site" style={{ fontFamily: 'var(--disp)', fontSize: '1.75rem', color: 'var(--text-primary)', textDecoration: 'none' }}>SportNews<span style={{ color: 'var(--accent)' }}>.</span></Link>
              <div style={{ display: 'flex', gap: 12 }}>
                <Link href="/login" style={{ padding: '10px 20px', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none' }}>Sign In</Link>
                <Link href="/site#subscribe" style={{ padding: '10px 20px', fontSize: 14, fontWeight: 600, background: 'var(--accent)', color: 'var(--bg-primary)', borderRadius: 10, textDecoration: 'none', display: 'inline-block' }}>Subscribe</Link>
              </div>
            </div>
            <nav style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 0', overflowX: 'auto' }}>
              {navItems.map((l, i) => (
                <Link key={l.label} href={l.href} style={{ padding: '8px 16px', fontSize: 14, fontWeight: 600, color: i === 0 ? 'var(--accent)' : 'var(--text-secondary)', background: i === 0 ? 'var(--accent-light)' : 'transparent', borderRadius: 10, whiteSpace: 'nowrap', textDecoration: 'none' }}>{l.label}</Link>
              ))}
              <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 8px', display: 'inline-block' }} />
              <Link href="/site" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(255,107,107,0.15)', borderRadius: 10, fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--coral)', textDecoration: 'none' }}>
                <span style={{ width: 6, height: 6, background: 'var(--coral)', borderRadius: '50%', display: 'inline-block' }} />3 LIVE
              </Link>
            </nav>
          </div>
        </header>

        {/* Ticker */}
        <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: '10px 0', overflow: 'hidden' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
            <span style={{ padding: '6px 16px', background: 'var(--coral)', color: 'var(--bg-primary)', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, borderRadius: 10, marginRight: 20, flexShrink: 0 }}>BREAKING</span>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Mbapp&eacute; to Real Madrid:</strong> Official announcement expected today
            </div>
          </div>
        </div>

        <main style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32, padding: '32px 0' }}>
            {/* Content */}
            <div>
              {/* Hero */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 40 }}>
                <Link href="/site" style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', background: 'var(--bg-card)', aspectRatio: '16/10', display: 'flex', alignItems: 'flex-end', textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)' }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, opacity: .3 }}>⚽</div>
                  <div style={{ position: 'relative', padding: 32, background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 100%)', width: '100%' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--accent)', marginBottom: 12, display: 'block' }}>El Cl&aacute;sico Preview</span>
                    <h1 style={{ fontFamily: 'var(--disp)', fontSize: '2rem', fontWeight: 500, lineHeight: 1.2, marginBottom: 12 }}>Can Barcelona Stop Vin&iacute;cius Jr at the Bernab&eacute;u?</h1>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-tertiary)' }}>
                      <span>Expert Analysis</span><span>15 min read</span><span>248 comments</span>
                    </div>
                  </div>
                </Link>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {[
                    { cat: 'Transfer News', title: 'Mbapp\u00e9 Agrees Personal Terms with Real Madrid', color: '#2a4a6b' },
                    { cat: 'Champions League', title: 'Bayern Edge Past Arsenal in Thriller', color: '#4a2a2a' },
                  ].map((c) => (
                    <Link key={c.title} href="/site" style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', flex: 1, minHeight: 180, background: c.color, display: 'flex', alignItems: 'flex-end', textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ padding: 20, width: '100%' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>{c.cat}</span>
                        <h2 style={{ fontFamily: 'var(--disp)', fontSize: '1.1rem', lineHeight: 1.3, marginTop: 6 }}>{c.title}</h2>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Latest */}
              <div style={{ marginBottom: 40 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                  <h2 style={{ fontFamily: 'var(--disp)', fontSize: '1.5rem' }}>Latest News</h2>
                  <Link href="/site" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>View all &rarr;</Link>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
                  {articles.map((a) => (
                    <Link key={a.title} href="/site" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', transition: 'all .2s', textDecoration: 'none', color: 'inherit', display: 'block' }}>
                      <div style={{ position: 'relative', aspectRatio: '16/9', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
                        {a.img}
                        {a.badge && (
                          <span style={{
                            position: 'absolute', top: 12, left: 12, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                            background: a.badge === 'live' ? 'var(--coral)' : a.badge === 'breaking' ? '#FFB800' : 'rgba(0,0,0,.7)',
                            color: a.badge === 'breaking' ? 'var(--bg-primary)' : 'var(--text-primary)',
                          }}>{a.badgeLabel}</span>
                        )}
                      </div>
                      <div style={{ padding: 20 }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>{a.cat}</span>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.4, marginBottom: 12 }}>{a.title}</h3>
                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-tertiary)' }}>
                          <span>{a.time}</span><span>{a.comments} comments</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {/* Live Scores */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700 }}>Live Scores</h3>
                  <Link href="/site" style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>See all</Link>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  {[
                    { league: 'Premier League', home: 'Man City', away: 'Liverpool', score: '2 - 1', status: "78'", live: true },
                    { league: 'La Liga', home: 'Real Madrid', away: 'Barcelona', score: '1 - 1', status: "62'", live: true },
                    { league: 'Serie A', home: 'Inter', away: 'Juventus', score: '20:45', status: '', live: false },
                  ].map((m) => (
                    <div key={m.league} style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 14, marginBottom: 12, borderLeft: m.live ? '3px solid var(--coral)' : 'none' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 12 }}>{m.league}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                        <span>{m.home}</span>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: m.live ? '1.25rem' : '11px', fontWeight: 800, color: m.live ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{m.score}</div>
                          {m.status && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: 'var(--coral)' }}>{m.status}</div>}
                        </div>
                        <span>{m.away}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Standings */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700 }}>Premier League</h3>
                  <Link href="/site" style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>Full table</Link>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  {standings.map((t) => (
                    <div key={t.pos} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ width: 28, fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: t.top ? 'var(--accent)' : 'var(--text-tertiary)' }}>{t.pos}</span>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600 }}>
                        <span>{t.icon}</span>{t.name}
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-tertiary)' }}>
                        <span>{t.gd}</span>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.pts}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trending */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700 }}>Trending</h3>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  {trending.map((t) => (
                    <Link key={t.num} href="/site" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', textDecoration: 'none', color: 'inherit' }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)' }}>{t.num}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, marginBottom: 4 }}>{t.title}</div>
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{t.reads}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </main>

        {/* Footer */}
        <footer style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', marginTop: 60, padding: '48px 0 24px' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 24, borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-tertiary)' }}>
              <span>&copy; 2025 SportNews. All rights reserved.</span>
              <span style={{ fontSize: 12 }}>Powered by <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Diurna</span></span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
