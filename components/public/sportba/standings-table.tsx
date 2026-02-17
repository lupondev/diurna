'use client'

import { useState } from 'react'

const ALL_STANDINGS = [
  { pos: 1, team: 'Arsenal', p: 24, w: 18, d: 4, l: 2, gd: '+38', pts: 58, zone: 'cl' },
  { pos: 2, team: 'Man City', p: 24, w: 17, d: 4, l: 3, gd: '+32', pts: 55, zone: 'cl' },
  { pos: 3, team: 'Liverpool', p: 24, w: 16, d: 6, l: 2, gd: '+30', pts: 54, zone: 'cl' },
  { pos: 4, team: 'Aston Villa', p: 24, w: 15, d: 5, l: 4, gd: '+18', pts: 50, zone: 'cl' },
  { pos: 5, team: 'Tottenham', p: 24, w: 13, d: 6, l: 5, gd: '+10', pts: 45, zone: 'el' },
  { pos: 6, team: 'Newcastle', p: 24, w: 12, d: 5, l: 7, gd: '+8', pts: 41, zone: 'conf' },
  { pos: 7, team: 'Man United', p: 24, w: 11, d: 4, l: 9, gd: '-2', pts: 37, zone: '' },
  { pos: 8, team: 'Brighton', p: 24, w: 10, d: 6, l: 8, gd: '+2', pts: 36, zone: '' },
  { pos: 9, team: 'West Ham', p: 24, w: 10, d: 5, l: 9, gd: '-4', pts: 35, zone: '' },
  { pos: 10, team: 'Bournemouth', p: 24, w: 9, d: 6, l: 9, gd: '-3', pts: 33, zone: '' },
  { pos: 11, team: 'Wolves', p: 24, w: 9, d: 5, l: 10, gd: '-6', pts: 32, zone: '' },
  { pos: 12, team: 'Crystal Palace', p: 24, w: 8, d: 7, l: 9, gd: '-5', pts: 31, zone: '' },
  { pos: 13, team: 'Fulham', p: 24, w: 8, d: 6, l: 10, gd: '-8', pts: 30, zone: '' },
  { pos: 14, team: 'Everton', p: 24, w: 7, d: 7, l: 10, gd: '-10', pts: 28, zone: '' },
  { pos: 15, team: 'Brentford', p: 24, w: 7, d: 6, l: 11, gd: '-9', pts: 27, zone: '' },
  { pos: 16, team: 'Nott. Forest', p: 24, w: 6, d: 7, l: 11, gd: '-12', pts: 25, zone: '' },
  { pos: 17, team: 'Burnley', p: 24, w: 5, d: 6, l: 13, gd: '-18', pts: 21, zone: '' },
  { pos: 18, team: 'Luton Town', p: 24, w: 4, d: 5, l: 15, gd: '-24', pts: 17, zone: 'rel' },
  { pos: 19, team: 'Sheffield Utd', p: 24, w: 3, d: 4, l: 17, gd: '-30', pts: 13, zone: 'rel' },
  { pos: 20, team: 'Ipswich', p: 24, w: 2, d: 3, l: 19, gd: '-36', pts: 9, zone: 'rel' },
]

export function StandingsTable() {
  const [expanded, setExpanded] = useState(false)
  const rows = expanded ? ALL_STANDINGS : ALL_STANDINGS.slice(0, 8)

  return (
    <section>
      <div className="sba-section-head">
        <h2 className="sba-section-title">Tabela &mdash; Premier League</h2>
      </div>
      <div className="sba-standings">
        <div className="sba-standings-wrap">
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
              {rows.map((row) => (
                <tr key={row.pos}>
                  <td>
                    <span className="sba-standings-pos">
                      {row.zone && (
                        <span
                          className={`sba-standings-pos-dot sba-standings-pos-dot--${row.zone}`}
                        />
                      )}
                      <span className="sba-standings-pos-num">{row.pos}</span>
                      <span className="sba-standings-team-name">
                        {row.team}
                      </span>
                    </span>
                  </td>
                  <td>{row.p}</td>
                  <td>{row.w}</td>
                  <td>{row.d}</td>
                  <td>{row.l}</td>
                  <td>{row.gd}</td>
                  <td className="sba-standings-pts">{row.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="sba-standings-expand">
          <button
            className="sba-standings-expand-btn"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Prikaži manje \u2191' : 'Prikaži sve \u2193'}
          </button>
        </div>
      </div>
    </section>
  )
}
