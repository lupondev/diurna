import Link from 'next/link'

export type LiveMatch = {
  id: string
  home: string
  away: string
  homeLogo?: string
  awayLogo?: string
  homeScore?: number
  awayScore?: number
  status: 'live' | 'ft' | 'scheduled'
  minute?: number
  time?: string
  league?: string
}

type LiveStripProps = {
  matches?: LiveMatch[]
}

export function LiveStrip({ matches = [] }: LiveStripProps) {
  if (matches.length === 0) return null

  return (
    <div className="sba-live-strip" role="region" aria-label="Utakmice uživo" aria-live="polite">
      <div className="sba-live-label">
        <span className="sba-live-label-dot" aria-hidden="true" />
        UŽIVO
      </div>
      <div className="sba-live-scroll">
        {matches.map((match) => (
          <Link
            key={match.id}
            href={`/utakmica/${match.id}`}
            className={`sba-match-pill${match.status === 'live' ? ' sba-match-pill--live' : ''}`}
          >
            {match.homeLogo ? (
              <img src={match.homeLogo} alt="" width={20} height={20} className="sba-match-crest" />
            ) : null}
            <span className="sba-match-team">{match.home.length > 12 ? match.home.slice(0, 10) + '…' : match.home}</span>
            {(match.status === 'live' || match.status === 'ft') && (
              <span className="sba-match-score">
                {match.homeScore}&ndash;{match.awayScore}
              </span>
            )}
            <span className="sba-match-team">{match.away.length > 12 ? match.away.slice(0, 10) + '…' : match.away}</span>
            {match.awayLogo ? (
              <img src={match.awayLogo} alt="" width={20} height={20} className="sba-match-crest" />
            ) : null}
            {match.status === 'live' && match.minute != null && (
              <span className="sba-match-minute" aria-label={`${match.minute}. minuta`}>{`${match.minute}'`}</span>
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
