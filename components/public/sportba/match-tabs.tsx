'use client'

import { useState } from 'react'

/* ── Demo Data ── */

const EVENTS = [
  { min: 12, type: 'goal' as const, player: 'Saka', detail: 'Asist: \u00D8degaard', team: 'home' as const },
  { min: 24, type: 'yellow' as const, player: 'Caicedo', detail: '', team: 'away' as const },
  { min: 35, type: 'goal' as const, player: 'Palmer', detail: 'Penal', team: 'away' as const },
  { min: 41, type: 'yellow' as const, player: 'Rice', detail: '', team: 'home' as const },
  { min: 56, type: 'goal' as const, player: 'Havertz', detail: 'Asist: Saka', team: 'home' as const },
  { min: 62, type: 'sub' as const, player: 'Madueke', detail: 'Za: Mudryk', team: 'away' as const },
  { min: 64, type: 'yellow' as const, player: 'Sterling', detail: '', team: 'away' as const },
  { min: 67, type: 'var' as const, player: 'VAR provjera', detail: 'Ofsajd, gol poni\u0161ten', team: 'home' as const },
]

const MOMENTUM = [65, 40, 55, 70, 45, 60, 75, 35, 55, 80, 50, 65]

const STATS = [
  { label: 'Posjed', home: 58, away: 42, pct: true },
  { label: 'Udarci', home: 14, away: 9, pct: false },
  { label: 'Na gol', home: 6, away: 3, pct: false },
  { label: 'Dodavanja', home: 487, away: 352, pct: false },
  { label: 'To\u010Dnost dod.', home: 89, away: 82, pct: true },
  { label: 'Korneri', home: 7, away: 4, pct: false },
  { label: 'Prekr\u0161aji', home: 11, away: 14, pct: false },
  { label: '\u017Duti kartoni', home: 1, away: 2, pct: false },
  { label: 'xG', home: 2.3, away: 1.1, pct: false },
]

type Player = { num: number; name: string; rating: number }

const HOME_FORMATION: Player[][] = [
  [{ num: 1, name: 'Raya', rating: 7.2 }],
  [{ num: 2, name: 'White', rating: 6.8 }, { num: 6, name: 'Saliba', rating: 8.1 }, { num: 15, name: 'Gabriel', rating: 7.5 }, { num: 35, name: 'Zinchenko', rating: 6.9 }],
  [{ num: 41, name: 'Rice', rating: 7.8 }, { num: 8, name: '\u00D8degaard', rating: 8.4 }, { num: 29, name: 'Havertz', rating: 7.9 }],
  [{ num: 7, name: 'Saka', rating: 9.1 }, { num: 19, name: 'Trossard', rating: 7.0 }, { num: 11, name: 'Martinelli', rating: 7.3 }],
]

const AWAY_FORMATION: Player[][] = [
  [{ num: 9, name: 'Jackson', rating: 5.7 }],
  [{ num: 20, name: 'Palmer', rating: 7.6 }, { num: 17, name: 'Sterling', rating: 5.8 }, { num: 15, name: 'Mudryk', rating: 5.5 }],
  [{ num: 25, name: 'Caicedo', rating: 6.0 }, { num: 8, name: 'Enzo', rating: 6.3 }],
  [{ num: 24, name: 'James', rating: 6.2 }, { num: 6, name: 'Silva', rating: 6.8 }, { num: 26, name: 'Colwill', rating: 6.4 }, { num: 3, name: 'Cucurella', rating: 5.9 }],
  [{ num: 1, name: 'S\u00e1nchez', rating: 6.5 }],
]

