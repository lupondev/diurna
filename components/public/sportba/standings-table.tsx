'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SkeletonTable } from '@/components/public/Skeleton'

type StandingRow = {
  pos: number
  team: string
  p: number
  w: number
  d: number
  l: number
  gd: string
  pts: number
  zone: string
}

function zoneForRank(rank: number, total: number): string {
  if (rank <= 4) return 'cl'
  if (rank === 5) return 'el'
  if (rank === 6) return 'conf'
  if (rank > total - 3) return 'rel'
  return ''
}

export function StandingsTable({ limit }: { limit?: number } = {}) {
  const [standings, setStandings] = useState<StandingRow[]>([])
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/newsroom/stats')
      .then(r => r.json() as Promise<{ standings?: { rank: number; team: { name: string }; points: number; all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } } }[] }>)
      .then((data) => {
        if (data.standings && data.standings.length > 0) {
          const total = data.standings.length
          const rows: StandingRow[] = data.standings.map(s => {
            const gd = s.all.goals.for - s.all.goals.against
            return {
              pos: s.rank,
              team: s.team.name,
              p: s.all.played,
              w: s.all.win,
              d: s.all.draw,
              l: s.all.lose,
              gd: gd >= 0 ? `+${gd}` : `${gd}`,
              pts: s.points,
              zone: zoneForRank(s.rank, total),
            }
          })
          setStandings(rows)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <section>
        <div className="sba-section-head">
          <h2 className="sba-section-title">Tabela &mdash; Premier League</h2>
        </div>
        <div className="sba-standings">
          <div className="sba-standings-wrap">
            <SkeletonTable rows={8} />
          </div>
        </div>
      </section>
    )
  }

  if (standings.length === 0) return null

  const maxRows = limit ?? 8
  const rows = limit != null
    ? standings.slice(0, limit)
    : (expanded ? standings : standings.slice(0, 8))

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
        {limit == null && standings.length > 8 && (
          <div className="sba-standings-expand">
            <button
              className="sba-standings-expand-btn"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Prikazi manje \u2191' : 'Prikazi sve \u2193'}
            </button>
          </div>
        )}
        {limit != null && standings.length > limit && (
          <div className="sba-standings-expand">
            <Link href="/tabela" className="sba-standings-expand-btn" style={{ textDecoration: 'none' }}>
              Vidi tabelu &rarr;
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
