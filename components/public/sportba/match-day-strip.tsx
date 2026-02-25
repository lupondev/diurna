'use client'

import Link from 'next/link'
import type { LiveMatch } from './live-strip'

function abbr(name: string): string {
  const map: Record<string, string> = {
    'Manchester United': 'MUN', 'Manchester City': 'MCI', 'Tottenham Hotspur': 'TOT',
    'Nottingham Forest': 'NFO', 'Wolverhampton Wanderers': 'WOL', 'West Ham United': 'WHU',
    'Newcastle United': 'NEW', 'Crystal Palace': 'CRY', 'Aston Villa': 'AVL',
    'AFC Bournemouth': 'BOU', 'Sheffield United': 'SHU', 'Atletico Madrid': 'ATM',
    'Real Madrid': 'RMA', 'Borussia Dortmund': 'BVB', 'Paris Saint Germain': 'PSG',
    'AC Milan': 'MIL', 'AS Roma': 'ROM', 'Inter': 'INT',
  }
  return map[name] || name.slice(0, 3).toUpperCase()
}

export function MatchDayStrip({ matches = [] }: { matches?: LiveMatch[] }) {
  if (matches.length === 0) return null

  return (
    <section className="sba-match-day">
      <div className="sba-section-head">
        <h2 className="sba-section-title">Uživo danas</h2>
        <Link href="/utakmice" className="sba-section-more">Sve utakmice &rarr;</Link>
      </div>
      <div className="sba-match-day-scroll">
        {matches.map((match) => {
          const hasScore = match.homeScore != null && match.awayScore != null
          return (
            <Link
              key={match.id}
              href={`/utakmica/${match.id}`}
              className="sba-match-day-card"
            >
              {match.status === 'live' && (
                <span className="sba-match-day-live-dot" aria-hidden />
              )}
              <div className="sba-match-day-teams">
                <span className="sba-match-day-team">{abbr(match.home)}</span>
                <span className="sba-match-day-score">
                  {hasScore ? `${match.homeScore}\u2013${match.awayScore}` : match.time ?? 'vs'}
                </span>
                <span className="sba-match-day-team">{abbr(match.away)}</span>
              </div>
              {match.status === 'live' && match.minute != null && (
                <span className="sba-match-day-min">{match.minute}&apos;</span>
              )}
              {match.status === 'ft' && (
                <span className="sba-match-day-ft">FT</span>
              )}
              {match.league && (
                <span className="sba-match-day-league">{match.league}</span>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
