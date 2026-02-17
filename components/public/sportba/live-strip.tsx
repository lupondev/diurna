import Link from 'next/link'

export type LiveMatch = {
  id: string
  home: string
  away: string
  homeScore?: number
  awayScore?: number
  status: 'live' | 'ft' | 'scheduled'
  minute?: number
  time?: string
}

type LiveStripProps = {
  matches?: LiveMatch[]
}

export function LiveStrip({ matches = [] }: LiveStripProps) {
  if (matches.length === 0) return null

  return (
    <div className="sba-live-strip" role="region" aria-label="Utakmice uživo">
      <div className="sba-live-label">
        <span className="sba-live-label-dot" aria-hidden="true" />
        UŽIVO
      </div>
      <div className="sba-live-scroll">
        {matches.map((match) => (
          <Link key={match.id} href={`/utakmica/${match.id}`} className="sba-match-pill">
            <span className="sba-match-team">{match.home}</span>
            {(match.status === 'live' || match.status === 'ft') && (
              <span className="sba-match-score">
                {match.homeScore}&ndash;{match.awayScore}
              </span>
            )}
            <span className="sba-match-team">{match.away}</span>
            {match.status === 'live' && match.minute != null && (
              <span className="sba-match-minute">{`${match.minute}'`}</span>
            )}
            {match.status === 'ft' && (
              <span className="sba-match-ft">FT</span>
            )}
            {match.status === 'scheduled' && match.time && (
              <span className="sba-match-time">{match.time}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
