import { getDefaultSite, getCategories } from '@/lib/db'
import Link from 'next/link'
import './public.css'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const site = await getDefaultSite()
  const categories = site ? await getCategories(site.id) : []
  const themeCls = site?.theme === 'midnight' ? 'theme-midnight' : 'theme-editorial'
  const siteName = site?.name || 'TodayFootballMatch'

  return (
    <div className={`pub-wrap ${themeCls}`}>

      {/* ── BREAKING TICKER ── */}
      <div className="tfm-ticker">
        <span className="tfm-ticker-label">⚡ LIVE</span>
        <div className="tfm-ticker-track">
          <div className="tfm-ticker-inner">
            <span>Champions League Quarterfinal Draw Results</span>
            <span>·</span>
            <span>Transfer Window Closes In 48 Hours</span>
            <span>·</span>
            <span>Premier League Matchday 28 Preview</span>
            <span>·</span>
            <span>Latest Injury Updates From Top Clubs</span>
            <span>·</span>
            <span>Champions League Quarterfinal Draw Results</span>
            <span>·</span>
            <span>Transfer Window Closes In 48 Hours</span>
            <span>·</span>
            <span>Premier League Matchday 28 Preview</span>
            <span>·</span>
            <span>Latest Injury Updates From Top Clubs</span>
          </div>
        </div>
      </div>

      {/* ── HEADER ── */}
      <header className="tfm-header">
        <div className="tfm-header-inner">
          <Link href="/site" className="tfm-logo">
            <span className="tfm-logo-icon">⚽</span>
            <span className="tfm-logo-text">{siteName}</span>
          </Link>

          <nav className="tfm-nav">
            {categories.slice(0, 7).map((cat) => (
              <Link key={cat.id} href={`/site/category/${cat.slug}`} className="tfm-nav-link">
                {cat.name}
              </Link>
            ))}
          </nav>

          <div className="tfm-header-actions">
            <Link href="/site" className="tfm-search-btn" title="Search">🔍</Link>
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main>{children}</main>

      {/* ── FOOTER ── */}
      <footer className="tfm-footer">
        <div className="tfm-footer-inner">
          <div className="tfm-footer-grid">
            <div>
              <div className="tfm-footer-brand">⚽ {siteName}</div>
              <p className="tfm-footer-desc">
                Your destination for football news, match analysis, transfer rumours, and live scores.
              </p>
            </div>
            <div>
              <h4>Categories</h4>
              <ul className="pub-footer-links">
                {categories.slice(0, 6).map((cat) => (
                  <li key={cat.id}>
                    <Link href={`/site/category/${cat.slug}`}>{cat.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Site</h4>
              <ul className="pub-footer-links">
                <li><Link href="/site/about">About Us</Link></li>
                <li><Link href="/site/privacy">Privacy Policy</Link></li>
                <li><Link href="/site/impressum">Impressum</Link></li>
              </ul>
            </div>
          </div>
          <div className="pub-footer-bottom">
            <span>© {new Date().getFullYear()} {siteName}. All rights reserved.</span>
            <span className="pub-footer-powered">
              Powered by <a href="https://diurna.app" target="_blank" rel="noopener">Diurna</a> · <a href="https://luponmedia.com" target="_blank" rel="noopener">Lupon Media SSP</a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
