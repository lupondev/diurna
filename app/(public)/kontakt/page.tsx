import type { Metadata } from 'next'
import { StaticNav } from '@/components/public/sportba/static-nav'
import { ContactForm } from '@/components/public/sportba/contact-form'
import '../static.css'

export const metadata: Metadata = {
  title: 'Kontakt \u2014 Sport.ba',
  description: 'Kontaktirajte redakciju Sport.ba.',
}

const EMAILS = [
  {
    dept: 'Redakcija',
    addr: 'redakcija@sport.ba',
    desc: 'Za vijesti, ispravke, prijedloge i saradnju sa novinarima.',
  },
  {
    dept: 'Marketing',
    addr: 'marketing@sport.ba',
    desc: 'Za ogla\u0161avanje, sponzorstva i poslovnu saradnju.',
  },
  {
    dept: 'Podr\u0161ka',
    addr: 'support@sport.ba',
    desc: 'Za tehni\u010dke probleme, prijavu gre\u0161aka i korisni\u010dku pomo\u0107.',
  },
  {
    dept: 'Privatnost',
    addr: 'privacy@sport.ba',
    desc: 'Za pitanja o privatnosti, GDPR zahtjeve i brisanje podataka.',
  },
]

export default function ContactPage() {
  return (
    <main className="sba-sp">
      <StaticNav current="/kontakt" />
      <div className="sba-sp-content">
        <h1 className="sba-sp-title">Kontakt</h1>
        <div className="sba-sp-prose">
          <p>
            Imate pitanje, prijedlog ili \u017eelite prijaviti gre\u0161ku? Javite nam se putem jednog
            od kontakata ispod ili koristite obrazac na dnu stranice.
          </p>
        </div>

        <div className="sba-sp-email-grid">
          {EMAILS.map((e) => (
            <a
              key={e.addr}
              href={`mailto:${e.addr}`}
              className="sba-sp-email-card"
            >
              <span className="sba-sp-email-dept">{e.dept}</span>
              <span className="sba-sp-email-addr">{e.addr}</span>
              <div className="sba-sp-email-desc">{e.desc}</div>
            </a>
          ))}
        </div>

        <div className="sba-sp-prose">
          <h2>Po\u0161aljite poruku</h2>
          <p>
            Popunite obrazac ispod i odgovorit \u0107emo u najkra\u0107em roku.
          </p>
        </div>

        <ContactForm />
      </div>
    </main>
  )
}