const TABLE = [
  { pos: 1, team: 'Arsenal', p: 24, w: 18, d: 4, l: 2, gd: '+38', pts: 58, zone: 'cl', hl: true },
  { pos: 2, team: 'Man City', p: 24, w: 17, d: 4, l: 3, gd: '+32', pts: 55, zone: 'cl', hl: false },
  { pos: 3, team: 'Liverpool', p: 24, w: 16, d: 6, l: 2, gd: '+30', pts: 54, zone: 'cl', hl: false },
  { pos: 4, team: 'Aston Villa', p: 24, w: 15, d: 5, l: 4, gd: '+18', pts: 50, zone: 'cl', hl: false },
  { pos: 5, team: 'Tottenham', p: 24, w: 13, d: 6, l: 5, gd: '+10', pts: 45, zone: 'el', hl: false },
  { pos: 6, team: 'Chelsea', p: 24, w: 13, d: 5, l: 6, gd: '+8', pts: 44, zone: 'el', hl: true },
  { pos: 7, team: 'Newcastle', p: 24, w: 12, d: 5, l: 7, gd: '+6', pts: 41, zone: 'conf', hl: false },
  { pos: 8, team: 'Man United', p: 24, w: 11, d: 4, l: 9, gd: '-2', pts: 37, zone: '', hl: false },
  { pos: 9, team: 'Brighton', p: 24, w: 10, d: 6, l: 8, gd: '+2', pts: 36, zone: '', hl: false },
  { pos: 10, team: 'West Ham', p: 24, w: 10, d: 5, l: 9, gd: '-4', pts: 35, zone: '', hl: false },
]

const H2H: { date: string; comp: string; home: string; away: string; hs: number; as: number; result: 'W' | 'D' | 'L' }[] = [
  { date: '04.02.2026', comp: 'PL', home: 'Arsenal', away: 'Chelsea', hs: 2, as: 1, result: 'W' },
  { date: '18.10.2025', comp: 'PL', home: 'Chelsea', away: 'Arsenal', hs: 0, as: 2, result: 'W' },
  { date: '23.04.2025', comp: 'PL', home: 'Arsenal', away: 'Chelsea', hs: 5, as: 0, result: 'W' },
  { date: '21.10.2024', comp: 'LC', home: 'Chelsea', away: 'Arsenal', hs: 2, as: 2, result: 'D' },
  { date: '24.02.2024', comp: 'PL', home: 'Chelsea', away: 'Arsenal', hs: 2, as: 2, result: 'D' },
]

const TABS = ['Pregled', 'Statistika', 'Postave', 'Tabela', 'H2H'] as const

/* ── Helpers ── */

const EVENT_ICONS: Record<string, { color: string; label: string }> = {
  goal: { color: 'var(--sba-green)', label: '\u26BD' },
  yellow: { color: 'var(--sba-yellow)', label: '\uD83D\uDFE8' },
  red: { color: 'var(--sba-red)', label: '\uD83D\uDFE5' },
  sub: { color: 'var(--sba-accent)', label: '\uD83D\uDD04' },
  var: { color: 'var(--sba-blue)', label: '\uD83D\uDCFA' },
}

function ratingClass(r: number) {
  if (r >= 7) return 'sba-mc-rating--good'
  if (r >= 6) return 'sba-mc-rating--avg'
  return 'sba-mc-rating--poor'
}

/* ── Component ── */

