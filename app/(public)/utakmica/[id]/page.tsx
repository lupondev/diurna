'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import '../match.css'

/* ═══════════════════════════════════════════════════════════
   DEMO DATA
   ═══════════════════════════════════════════════════════════ */

const HOME = { abbr: 'ARS', name: 'Arsenal', gradient: 'linear-gradient(135deg, #ef0107, #9c0001)' }
const AWAY = { abbr: 'CHE', name: 'Chelsea', gradient: 'linear-gradient(135deg, #034694, #001489)' }

const HOME_FORM = ['W', 'W', 'D', 'W', 'W'] as const
const AWAY_FORM = ['L', 'D', 'W', 'L', 'D'] as const

type EventType = 'goal' | 'yellow' | 'red' | 'sub' | 'var'
type Team = 'home' | 'away'

const EVENTS: { min: number; type: EventType; player: string; detail: string; team: Team }[] = [
  { min: 12, type: 'goal', player: 'Saka', detail: 'Asist: Ødegaard', team: 'home' },
  { min: 24, type: 'yellow', player: 'Caicedo', detail: 'Grub prekršaj', team: 'away' },
  { min: 35, type: 'goal', player: 'Palmer', detail: 'Penal', team: 'away' },
  { min: 41, type: 'yellow', player: 'Rice', detail: 'Zakašnjeli start', team: 'home' },
  { min: 56, type: 'goal', player: 'Havertz', detail: 'Asist: Saka', team: 'home' },
  { min: 62, type: 'sub', player: 'Madueke', detail: 'Za: Mudryk', team: 'away' },
  { min: 64, type: 'yellow', player: 'Sterling', detail: 'Simuliranje', team: 'away' },
  { min: 67, type: 'var', player: 'VAR provjera', detail: 'Ofsajd, gol poništen', team: 'home' },
]

const MOMENTUM: { min: number; home: number; away: number }[] = [
  { min: 0, home: 65, away: 35 },
  { min: 8, home: 40, away: 60 },
  { min: 15, home: 75, away: 25 },
  { min: 23, home: 50, away: 50 },
  { min: 30, home: 45, away: 55 },
  { min: 38, home: 60, away: 40 },
  { min: 45, home: 55, away: 45 },
  { min: 50, home: 70, away: 30 },
  { min: 55, home: 35, away: 65 },
  { min: 60, home: 80, away: 20 },
  { min: 65, home: 50, away: 50 },
  { min: 67, home: 65, away: 35 },
]

const STATS = [
  { label: 'Posjed', home: 58, away: 42, pct: true },
  { label: 'Udarci', home: 14, away: 9, pct: false },
  { label: 'Na gol', home: 6, away: 3, pct: false },
  { label: 'Dodavanja', home: 487, away: 352, pct: false },
  { label: 'Točnost dod.', home: 89, away: 82, pct: true },
  { label: 'Korneri', home: 7, away: 4, pct: false },
  { label: 'Prekršaji', home: 11, away: 14, pct: false },
  { label: 'Žuti kartoni', home: 1, away: 2, pct: false },
  { label: 'xG', home: 2.3, away: 1.1, pct: false },
]

type Player = { num: number; name: string; rating: number }

const HOME_FORMATION: Player[][] = [
  [{ num: 1, name: 'Raya', rating: 7.2 }],
  [{ num: 2, name: 'White', rating: 6.8 }, { num: 6, name: 'Saliba', rating: 8.1 }, { num: 15, name: 'Gabriel', rating: 7.5 }, { num: 35, name: 'Zinchenko', rating: 6.9 }],
  [{ num: 41, name: 'Rice', rating: 7.8 }, { num: 8, name: 'Ødegaard', rating: 8.4 }, { num: 29, name: 'Havertz', rating: 7.9 }],
  [{ num: 7, name: 'Saka', rating: 9.1 }, { num: 19, name: 'Trossard', rating: 7.0 }, { num: 11, name: 'Martinelli', rating: 7.3 }],
]

