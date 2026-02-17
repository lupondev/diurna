'use client'

import { useState } from 'react'
import Link from 'next/link'

const TABS = ['Statistika', 'Postave', 'Utjecaj'] as const

const STATS = [
  { label: 'Posjed', home: 58, away: 42 },
  { label: 'Udarci', home: 14, away: 9 },
  { label: 'Na gol', home: 6, away: 3 },
  { label: 'Korneri', home: 7, away: 4 },
  { label: 'Prekršaji', home: 11, away: 14 },
]

const LINEUPS = {
  home: ['Raya', 'White', 'Saliba', 'Gabriel', 'Zinchenko', 'Rice', 'Ødegaard', 'Havertz', 'Saka', 'Martinelli', 'Trossard'],
  away: ['Sánchez', 'James', 'Silva', 'Colwill', 'Cucurella', 'Caicedo', 'Enzo', 'Palmer', 'Sterling', 'Jackson', 'Mudryk'],
}

const TABLE_IMPACT = [
  { pos: 1, team: 'Arsenal', pts: 58, change: 3 },
  { pos: 2, team: 'Man City', pts: 55, change: 0 },
  { pos: 3, team: 'Liverpool', pts: 54, change: 0 },
  { pos: 4, team: 'Chelsea', pts: 48, change: -3 },
]

export function MatchOfDay() {
  const [tab, setTab] = useState(0)

  return (
    <section>
      <div className="sba-section-head">
        <h2 className="sba-section-title">Utakmica dana</h2>
      </div>
      <div className="sba-motd">
        <Link href="/utakmica/1" className="sba-motd-scoreboard">
          <div className="sba-motd-team">
            <span className="sba-motd-team-name">Arsenal</span>
          </div>
          <div className="sba-motd-score-block">
            <span className="sba-motd-score">{`2 \u2013 1`}</span>
            <span className="sba-motd-minute">{`67'`}</span>
          </div>
          <div className="sba-motd-team">
            <span className="sba-motd-team-name">Chelsea</span>
          </div>
        </Link>

        <div className="sba-motd-tabs" role="tablist">
          {TABS.map((label, i) => (
            <button
              key={label}
              className="sba-motd-tab"
              role="tab"
              aria-selected={tab === i}
              onClick={() => setTab(i)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 0 && (
          <div className="sba-motd-panel" role="tabpanel">
            <div className="sba-motd-stats">
              {STATS.map((s) => {
                const total = s.home + s.away
                const homePct = Math.round((s.home / total) * 100)
                const awayPct = 100 - homePct
                return (
                  <div key={s.label} className="sba-motd-stat-row">
                    <span className="sba-motd-stat-val">{s.home}</span>
                    <div className="sba-motd-stat-bar">
                      <div
                        className="sba-motd-stat-fill sba-motd-stat-fill--home"
                        style={{ width: `${homePct}%` }}
                      />
                    </div>
                    <span className="sba-motd-stat-label">{s.label}</span>
                    <div className="sba-motd-stat-bar">
                      <div
                        className="sba-motd-stat-fill sba-motd-stat-fill--away"
                        style={{ width: `${awayPct}%` }}
                      />
                    </div>
                    <span className="sba-motd-stat-val">{s.away}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === 1 && (
          <div className="sba-motd-panel" role="tabpanel">
            <div className="sba-motd-lineups">
              <div>
                <div className="sba-motd-lineup-head">Arsenal</div>
                <div className="sba-motd-lineup-list">
                  {LINEUPS.home.map((p, i) => (
                    <div key={p} className="sba-motd-lineup-player">
                      <span className="sba-motd-lineup-num">{i + 1}</span>
                      {p}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="sba-motd-lineup-head">Chelsea</div>
                <div className="sba-motd-lineup-list">
                  {LINEUPS.away.map((p, i) => (
                    <div key={p} className="sba-motd-lineup-player">
                      <span className="sba-motd-lineup-num">{i + 1}</span>
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 2 && (
          <div className="sba-motd-panel" role="tabpanel">
            <div className="sba-motd-impact">
              {TABLE_IMPACT.map((row) => (
                <div key={row.team} className="sba-motd-impact-row">
                  <span className="sba-motd-impact-pos">{row.pos}</span>
                  <span className="sba-motd-impact-team">{row.team}</span>
                  <span className="sba-motd-impact-pts">{row.pts}</span>
                  <span
                    className={`sba-motd-impact-change sba-motd-impact-change--${row.change > 0 ? 'up' : row.change < 0 ? 'down' : 'same'}`}
                  >
                    {row.change > 0
                      ? `+${row.change} \u2191`
                      : row.change < 0
                        ? `${row.change} \u2193`
                        : '\u2013'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