export function MatchTabs() {
  const [tab, setTab] = useState(0)

  const h2hSummary = {
    wins: H2H.filter((m) => m.result === 'W').length,
    draws: H2H.filter((m) => m.result === 'D').length,
    losses: H2H.filter((m) => m.result === 'L').length,
  }

  return (
    <div className="sba-mc-content">
      {/* ── Tab Bar ── */}
      <div className="sba-mc-tabs" role="tablist">
        {TABS.map((label, i) => (
          <button
            key={label}
            className="sba-mc-tab"
            role="tab"
            aria-selected={tab === i}
            onClick={() => setTab(i)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Summary ── */}
      {tab === 0 && (
        <div className="sba-mc-panel" role="tabpanel">
          <div className="sba-mc-events">
            {EVENTS.map((e, i) => (
              <div
                key={i}
                className={`sba-mc-event sba-mc-event--${e.team}`}
              >
                <span className="sba-mc-event-min">{e.min}&apos;</span>
                <span
                  className="sba-mc-event-icon"
                  style={{ background: EVENT_ICONS[e.type].color }}
                />
                <span className="sba-mc-event-player">{e.player}</span>
                {e.detail && (
                  <span className="sba-mc-event-detail">{e.detail}</span>
                )}
                <span className="sba-mc-event-badge">
                  {e.team === 'home' ? 'ARS' : 'CHE'}
                </span>
              </div>
            ))}
          </div>

          <div className="sba-mc-momentum-section">
            <div className="sba-mc-momentum-head">Pritisak po segmentima</div>
            <div className="sba-mc-momentum">
              {MOMENTUM.map((v, i) => (
                <div key={i} className="sba-mc-momentum-seg">
                  <div
                    className="sba-mc-momentum-bar"
                    style={{ height: `${v}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="sba-mc-momentum-labels">
              <span>0&apos;</span>
              <span>45&apos;</span>
              <span>67&apos;</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      {tab === 1 && (
        <div className="sba-mc-panel" role="tabpanel">
          <div className="sba-mc-stats">
            {STATS.map((s) => {
              const max = Math.max(Number(s.home), Number(s.away))
              const homePct = max > 0 ? (Number(s.home) / max) * 100 : 0
              const awayPct = max > 0 ? (Number(s.away) / max) * 100 : 0
              return (
                <div key={s.label} className="sba-mc-stat-row">
                  <span className="sba-mc-stat-val sba-mc-stat-val--home">
                    {s.home}{s.pct ? '%' : ''}
                  </span>
                  <div className="sba-mc-stat-bar sba-mc-stat-bar--home">
                    <div
                      className="sba-mc-stat-fill sba-mc-stat-fill--home"
                      style={{ width: `${homePct}%` }}
                    />
                  </div>
                  <span className="sba-mc-stat-name">{s.label}</span>
                  <div className="sba-mc-stat-bar sba-mc-stat-bar--away">
                    <div
                      className="sba-mc-stat-fill sba-mc-stat-fill--away"
                      style={{ width: `${awayPct}%` }}
                    />
                  </div>
                  <span className="sba-mc-stat-val sba-mc-stat-val--away">
                    {s.away}{s.pct ? '%' : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Lineups ── */}
      {tab === 2 && (
        <div className="sba-mc-panel" role="tabpanel">
          <div className="sba-mc-pitch">
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
        </div>
      )}

      {/* ── Table ── */}
      {tab === 3 && (
        <div className="sba-mc-panel" role="tabpanel">
          <div className="sba-mc-table-wrap">
            <table className="sba-standings-table">
              <thead>
                <tr>
                  <th>Klub</th>
                  <th>U</th>
                  <th>P</th>
                  <th>N</th>
                  <th>I</th>
                  <th>GR</th>
                  <th>B</th>
                </tr>
              </thead>
              <tbody>
                {TABLE.map((r) => (
                  <tr
                    key={r.pos}
                    className={r.hl ? 'sba-mc-table-hl' : ''}
                  >
                    <td>
                      <span className="sba-standings-pos">
                        {r.zone && (
                          <span className={`sba-standings-pos-dot sba-standings-pos-dot--${r.zone}`} />
                        )}
                        <span className="sba-standings-pos-num">{r.pos}</span>
                        <span className="sba-standings-team-name">{r.team}</span>
                      </span>
                    </td>
                    <td>{r.p}</td>
                    <td>{r.w}</td>
                    <td>{r.d}</td>
                    <td>{r.l}</td>
                    <td>{r.gd}</td>
                    <td className="sba-standings-pts">{r.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── H2H ── */}
      {tab === 4 && (
        <div className="sba-mc-panel" role="tabpanel">
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

          <div className="sba-mc-h2h-matches">
            {H2H.map((m, i) => (
              <div key={i} className="sba-mc-h2h-row">
                <span className="sba-mc-h2h-date">{m.date}</span>
                <span className="sba-mc-h2h-comp">{m.comp}</span>
                <span className="sba-mc-h2h-teams">
                  {m.home} {m.hs} &ndash; {m.as} {m.away}
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
  )
}
