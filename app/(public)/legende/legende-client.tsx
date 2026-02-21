'use client'

import { useState } from 'react'
import Link from 'next/link'

interface AthleteCard {
  id: string
  name: string
  slug: string
  sport: string
  position: string | null
  legendRank: number | null
  isGoat: boolean
  photo: string | null
  nationality: string
  careerStart: number | null
  careerEnd: number | null
  totalApps: number | null
  totalGoals: number | null
  nickname: string | null
}

const SPORT_EMOJI: Record<string, string> = {
  fudbal: '\u26BD',
  'košarka': '\uD83C\uDFC0',
  rukomet: '\uD83E\uDD3E',
  atletika: '\uD83C\uDFC3',
  boks: '\uD83E\uDD4A',
  'džudo': '\uD83E\uDD4B',
  plivanje: '\uD83C\uDFCA',
  tenis: '\uD83C\uDFBE',
}

const SPORT_FILTERS = [
  { key: 'sve', label: 'Sve' },
  { key: 'fudbal', label: 'Fudbal' },
  { key: 'košarka', label: 'Košarka' },
  { key: 'atletika', label: 'Atletika' },
  { key: 'džudo', label: 'Džudo' },
  { key: 'boks', label: 'Boks' },
  { key: 'rukomet', label: 'Rukomet' },
]

function getYears(start: number | null, end: number | null): string {
  if (!start) return ''
  return end ? `${start}–${end}` : `${start}–danas`
}

export function LegendeClient({ athletes }: { athletes: AthleteCard[] }) {
  const [sport, setSport] = useState('sve')

  const filtered = sport === 'sve' ? athletes : athletes.filter((a) => a.sport === sport)
  const podium = filtered.slice(0, 3)
  const rest = filtered.slice(3)

  if (athletes.length === 0) {
    return (
      <div className="leg-page">
        <div className="leg-header">
          <h1>Legende BiH sporta</h1>
          <p>Najveći bosanskohercegovački sportisti svih vremena</p>
        </div>
        <div className="leg-empty">
          <div className="leg-empty-icon">{'\uD83C\uDFC6'}</div>
          <div className="leg-empty-title">Uskoro dolaze legende</div>
          <p style={{ color: '#666', marginTop: 8 }}>Biografije najvećih BH sportista su u pripremi.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="leg-page">
      <div className="leg-header">
        <h1>Legende BiH sporta</h1>
        <p>Kompletne biografije, statistike i karijere najvećih bosanskohercegovačkih sportista</p>
      </div>

      {/* Sport Filter Chips */}
      <div className="leg-filters">
        {SPORT_FILTERS.map((f) => (
          <button
            key={f.key}
            className={`leg-chip ${sport === f.key ? 'leg-chip--active' : ''}`}
            onClick={() => setSport(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Podium Section — Top 3 */}
      {podium.length >= 3 && (
        <div className="leg-podium">
          {/* Rank 2 — left */}
          <PodiumCard athlete={podium[1]} rank={2} />
          {/* Rank 1 — center, taller */}
          <PodiumCard athlete={podium[0]} rank={1} />
          {/* Rank 3 — right */}
          <PodiumCard athlete={podium[2]} rank={3} />
        </div>
      )}

      {/* Legends Grid */}
      {rest.length > 0 && (
        <div className="leg-grid">
          {rest.map((a) => (
            <Link key={a.id} href={`/legende/${a.slug}`} className={`leg-card ${a.isGoat ? 'leg-card--goat' : ''}`}>
              <span className="leg-card-rank">#{a.legendRank}</span>
              <div className="leg-card-photo">
                {a.photo ? (
                  <img src={a.photo} alt={a.name} loading="lazy" />
                ) : (
                  SPORT_EMOJI[a.sport] || '\uD83C\uDFC5'
                )}
              </div>
              <div className="leg-card-name">{a.name}</div>
              <span className="leg-card-sport">{a.sport}</span>
              <div className="leg-card-years">{getYears(a.careerStart, a.careerEnd)}</div>
            </Link>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="leg-empty">
          <div className="leg-empty-icon">{'\uD83D\uDD0D'}</div>
          <div className="leg-empty-title">Nema rezultata</div>
          <p style={{ color: '#666', marginTop: 8 }}>Nema legendi u ovoj kategoriji.</p>
        </div>
      )}
    </div>
  )
}

function PodiumCard({ athlete, rank }: { athlete: AthleteCard; rank: number }) {
  const medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49']

  return (
    <Link
      href={`/legende/${athlete.slug}`}
      className={`leg-podium-card leg-podium-card--${rank}`}
    >
      <div className="leg-podium-badge">
        {medals[rank - 1]} #{rank}
      </div>
      <div className="leg-podium-photo">
        {athlete.photo ? (
          <img src={athlete.photo} alt={athlete.name} />
        ) : (
          SPORT_EMOJI[athlete.sport] || '\uD83C\uDFC5'
        )}
      </div>
      <div className="leg-podium-name">{athlete.name}</div>
      <div className="leg-podium-sport">{athlete.sport} {athlete.position ? `· ${athlete.position}` : ''}</div>
      <div className="leg-podium-years">{getYears(athlete.careerStart, athlete.careerEnd)}</div>
    </Link>
  )
}
