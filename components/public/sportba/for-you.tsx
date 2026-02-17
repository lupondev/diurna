'use client'

import { useState, useEffect } from 'react'

const ALL_TEAMS = [
  'Arsenal',
  'Chelsea',
  'Barcelona',
  'Real Madrid',
  'Man City',
  'Liverpool',
  'Bayern',
  'Juventus',
  'Inter',
  'PSG',
  'Dortmund',
  'Napoli',
]

const STORAGE_KEY = 'sportba-foryou-teams'

const TEAM_CONTENT: Record<
  string,
  { cat: string; title: string; time: string }[]
> = {
  Arsenal: [
    { cat: 'VIJESTI', title: "Arteta: 'Imamo sve što nam treba za titulu'", time: '3h' },
    { cat: 'TRANSFERI', title: 'Arsenal pojačava vezni red \u2014 tri imena na listi', time: '6h' },
  ],
  Chelsea: [
    { cat: 'VIJESTI', title: 'Palmer blistao, ali Chelsea ponovo bez pobjede', time: '2h' },
    { cat: 'POVREDE', title: 'James ponovo na listi povrijeđenih', time: '5h' },
  ],
  Barcelona: [
    { cat: 'TRANSFERI', title: 'Wirtz sve bliži Barceloni \u2014 dogovor na vidiku', time: '1h' },
    { cat: 'VIJESTI', title: 'Flick transformiše La Masiju \u2014 tri nova talenta', time: '4h' },
  ],
  'Real Madrid': [
    { cat: 'UTAKMICE', title: 'El Clásico bez Mbappéa \u2014 Ancelotti ima plan B', time: '2h' },
    { cat: 'VIJESTI', title: 'Bellingham najbolji igrač januara', time: '7h' },
  ],
  'Man City': [
    { cat: 'VIJESTI', title: "Guardiola: 'Haaland je nezaustavljiv'", time: '1h' },
    { cat: 'TRANSFERI', title: 'João Neves potpisao petogodišnji ugovor', time: '3h' },
  ],
  Liverpool: [
    { cat: 'VIJESTI', title: 'Slot nastavlja pobjednički niz \u2014 sedma uzastopna', time: '4h' },
    { cat: 'UTAKMICE', title: 'Liverpool \u2013 Man City: Najava derbija kola', time: '8h' },
  ],
  Bayern: [
    { cat: 'VIJESTI', title: 'Kompany vodi Bayern ka novoj Bundesliga tituli', time: '3h' },
    { cat: 'TRANSFERI', title: 'Bayern cilja pojačanje u odbrani \u2014 tri kandidata', time: '6h' },
  ],
  Juventus: [
    { cat: 'VIJESTI', title: 'Thiago Motta mijenja taktiku \u2014 Juventus napada', time: '4h' },
    { cat: 'TRANSFERI', title: 'Kolo Muani stigao u Torino \u2014 prvi trening', time: '2h' },
  ],
  Inter: [
    { cat: 'UTAKMICE', title: 'Inter favorit u Derbiju della Madonnina', time: '3h' },
    { cat: 'VIJESTI', title: 'Lautaro Martinez produžio ugovor do 2029', time: '7h' },
  ],
  PSG: [
    { cat: 'VIJESTI', title: 'PSG dominira Ligue 1 \u2014 prednost 12 bodova', time: '5h' },
    { cat: 'TRANSFERI', title: 'Dembélé produžio \u2014 fokus na Ligu prvaka', time: '8h' },
  ],
  Dortmund: [
    { cat: 'VIJESTI', title: 'Dortmund traži konzistentnost u Bundesligi', time: '4h' },
    { cat: 'UTAKMICE', title: 'Revierderby: Dortmund protiv Schalkea', time: '6h' },
  ],
  Napoli: [
    { cat: 'VIJESTI', title: "Conte: 'Napoli se vraća na vrh'", time: '3h' },
    { cat: 'UTAKMICE', title: 'Napoli \u2013 Juventus: Najava utakmice kola', time: '5h' },
  ],
}

export function ForYou() {
  const [followed, setFollowed] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setFollowed(JSON.parse(stored))
    } catch {}
    setMounted(true)
  }, [])

  const toggle = (team: string) => {
    setFollowed((prev) => {
      const next = prev.includes(team)
        ? prev.filter((t) => t !== team)
        : [...prev, team]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const content = followed.flatMap((team) =>
    (TEAM_CONTENT[team] || []).map((c) => ({ ...c, team }))
  )

  return (
    <section>
      <div className="sba-section-head">
        <h2 className="sba-section-title">Za tebe</h2>
      </div>
      <div
        className="sba-foryou-chips"
        role="group"
        aria-label="Odaberi timove"
      >
        {ALL_TEAMS.map((team) => (
          <button
            key={team}
            className={`sba-foryou-chip${followed.includes(team) ? ' sba-foryou-chip--active' : ''}`}
            onClick={() => toggle(team)}
            aria-pressed={followed.includes(team)}
          >
            {team}
          </button>
        ))}
      </div>

      {mounted && followed.length === 0 && (
        <div className="sba-foryou-empty">
          Odaberi timove iznad za personalizirane vijesti
        </div>
      )}

      {content.length > 0 && (
        <div className="sba-foryou-content">
          {content.map((item, i) => (
            <div key={i} className="sba-foryou-card">
              <div className="sba-foryou-card-cat">{item.cat}</div>
              <div className="sba-foryou-card-title">{item.title}</div>
              <div className="sba-foryou-card-meta">
                {item.team} &middot; {item.time}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
