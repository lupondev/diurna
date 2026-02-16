'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Match = {
  fixture: {
    id: number
    date: string
    status: { short: string; elapsed: number | null }
  }
  league: { name: string }
  teams: {
    home: { name: string }
    away: { name: string }
  }
  goals: { home: number | null; away: number | null }
}

const teamEmojis: Record<string, string> = {
  'Manchester City': '🔵',
  'Liverpool': '🔴',
  'Arsenal': '🔴',
  'Chelsea': '🔵',
  'Manchester United': '🔴',
  'Tottenham': '⚪',
  'Newcastle': '⚫⚪',
  'Real Madrid': '⚪',
  'Barcelona': '🔵🔴',
  'Atletico Madrid': '🔴⚪',
  'Bayern Munich': '🔴',
  'Borussia Dortmund': '🟡',
  'Paris Saint Germain': '🔵🔴',
  'PSG': '🔵🔴',
  'Juventus': '⚪⚫',
  'AC Milan': '🔴⚫',
  'Inter': '⚫🔵',
  'Napoli': '🔵',
  'AS Roma': '🟡🔴',
}

function getEmoji(name: string): string {
  for (const [key, emoji] of Object.entries(teamEmojis)) {
    if (name.includes(key)) return emoji
  }
  return '⚽'
}

const liveStatuses = new Set(['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'])
const scheduledStatuses = new Set(['NS', 'TBD'])

function isLive(short: string) {
  return liveStatuses.has(short)
}

function isScheduled(short: string) {
  return scheduledStatuses.has(short)
}

const topLeagues = [
  'Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1',
  'UEFA Champions League', 'UEFA Europa League', 'UEFA Conference League',
]

function sortMatches(matches: Match[]) {
  return [...matches].sort((a, b) => {
    const aLive = isLive(a.fixture.status.short) ? 0 : 1
    const bLive = isLive(b.fixture.status.short) ? 0 : 1
    if (aLive !== bLive) return aLive - bLive

    const aTop = topLeagues.findIndex((l) => a.league.name.includes(l))
    const bTop = topLeagues.findIndex((l) => b.league.name.includes(l))
    const aPrio = aTop === -1 ? 99 : aTop
    const bPrio = bTop === -1 ? 99 : bTop
    if (aPrio !== bPrio) return aPrio - bPrio

    return new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime()
  })
}

export function LiveMatches() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLive, setHasLive] = useState(false)

  useEffect(() => {
    async function fetchMatches() {
      try {
        const liveRes = await fetch('/api/football?action=live')
        const liveData = await liveRes.json()

        if (liveData.response && liveData.response.length > 0) {
          setMatches(sortMatches(liveData.response).slice(0, 6))
          setHasLive(true)
        } else {
          const todayRes = await fetch('/api/football?action=today')
          const todayData = await todayRes.json()
          if (todayData.response) {
            setMatches(sortMatches(todayData.response).slice(0, 6))
          }
        }
      } catch {} finally {
        setLoading(false)
      }
    }
    fetchMatches()

    const interval = setInterval(fetchMatches, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="db-card">
      <div className="db-card-head">
        <span className="db-card-title">⚽ {hasLive ? 'Live Now' : "Today's Matches"}</span>
        {hasLive && <span className="db-live-badge">LIVE</span>}
      </div>
      <div className="db-card-body">
        {loading ? (
          <div style={{ padding: '24px 18px', textAlign: 'center', fontSize: 12, color: 'var(--g400)' }}>
            Loading matches...
          </div>
        ) : matches.length === 0 ? (
          <div style={{ padding: '24px 18px', textAlign: 'center', fontSize: 12, color: 'var(--g400)' }}>
            No matches right now
          </div>
        ) : (
          matches.map((m) => {
            const live = isLive(m.fixture.status.short)
            const scheduled = isScheduled(m.fixture.status.short)
            const kickoff = new Date(m.fixture.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

            return (
              <div key={m.fixture.id} className="db-match">
                <div className="db-match-teams">
                  <div className="db-match-team">
                    <span>{getEmoji(m.teams.home.name)}</span> {m.teams.home.name}
                  </div>
                  <div className="db-match-team">
                    <span>{getEmoji(m.teams.away.name)}</span> {m.teams.away.name}
                  </div>
                </div>
                <div className="db-match-score">
                  {live ? (
                    <>
                      <div className="db-match-score-val">
                        {m.goals.home ?? 0} - {m.goals.away ?? 0}
                      </div>
                      <div className="db-match-min">
                        {m.fixture.status.short === 'HT' ? 'HT' : `${m.fixture.status.elapsed}'`}
                      </div>
                    </>
                  ) : scheduled ? (
                    <div className="db-match-time">{kickoff}</div>
                  ) : (
                    <div className="db-match-score-val">
                      {m.goals.home ?? 0} - {m.goals.away ?? 0}
                    </div>
                  )}
                </div>
                <Link href="/editor" className="db-match-btn">
                  {live ? 'Cover' : 'Setup AI'}
                </Link>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
