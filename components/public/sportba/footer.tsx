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

function parseLogo(name: string) {
  const dot = name.indexOf('.')
  if (dot > 0) return { main: name.slice(0, dot).toUpperCase(), suffix: name.slice(dot).toUpperCase() }
  return { main: name.toUpperCase(), suffix: '' }
}

// Controlled via NEXT_PUBLIC_SHOW_POWERED_BY env var.
// Default: hidden in production (tenant branding must be clean).
// Set NEXT_PUBLIC_SHOW_POWERED_BY=true only on internal/demo deployments.
const SHOW_POWERED_BY = process.env.NEXT_PUBLIC_SHOW_POWERED_BY === 'true'

export function Footer({ siteName = 'TodayFootballMatch' }: { siteName?: string }) {
  const logo = parseLogo(siteName)

  return (
    <footer className="sba-footer" role="contentinfo">
      <div className="sba-footer-grid">
        <div>
          <div className="sba-logo" aria-hidden="true">
            <span className="sba-logo-sport">{logo.main}</span>
            {logo.suffix && <span className="sba-logo-ba">{logo.suffix}</span>}
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
              <Link key={item.href} href={item.href} className="sba-footer-link">
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="sba-footer-heading">Lige</h3>
          <div className="sba-footer-links">
            {LEAGUES.map((item) => (
              <Link key={item.href} href={item.href} className="sba-footer-link">
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="sba-footer-heading">Ostalo</h3>
          <div className="sba-footer-links">
            {OTHER.map((item) => (
              <Link key={item.href} href={item.href} className="sba-footer-link">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="sba-footer-bottom">
        &copy; {new Date().getFullYear()} {siteName}
        {SHOW_POWERED_BY && <> &middot; Powered by Diurna &middot; Lupon Media</>}
      </div>
    </footer>
  )
}