const AWAY_FORMATION: Player[][] = [
  [{ num: 9, name: 'Jackson', rating: 5.7 }],
  [{ num: 20, name: 'Palmer', rating: 7.6 }, { num: 17, name: 'Sterling', rating: 5.8 }, { num: 15, name: 'Mudryk', rating: 5.5 }],
  [{ num: 25, name: 'Caicedo', rating: 6.0 }, { num: 8, name: 'Enzo', rating: 6.3 }],
  [{ num: 24, name: 'James', rating: 6.2 }, { num: 6, name: 'Silva', rating: 6.8 }, { num: 26, name: 'Colwill', rating: 6.4 }, { num: 3, name: 'Cucurella', rating: 5.9 }],
  [{ num: 1, name: 'Sánchez', rating: 6.5 }],
]

const HOME_SUBS: Player[] = [
  { num: 22, name: 'Ramsdale', rating: 0 },
  { num: 4, name: 'Timber', rating: 6.4 },
  { num: 21, name: 'Vieira', rating: 0 },
  { num: 14, name: 'Nketiah', rating: 0 },
  { num: 18, name: 'Tomiyasu', rating: 0 },
]

const AWAY_SUBS: Player[] = [
  { num: 13, name: 'Petrović', rating: 0 },
  { num: 10, name: 'Madueke', rating: 6.1 },
  { num: 7, name: 'Gallagher', rating: 0 },
  { num: 19, name: 'Disasi', rating: 0 },
  { num: 14, name: 'Chalobah', rating: 0 },
]

const TABLE = [
  { pos: 1, team: 'Arsenal', p: 24, w: 18, d: 4, l: 2, gd: '+38', pts: 58, zone: 'cl' as const, hl: true, form: ['W', 'W', 'D', 'W', 'W'] },
  { pos: 2, team: 'Man City', p: 24, w: 17, d: 4, l: 3, gd: '+32', pts: 55, zone: 'cl' as const, hl: false, form: ['W', 'D', 'W', 'W', 'L'] },
  { pos: 3, team: 'Liverpool', p: 24, w: 16, d: 6, l: 2, gd: '+30', pts: 54, zone: 'cl' as const, hl: false, form: ['D', 'W', 'W', 'D', 'W'] },
  { pos: 4, team: 'Aston Villa', p: 24, w: 15, d: 5, l: 4, gd: '+18', pts: 50, zone: 'cl' as const, hl: false, form: ['W', 'W', 'L', 'W', 'D'] },
  { pos: 5, team: 'Tottenham', p: 24, w: 13, d: 6, l: 5, gd: '+10', pts: 45, zone: 'el' as const, hl: false, form: ['L', 'W', 'D', 'W', 'W'] },
  { pos: 6, team: 'Chelsea', p: 24, w: 13, d: 5, l: 6, gd: '+8', pts: 44, zone: 'el' as const, hl: true, form: ['L', 'D', 'W', 'L', 'D'] },
  { pos: 7, team: 'Newcastle', p: 24, w: 12, d: 5, l: 7, gd: '+6', pts: 41, zone: 'conf' as const, hl: false, form: ['W', 'L', 'W', 'W', 'D'] },
  { pos: 8, team: 'Man United', p: 24, w: 11, d: 4, l: 9, gd: '-2', pts: 37, zone: '' as const, hl: false, form: ['L', 'L', 'W', 'D', 'L'] },
  { pos: 9, team: 'Brighton', p: 24, w: 10, d: 6, l: 8, gd: '+2', pts: 36, zone: '' as const, hl: false, form: ['D', 'W', 'L', 'D', 'W'] },
  { pos: 10, team: 'West Ham', p: 24, w: 10, d: 5, l: 9, gd: '-4', pts: 35, zone: '' as const, hl: false, form: ['L', 'W', 'L', 'L', 'D'] },
]

