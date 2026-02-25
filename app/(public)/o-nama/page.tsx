import type { Metadata } from 'next'
import { StaticNav } from '@/components/public/sportba/static-nav'
import { canonicalUrl } from '@/lib/seo'
import '../static.css'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'O nama \u2014 Diurna',
  description: 'Upoznajte redakciju Diurna \u2014 najnovije sportske vijesti iz BiH i svijeta.',
  alternates: { canonical: canonicalUrl('/o-nama') },
}

const TEAM = [
  {
    name: 'Emir Had\u017ei\u0107',
    role: 'Glavni urednik',
    desc: 'Vi\u0161e od 10 godina iskustva u sportskom novinarstvu. Prati Premijer ligu, Ligu prvaka i doma\u0107i fudbal.',
  },
  {
    name: 'Amina Kova\u010devi\u0107',
    role: 'Senior reporter',
    desc: 'Specijalizirana za transfer tr\u017ei\u0161te i analizu igra\u010da. Prethodno pisala za Oslobo\u0111enje.',
  },
  {
    name: 'Damir Begovi\u0107',
    role: 'Tech Lead',
    desc: 'Full-stack developer koji gradi platformu Diurna. Koristi Next.js, Prisma i Vercel infrastrukturu.',
  },
]

export default function AboutPage() {
  return (
    <main className="sba-sp">
      <StaticNav current="/o-nama" />
      <div className="sba-sp-content">
        <h1 className="sba-sp-title">O nama</h1>
        <div className="sba-sp-prose">
          <p>
            Diurna je bosansko-hercegova\u010dki sportski portal posvje\u0107en pravovremenoj, ta\u010dnoj i kvalitetnoj sportskoj
            informaciji. Na\u0161a misija je da navija\u010dima pru\u017eimo sve \u0161to im treba na jednom mjestu \u2014 od vijesti
            i transfera, do rezultata u\u017eivo i dubinskih analiza.
          </p>
          <p>
            Pokrenuti 2026. godine kao dio Diurna platforme, Diurna koristi najmodernije tehnologije
            za isporuku sadr\u017eaja. Na\u0161a redakcija kombinuje novinarski integritet sa inovativnim alatima
            kako bi prona\u0161la, verificirala i prezentirala sportske vijesti brzo i pouzdano.
          </p>
          <p>
            Fokusirani smo na fudbal \u2014 Premijer ligu, La Ligu, Serie A, Bundesligu i Ligu prvaka \u2014
            ali pokrivamo i ko\u0161arku, tenis i druge sportove relevantne za na\u0161u publiku.
          </p>

          <h2>Na\u0161 tim</h2>
        </div>

        <div className="sba-sp-team-grid">
          {TEAM.map((m) => (
            <div key={m.name} className="sba-sp-team-card">
              <div className="sba-sp-team-name">{m.name}</div>
              <span className="sba-sp-team-role">{m.role}</span>
              <div className="sba-sp-team-desc">{m.desc}</div>
            </div>
          ))}
        </div>

        <div className="sba-sp-prose">
          <h2>Tehnolo\u0161ka pozadina</h2>
          <p>
            Diurna je izgra\u0111en na <strong>Next.js 14</strong> App Routeru sa <strong>Prisma ORM</strong> i{' '}
            <strong>PostgreSQL</strong> bazom. Hosting je na <strong>Vercel</strong> platformi sa
            edge runtime za minimalne latencije. Koristimo <strong>NextAuth</strong> za autentikaciju,{' '}
            <strong>Tailwind CSS</strong> i custom design sistem za UI, te <strong>AI asistente</strong> za
            pomo\u0107 u pisanju i ure\u0111ivanju sadr\u017eaja. Infrastrukturu za ogla\u0161avanje podr\u017eava Lupon SSP.
          </p>
        </div>
      </div>
    </main>
  )
}
