import Link from 'next/link'
import type { Metadata } from 'next'
import { AdSlot } from '@/components/public/sportba'
import { MatchTabs } from '@/components/public/sportba/match-tabs'
import '../match.css'

export const metadata: Metadata = {
  title: 'Arsenal 2 \u2013 1 Chelsea \u2014 Sport.ba',
  description:
    'Rezultat u\u017eivo, statistika, postave i pregled utakmice Arsenal vs Chelsea u Premijer ligi.',
}

/* ── Demo Data ── */

const HOME_FORM = ['W', 'W', 'D', 'W', 'W'] as const
const AWAY_FORM = ['L', 'D', 'W', 'L', 'D'] as const

const MATCH_INFO = [
  { label: 'Stadion', value: 'Emirates Stadium' },
  { label: 'Sudija', value: 'Michael Oliver' },
  { label: 'Vrijeme', value: '12\u00b0C, obla\u010dno' },
  { label: 'Kapacitet', value: '60.704' },
]

const SIDEBAR_NEWS = [
  { cat: 'VIJESTI', title: "Arteta: 'Danas smo pokazali karakter'" },
  { cat: 'TRANSFERI', title: 'Arsenal poja\u010dava vezni red \u2014 tri imena na listi' },
  { cat: 'POVREDE', title: 'Saka napustio teren \u2014 status neizvjestan' },
  { cat: 'UTAKMICE', title: 'Arsenal \u2013 Inter: Najava Lige prvaka' },
]

const ODDS = { home: '1.85', draw: '3.60', away: '4.20' }

/* ── Page Component ── */

export default function MatchPage() {
  return (
    <main className="sba-mc">
      <div className="sba-mc-layout">
        {/* ══════════ MAIN COLUMN ══════════ */}
        <div className="sba-mc-main">
          {/* ── Match Header ── */}
          <div className="sba-mc-header">
            {/* Competition + Live Badge */}
            <div className="sba-mc-comp-bar">
              <span className="sba-mc-comp">Premier League &mdash; Kolo 25</span>
              <span className="sba-mc-live-badge">
                <span className="sba-mc-live-dot" />
                U\u017dIVO
              </span>
            </div>

            {/* Scoreboard */}
            <div className="sba-mc-scoreboard">
              <div className="sba-mc-team">
                <div
                  className="sba-mc-team-logo"
                  style={{ background: 'linear-gradient(135deg, #ef0107, #9c0001)' }}
                >
                  ARS
                </div>
                <span className="sba-mc-team-name">Arsenal</span>
              </div>

              <div className="sba-mc-score-block">
                <span className="sba-mc-score">2 &ndash; 1</span>
                <span className="sba-mc-minute">
                  <span className="sba-mc-minute-dot" />
                  67&apos;
                </span>
              </div>

              <div className="sba-mc-team">
                <div
                  className="sba-mc-team-logo"
                  style={{ background: 'linear-gradient(135deg, #034694, #001489)' }}
                >
                  CHE
                </div>
                <span className="sba-mc-team-name">Chelsea</span>
              </div>
            </div>

            {/* Form Dots */}
            <div className="sba-mc-form-row">
              <div className="sba-mc-form-dots">
                {HOME_FORM.map((r, i) => (
                  <span
                    key={i}
                    className={`sba-mc-form-dot sba-mc-form-dot--${r.toLowerCase()}`}
                  >
                    {r === 'W' ? 'P' : r === 'D' ? 'N' : 'I'}
                  </span>
                ))}
              </div>
              <span className="sba-mc-form-label">Forma</span>
              <div className="sba-mc-form-dots">
                {AWAY_FORM.map((r, i) => (
                  <span
                    key={i}
                    className={`sba-mc-form-dot sba-mc-form-dot--${r.toLowerCase()}`}
                  >
                    {r === 'W' ? 'P' : r === 'D' ? 'N' : 'I'}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <MatchTabs />
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
                    <span className="sba-mc-info-label">{r.label}</span>
                    <span className="sba-mc-info-value">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ad */}
            <AdSlot variant="rectangle" />

            {/* Related News */}
            <div className="sba-mc-info-card">
              <div className="sba-rail-head">Povezano</div>
              <div className="sba-mc-related-list">
                {SIDEBAR_NEWS.map((n, i) => (
                  <Link key={i} href="/vijesti" className="sba-mc-related-item">
                    <span className="sba-mc-related-cat">{n.cat}</span>
                    <span className="sba-mc-related-title">{n.title}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Odds */}
            <div className="sba-mc-odds">
              <div className="sba-rail-head">Kvote</div>
              <div className="sba-mc-odds-grid">
                <div className="sba-mc-odds-cell">
                  <span className="sba-mc-odds-label">1</span>
                  <span className="sba-mc-odds-val">{ODDS.home}</span>
                </div>
                <div className="sba-mc-odds-cell">
                  <span className="sba-mc-odds-label">X</span>
                  <span className="sba-mc-odds-val">{ODDS.draw}</span>
                </div>
                <div className="sba-mc-odds-cell">
                  <span className="sba-mc-odds-label">2</span>
                  <span className="sba-mc-odds-val">{ODDS.away}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