const H2H: { date: string; comp: string; home: string; away: string; hs: number; as: number; result: 'W' | 'D' | 'L' }[] = [
  { date: '04.02.2026', comp: 'PL', home: 'Arsenal', away: 'Chelsea', hs: 2, as: 1, result: 'W' },
  { date: '18.10.2025', comp: 'PL', home: 'Chelsea', away: 'Arsenal', hs: 0, as: 2, result: 'W' },
  { date: '23.04.2025', comp: 'PL', home: 'Arsenal', away: 'Chelsea', hs: 5, as: 0, result: 'W' },
  { date: '21.10.2024', comp: 'LC', home: 'Chelsea', away: 'Arsenal', hs: 2, as: 2, result: 'D' },
  { date: '24.02.2024', comp: 'PL', home: 'Chelsea', away: 'Arsenal', hs: 2, as: 2, result: 'D' },
]

const MATCH_INFO = [
  { icon: '🏟️', label: 'Stadion', value: 'Emirates Stadium' },
  { icon: '👨‍⚖️', label: 'Sudija', value: 'Michael Oliver' },
  { icon: '🌡️', label: 'Vrijeme', value: '12°C, oblačno' },
  { icon: '👥', label: 'Gledaoci', value: '60.260 / 60.704' },
]

const SIDEBAR_NEWS = [
  { cat: 'VIJESTI', title: "Arteta: 'Danas smo pokazali karakter'", img: '🎙️' },
  { cat: 'TRANSFERI', title: 'Arsenal pojačava vezni red — tri imena na listi', img: '📋' },
  { cat: 'POVREDE', title: 'Saka napustio teren — status neizvjestan', img: '🏥' },
  { cat: 'UTAKMICE', title: 'Arsenal – Inter: Najava Lige prvaka', img: '⭐' },
]

const ODDS = { home: '1.85', draw: '3.60', away: '4.20' }

const TABS = ['Pregled', 'Statistika', 'Postave', 'Tabela', 'H2H'] as const

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

function ratingClass(r: number) {
  if (r >= 7.5) return 'sba-mc-rating--great'
  if (r >= 7) return 'sba-mc-rating--good'
  if (r >= 6) return 'sba-mc-rating--avg'
  return 'sba-mc-rating--poor'
}

