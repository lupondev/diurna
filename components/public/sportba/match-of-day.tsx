'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type MatchData = {
  id: number
  home: string
  away: string
  homeScore: number | null
  awayScore: number | null
  minute: string
  status: string
  league: string
}

export function MatchOfDay() {
  const [match, setMatch] = useState<MatchData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/newsroom/fixtures')
      .then(r => r.json() as Promise<{ live?: { id: number; homeTeam: string; awayTeam: string; homeGoals: number | null; awayGoals: number | null; elapsed: number | null; status: string; league: string }[]; fixtures?: { id: number; homeTeam: string; awayTeam: string; homeGoals: number | null; awayGoals: number | null; elapsed: number | null; status: string; league: string }[] }>)
      .then((data) => {
        const live = data.live?.[0]
        if (live) {
          setMatch({
            id: live.id,
            home: live.homeTeam,
            away: live.awayTeam,
            homeScore: live.homeGoals,
            awayScore: live.awayGoals,
            minute: live.elapsed ? `${live.elapsed}'` : '',
            status: 'LIVE',
            league: live.league,
          })
        } else if (data.fixtures && data.fixtures.length > 0) {
          const f = data.fixtures[0]
          setMatch({
            id: f.id,
            home: f.homeTeam,
            away: f.awayTeam,
            homeScore: f.homeGoals,
            awayScore: f.awayGoals,
            minute: f.elapsed ? `${f.elapsed}'` : '',
            status: f.status === 'FT' ? 'FT' : 'Scheduled',
            league: f.league,
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <section>
        <div className="sba-section-head">
          <h2 className="sba-section-title">Utakmica dana</h2>
        </div>
        <div className="sba-motd" style={{ minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--sba-text-3)', fontSize: 13, fontFamily: 'var(--sba-mono)' }}>Ucitavanje...</span>
        </div>
      </section>
    )
  }

  if (!match) return null

  const hasScore = match.homeScore != null && match.awayScore != null

  return (
    <section>
      <div className="sba-section-head">
        <h2 className="sba-section-title">Utakmica dana</h2>
      </div>
      <div className="sba-motd">
        <Link href={`/utakmica/${match.id}`} className="sba-motd-scoreboard">
          <div className="sba-motd-team">
            <span className="sba-motd-team-name">{match.home}</span>
          </div>
          <div className="sba-motd-score-block">
            {hasScore ? (
              <>
                <span className="sba-motd-score">{`${match.homeScore} \u2013 ${match.awayScore}`}</span>
                {match.status === 'LIVE' && match.minute && (
                  <span className="sba-motd-minute">{match.minute}</span>
                )}
                {match.status === 'FT' && (
                  <span className="sba-motd-minute">FT</span>
                )}
              </>
            ) : (
              <span className="sba-motd-score" style={{ fontSize: 14 }}>vs</span>
            )}
          </div>
          <div className="sba-motd-team">
            <span className="sba-motd-team-name">{match.away}</span>
          </div>
        </Link>
        <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 11, color: 'var(--sba-text-3)', fontFamily: 'var(--sba-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {match.league}
        </div>
      </div>
    </section>
  )
}
