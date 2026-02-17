import Link from 'next/link'

const CATEGORIES = [
  { href: '/vijesti', label: 'Vijesti' },
  { href: '/transferi', label: 'Transferi' },
  { href: '/utakmice', label: 'Utakmice' },
  { href: '/povrede', label: 'Povrede' },
  { href: '/video', label: 'Video' },
]

const LEAGUES = [
  { href: '/lige/premier-league', label: 'Premier League' },
  { href: '/lige/la-liga', label: 'La Liga' },
  { href: '/lige/serie-a', label: 'Serie A' },
  { href: '/lige/bundesliga', label: 'Bundesliga' },
  { href: '/lige/liga-prvaka', label: 'Liga prvaka' },
]

const OTHER = [
  { href: '/rss', label: 'RSS' },
  { href: '/o-nama', label: 'O nama' },
  { href: '/kontakt', label: 'Kontakt' },
  { href: '/privatnost', label: 'Privatnost' },
]

export function Footer() {
  return (
    <footer className="sba-footer" role="contentinfo">
      <div className="sba-footer-grid">
        <div>
          <div className="sba-logo" aria-hidden="true">
            <span className="sba-logo-sport">SPORT</span>
            <span className="sba-logo-ba">.BA</span>
          </div>
          <p className="sba-footer-brand-desc">
            Najnovije sportske vijesti, transferi, rezultati i analize iz
            svijeta fudbala.
          </p>
        </div>

        <div>
          <h3 className="sba-footer-heading">Kategorije</h3>
          <div className="sba-footer-links">
            {CATEGORIES.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="sba-footer-link"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="sba-footer-heading">Lige</h3>
          <div className="sba-footer-links">
            {LEAGUES.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="sba-footer-link"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="sba-footer-heading">Ostalo</h3>
          <div className="sba-footer-links">
            {OTHER.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="sba-footer-link"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="sba-footer-bottom">
        &copy; 2026 Sport.ba &middot; Powered by Diurna &middot; Lupon Media
      </div>
    </footer>
  )
}