function EventIcon({ type }: { type: EventType }) {
  switch (type) {
    case 'goal':
      return (
        <svg className="sba-mc-event-svg" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" stroke="var(--sba-green)" strokeWidth="2" />
          <circle cx="10" cy="10" r="4" fill="var(--sba-green)" />
        </svg>
      )
    case 'yellow':
      return (
        <svg className="sba-mc-event-svg" viewBox="0 0 16 20" fill="none">
          <rect x="2" y="1" width="12" height="18" rx="2" fill="var(--sba-yellow)" />
        </svg>
      )
    case 'red':
      return (
        <svg className="sba-mc-event-svg" viewBox="0 0 16 20" fill="none">
          <rect x="2" y="1" width="12" height="18" rx="2" fill="var(--sba-red)" />
        </svg>
      )
    case 'sub':
      return (
        <svg className="sba-mc-event-svg" viewBox="0 0 20 20" fill="none">
          <path d="M5 15l5-5-5-5" stroke="var(--sba-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 5l-5 5 5 5" stroke="var(--sba-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'var':
      return (
        <svg className="sba-mc-event-svg" viewBox="0 0 20 20" fill="none">
          <rect x="1" y="4" width="18" height="12" rx="2" stroke="var(--sba-blue)" strokeWidth="2" />
          <text x="10" y="13" textAnchor="middle" fill="var(--sba-blue)" fontSize="7" fontWeight="700" fontFamily="var(--sba-mono)">VAR</text>
        </svg>
      )
  }
}

/* ═══════════════════════════════════════════════════════════
   ANIMATED STAT BAR
   ═══════════════════════════════════════════════════════════ */

function StatBar({ home, away, label, pct }: { home: number; away: number; label: string; pct: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.3 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const total = Number(home) + Number(away)
  const homePct = total > 0 ? (Number(home) / total) * 100 : 50
  const awayPct = total > 0 ? (Number(away) / total) * 100 : 50
  const homeWins = Number(home) > Number(away)
  const awayWins = Number(away) > Number(home)

  return (
    <div ref={ref} className="sba-mc-stat-row">
      <span className={`sba-mc-stat-val sba-mc-stat-val--home${homeWins ? ' sba-mc-stat-val--leader' : ''}`}>
        {home}{pct ? '%' : ''}
      </span>
      <div className="sba-mc-stat-bars">
        <div className="sba-mc-stat-bar sba-mc-stat-bar--home">
          <div
            className={`sba-mc-stat-fill sba-mc-stat-fill--home${homeWins ? ' sba-mc-stat-fill--leader' : ''}`}
            style={{ width: visible ? `${homePct}%` : '0%' }}
          />
        </div>
        <div className="sba-mc-stat-bar sba-mc-stat-bar--away">
          <div
            className={`sba-mc-stat-fill sba-mc-stat-fill--away${awayWins ? ' sba-mc-stat-fill--leader' : ''}`}
            style={{ width: visible ? `${awayPct}%` : '0%' }}
          />
        </div>
      </div>
      <span className={`sba-mc-stat-val sba-mc-stat-val--away${awayWins ? ' sba-mc-stat-val--leader' : ''}`}>
        {away}{pct ? '%' : ''}
      </span>
      <span className="sba-mc-stat-name">{label}</span>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function MatchPage() {
  const [tab, setTab] = useState(0)
  const [prevTab, setPrevTab] = useState(0)
  const [animating, setAnimating] = useState(false)

  function switchTab(next: number) {
    if (next === tab) return
    setPrevTab(tab)
    setAnimating(true)
    setTab(next)
    setTimeout(() => setAnimating(false), 250)
  }

  const h2hSummary = {
    wins: H2H.filter((m) => m.result === 'W').length,
    draws: H2H.filter((m) => m.result === 'D').length,
    losses: H2H.filter((m) => m.result === 'L').length,
  }
  const h2hTotal = H2H.length

  const firstHalfEvents = EVENTS.filter((e) => e.min <= 45)
  const secondHalfEvents = EVENTS.filter((e) => e.min > 45)

  return (
    <main className="sba-mc">
      <div className="sba-mc-layout">
        {/* ══════════ MAIN COLUMN ══════════ */}
        <div className="sba-mc-main">

          {/* ── Breadcrumb ── */}
          <nav className="sba-mc-breadcrumb">
            <Link href="/" className="sba-mc-breadcrumb-link">Sport.ba</Link>
            <span className="sba-mc-breadcrumb-sep">/</span>
            <Link href="/utakmice" className="sba-mc-breadcrumb-link">Utakmice</Link>
            <span className="sba-mc-breadcrumb-sep">/</span>
            <span className="sba-mc-breadcrumb-current">Arsenal vs Chelsea</span>
          </nav>

          {/* ── Match Header ── */}
          <div className="sba-mc-header">
            {/* Competition + Live Badge */}
            <div className="sba-mc-comp-bar">
              <span className="sba-mc-comp">Premier League &mdash; Kolo 25</span>
              <span className="sba-mc-live-badge">
                <span className="sba-mc-live-dot" />
                UŽIVO
              </span>
            </div>

            {/* Scoreboard */}
            <div className="sba-mc-scoreboard">
              <div className="sba-mc-team">
                <div className="sba-mc-team-logo" style={{ background: HOME.gradient }}>
                  {HOME.abbr}
                </div>
                <span className="sba-mc-team-name">{HOME.name}</span>
                <div className="sba-mc-form-dots">
                  {HOME_FORM.map((r, i) => (
                    <span key={i} className={`sba-mc-form-dot sba-mc-form-dot--${r.toLowerCase()}`}>
                      {r === 'W' ? 'P' : r === 'D' ? 'N' : 'I'}
                    </span>
                  ))}
                </div>
              </div>

              <div className="sba-mc-score-block">
                <span className="sba-mc-score">2 &ndash; 1</span>
                <span className="sba-mc-minute">
                  <span className="sba-mc-minute-dot" />
                  67&apos;
                </span>
                <span className="sba-mc-aggregate">Poluvrijeme: 1 &ndash; 1</span>
              </div>

              <div className="sba-mc-team">
                <div className="sba-mc-team-logo" style={{ background: AWAY.gradient }}>
                  {AWAY.abbr}
                </div>
                <span className="sba-mc-team-name">{AWAY.name}</span>
                <div className="sba-mc-form-dots">
                  {AWAY_FORM.map((r, i) => (
                    <span key={i} className={`sba-mc-form-dot sba-mc-form-dot--${r.toLowerCase()}`}>
                      {r === 'W' ? 'P' : r === 'D' ? 'N' : 'I'}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Scorers strip */}
            <div className="sba-mc-scorers">
              <div className="sba-mc-scorers-home">
                <span>Saka 12&apos;</span>
                <span>Havertz 56&apos;</span>
              </div>
              <div className="sba-mc-scorers-sep" />
              <div className="sba-mc-scorers-away">
                <span>Palmer 35&apos; (P)</span>
              </div>
            </div>
          </div>

          {/* ── Tabs Content ── */}
          <div className="sba-mc-content">
            {/* Tab Bar */}
            <div className="sba-mc-tabs" role="tablist">
              {TABS.map((label, i) => (
                <button
                  key={label}
                  className="sba-mc-tab"
                  role="tab"
                  aria-selected={tab === i}
                  onClick={() => switchTab(i)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className={`sba-mc-panel-wrap${animating ? ' sba-mc-panel-animating' : ''}`}>

              {/* ═══ TAB 0: PREGLED ═══ */}
              {tab === 0 && (
                <div className="sba-mc-panel" role="tabpanel">
                  {/* First Half Events */}
                  <div className="sba-mc-events-section">
                    <div className="sba-mc-half-label">1. poluvrijeme</div>
                    <div className="sba-mc-events">
                      {firstHalfEvents.map((e, i) => (
                        <div key={i} className={`sba-mc-event sba-mc-event--${e.team}`}>
                          <span className="sba-mc-event-min">{e.min}&apos;</span>
                          <EventIcon type={e.type} />
                          <div className="sba-mc-event-info">
                            <span className="sba-mc-event-player">{e.player}</span>
                            {e.detail && <span className="sba-mc-event-detail">{e.detail}</span>}
                          </div>
                          <span className="sba-mc-event-badge">
                            {e.team === 'home' ? HOME.abbr : AWAY.abbr}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Halftime separator */}
                  <div className="sba-mc-halftime">
                    <div className="sba-mc-halftime-line" />
                    <span className="sba-mc-halftime-label">Poluvrijeme 1 &ndash; 1</span>
                    <div className="sba-mc-halftime-line" />
                  </div>

                  {/* Second Half Events */}
                  <div className="sba-mc-events-section">
                    <div className="sba-mc-half-label">2. poluvrijeme</div>
                    <div className="sba-mc-events">
                      {secondHalfEvents.map((e, i) => (
                        <div key={i} className={`sba-mc-event sba-mc-event--${e.team}`}>
                          <span className="sba-mc-event-min">{e.min}&apos;</span>
                          <EventIcon type={e.type} />
                          <div className="sba-mc-event-info">
                            <span className="sba-mc-event-player">{e.player}</span>
                            {e.detail && <span className="sba-mc-event-detail">{e.detail}</span>}
                          </div>
                          <span className="sba-mc-event-badge">
                            {e.team === 'home' ? HOME.abbr : AWAY.abbr}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Momentum / Pressure */}
                  <div className="sba-mc-momentum-section">
                    <div className="sba-mc-momentum-head">
                      <span>Pritisak po segmentima</span>
                      <div className="sba-mc-momentum-legend">
                        <span className="sba-mc-momentum-legend-item"><span className="sba-mc-momentum-legend-dot sba-mc-momentum-legend-dot--home" />{HOME.abbr}</span>
                        <span className="sba-mc-momentum-legend-item"><span className="sba-mc-momentum-legend-dot sba-mc-momentum-legend-dot--away" />{AWAY.abbr}</span>
                      </div>
                    </div>
                    <div className="sba-mc-momentum">
                      {MOMENTUM.map((seg, i) => (
                        <div key={i} className="sba-mc-momentum-seg">
                          <div className="sba-mc-momentum-bar sba-mc-momentum-bar--home" style={{ height: `${seg.home}%` }} />
                          <div className="sba-mc-momentum-bar sba-mc-momentum-bar--away" style={{ height: `${seg.away}%` }} />
                        </div>
                      ))}
                    </div>
                    <div className="sba-mc-momentum-labels">
                      <span>0&apos;</span>
                      <span>HT</span>
                      <span>67&apos;</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ TAB 1: STATISTIKA ═══ */}
              {tab === 1 && (
                <div className="sba-mc-panel" role="tabpanel">
                  <div className="sba-mc-stats-header">
                    <span className="sba-mc-stats-team-label">{HOME.name}</span>
                    <span className="sba-mc-stats-title">Statistika</span>
                    <span className="sba-mc-stats-team-label">{AWAY.name}</span>
                  </div>
                  <div className="sba-mc-stats">
                    {STATS.map((s) => (
                      <StatBar key={s.label} home={s.home} away={s.away} label={s.label} pct={s.pct} />
                    ))}
                  </div>
                </div>
              )}

              {/* ═══ TAB 2: POSTAVE ═══ */}
              {tab === 2 && (
                <div className="sba-mc-panel" role="tabpanel">
                  {/* Formation labels */}
                  <div className="sba-mc-formation-labels">
                    <span className="sba-mc-formation-tag sba-mc-formation-tag--home">
                      <span className="sba-mc-formation-team">{HOME.abbr}</span>
                      <span>4-3-3</span>
                    </span>
                    <span className="sba-mc-formation-tag sba-mc-formation-tag--away">
                      <span className="sba-mc-formation-team">{AWAY.abbr}</span>
                      <span>4-2-3-1</span>
                    </span>
                  </div>

                  {/* Pitch */}
                  <div className="sba-mc-pitch">
                    {/* Goal areas decorations */}
                    <div className="sba-mc-pitch-goal sba-mc-pitch-goal--top" />
                    <div className="sba-mc-pitch-goal sba-mc-pitch-goal--bottom" />
                    <div className="sba-mc-pitch-penalty sba-mc-pitch-penalty--top" />
                    <div className="sba-mc-pitch-penalty sba-mc-pitch-penalty--bottom" />

                    <div className="sba-mc-pitch-half sba-mc-pitch-half--home">
                      {HOME_FORMATION.map((row, ri) => (
                        <div key={ri} className="sba-mc-formation-row">
                          {row.map((p) => (
                            <div key={p.num} className="sba-mc-player">
                              <span className="sba-mc-player-dot sba-mc-player-dot--home">
                                {p.num}
                              </span>
                              <span className="sba-mc-player-name">{p.name}</span>
                              <span className={`sba-mc-rating ${ratingClass(p.rating)}`}>
                                {p.rating.toFixed(1)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                    <div className="sba-mc-pitch-half sba-mc-pitch-half--away">
                      {AWAY_FORMATION.map((row, ri) => (
                        <div key={ri} className="sba-mc-formation-row">
                          {row.map((p) => (
                            <div key={p.num} className="sba-mc-player">
                              <span className="sba-mc-player-dot sba-mc-player-dot--away">
                                {p.num}
                              </span>
                              <span className="sba-mc-player-name">{p.name}</span>
                              <span className={`sba-mc-rating ${ratingClass(p.rating)}`}>
                                {p.rating.toFixed(1)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Substitutes */}
                  <div className="sba-mc-subs">
                    <div className="sba-mc-subs-col">
                      <div className="sba-mc-subs-head">{HOME.name} — Klupa</div>
                      <div className="sba-mc-subs-list">
                        {HOME_SUBS.map((p) => (
                          <div key={p.num} className="sba-mc-sub-row">
                            <span className="sba-mc-sub-num">{p.num}</span>
                            <span className="sba-mc-sub-name">{p.name}</span>
                            {p.rating > 0 && (
                              <span className={`sba-mc-rating sba-mc-rating--sm ${ratingClass(p.rating)}`}>
                                {p.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="sba-mc-subs-col">
                      <div className="sba-mc-subs-head">{AWAY.name} — Klupa</div>
                      <div className="sba-mc-subs-list">
                        {AWAY_SUBS.map((p) => (
                          <div key={p.num} className="sba-mc-sub-row">
                            <span className="sba-mc-sub-num">{p.num}</span>
                            <span className="sba-mc-sub-name">{p.name}</span>
                            {p.rating > 0 && (
                              <span className={`sba-mc-rating sba-mc-rating--sm ${ratingClass(p.rating)}`}>
                                {p.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ TAB 3: TABELA ═══ */}
              {tab === 3 && (
                <div className="sba-mc-panel" role="tabpanel">
                  <div className="sba-mc-table-wrap">
                    <table className="sba-standings-table sba-mc-standings">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Klub</th>
                          <th>U</th>
                          <th>P</th>
                          <th>N</th>
                          <th>I</th>
                          <th>GR</th>
                          <th>B</th>
                          <th className="sba-mc-table-form-col">Forma</th>
                        </tr>
                      </thead>
                      <tbody>
                        {TABLE.map((r) => (
                          <tr key={r.pos} className={`${r.hl ? 'sba-mc-table-hl' : ''}${r.zone ? ` sba-mc-zone--${r.zone}` : ''}`}>
                            <td className="sba-mc-table-pos">
                              {r.zone && <span className={`sba-standings-pos-dot sba-standings-pos-dot--${r.zone}`} />}
                              {r.pos}
                            </td>
                            <td className="sba-mc-table-team">{r.team}</td>
                            <td>{r.p}</td>
                            <td>{r.w}</td>
                            <td>{r.d}</td>
                            <td>{r.l}</td>
                            <td>{r.gd}</td>
                            <td className="sba-standings-pts">{r.pts}</td>
                            <td className="sba-mc-table-form-col">
                              <div className="sba-mc-form-dots sba-mc-form-dots--sm">
                                {r.form.map((f, fi) => (
                                  <span key={fi} className={`sba-mc-form-dot sba-mc-form-dot--${f.toLowerCase()} sba-mc-form-dot--sm`}>
                                    {f === 'W' ? 'P' : f === 'D' ? 'N' : 'I'}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Zone legend */}
                  <div className="sba-mc-zone-legend">
                    <span className="sba-mc-zone-legend-item">
                      <span className="sba-standings-pos-dot sba-standings-pos-dot--cl" /> Liga prvaka
                    </span>
                    <span className="sba-mc-zone-legend-item">
                      <span className="sba-standings-pos-dot sba-standings-pos-dot--el" /> Europa Liga
                    </span>
                    <span className="sba-mc-zone-legend-item">
                      <span className="sba-standings-pos-dot sba-standings-pos-dot--conf" /> Konferencijska liga
                    </span>
                  </div>
                </div>
              )}

              {/* ═══ TAB 4: H2H ═══ */}
              {tab === 4 && (
                <div className="sba-mc-panel" role="tabpanel">
                  {/* Win percentage bar */}
                  <div className="sba-mc-h2h-pct-bar">
                    <div
                      className="sba-mc-h2h-pct-fill sba-mc-h2h-pct-fill--win"
                      style={{ width: `${(h2hSummary.wins / h2hTotal) * 100}%` }}
                    >
                      {h2hSummary.wins > 0 && <span>{HOME.abbr} {h2hSummary.wins}</span>}
                    </div>
                    <div
                      className="sba-mc-h2h-pct-fill sba-mc-h2h-pct-fill--draw"
                      style={{ width: `${(h2hSummary.draws / h2hTotal) * 100}%` }}
                    >
                      {h2hSummary.draws > 0 && <span>N {h2hSummary.draws}</span>}
                    </div>
                    <div
                      className="sba-mc-h2h-pct-fill sba-mc-h2h-pct-fill--loss"
                      style={{ width: `${(h2hSummary.losses / h2hTotal) * 100}%` }}
                    >
                      {h2hSummary.losses > 0 && <span>{AWAY.abbr} {h2hSummary.losses}</span>}
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="sba-mc-h2h-summary">
                    <div className="sba-mc-h2h-card sba-mc-h2h-card--win">
                      <span className="sba-mc-h2h-card-num">{h2hSummary.wins}</span>
                      <span className="sba-mc-h2h-card-label">Pobjede</span>
                    </div>
                    <div className="sba-mc-h2h-card sba-mc-h2h-card--draw">
                      <span className="sba-mc-h2h-card-num">{h2hSummary.draws}</span>
                      <span className="sba-mc-h2h-card-label">Remiji</span>
                    </div>
                    <div className="sba-mc-h2h-card sba-mc-h2h-card--loss">
                      <span className="sba-mc-h2h-card-num">{h2hSummary.losses}</span>
                      <span className="sba-mc-h2h-card-label">Porazi</span>
                    </div>
                  </div>

                  {/* Match list */}
                  <div className="sba-mc-h2h-section-head">Posljednjih {H2H.length} utakmica</div>
                  <div className="sba-mc-h2h-matches">
                    {H2H.map((m, i) => (
                      <div key={i} className="sba-mc-h2h-row">
                        <span className="sba-mc-h2h-date">{m.date}</span>
                        <span className="sba-mc-h2h-comp">{m.comp}</span>
                        <span className="sba-mc-h2h-teams">
                          <span className={m.home === HOME.name ? 'sba-mc-h2h-team-hl' : ''}>{m.home}</span>
                          {' '}
                          <span className="sba-mc-h2h-score">{m.hs} &ndash; {m.as}</span>
                          {' '}
                          <span className={m.away === HOME.name ? 'sba-mc-h2h-team-hl' : ''}>{m.away}</span>
                        </span>
                        <span className={`sba-mc-h2h-result sba-mc-h2h-result--${m.result.toLowerCase()}`}>
                          {m.result === 'W' ? 'P' : m.result === 'D' ? 'N' : 'I'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════ SIDEBAR ══════════ */}
        <aside className="sba-mc-sidebar">
          <div className="sba-mc-sidebar-sticky">
            {/* Match Info */}
            <div className="sba-mc-info-card">
              <div className="sba-rail-head">Informacije</div>
              <div className="sba-mc-info-rows">
                {MATCH_INFO.map((r) => (
                  <div key={r.label} className="sba-mc-info-row">
                    <span className="sba-mc-info-icon">{r.icon}</span>
                    <span className="sba-mc-info-label">{r.label}</span>
                    <span className="sba-mc-info-value">{r.value}</span>
                  </div>
                ))}
              </div>
              {/* Capacity bar */}
              <div className="sba-mc-capacity">
                <div className="sba-mc-capacity-bar">
                  <div className="sba-mc-capacity-fill" style={{ width: '99.3%' }} />
                </div>
                <span className="sba-mc-capacity-label">99.3% popunjenost</span>
              </div>
            </div>

            {/* Odds */}
            <div className="sba-mc-odds">
              <div className="sba-rail-head">
                Kvote
                <span className="sba-mc-odds-provider">Lupon SSP</span>
              </div>
              <div className="sba-mc-odds-grid">
                <div className="sba-mc-odds-cell">
                  <span className="sba-mc-odds-label">1</span>
                  <span className="sba-mc-odds-val">{ODDS.home}</span>
                  <span className="sba-mc-odds-team">{HOME.abbr}</span>
                </div>
                <div className="sba-mc-odds-cell">
                  <span className="sba-mc-odds-label">X</span>
                  <span className="sba-mc-odds-val">{ODDS.draw}</span>
                  <span className="sba-mc-odds-team">Remi</span>
                </div>
                <div className="sba-mc-odds-cell">
                  <span className="sba-mc-odds-label">2</span>
                  <span className="sba-mc-odds-val">{ODDS.away}</span>
                  <span className="sba-mc-odds-team">{AWAY.abbr}</span>
                </div>
              </div>
            </div>

            {/* Related News */}
            <div className="sba-mc-info-card">
              <div className="sba-rail-head">Povezano</div>
              <div className="sba-mc-related-list">
                {SIDEBAR_NEWS.map((n, i) => (
                  <Link key={i} href="/vijesti" className="sba-mc-related-item">
                    <span className="sba-mc-related-thumb">{n.img}</span>
                    <div className="sba-mc-related-text">
                      <span className="sba-mc-related-cat">{n.cat}</span>
                      <span className="sba-mc-related-title">{n.title}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
