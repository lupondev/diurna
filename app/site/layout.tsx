import { getDefaultSite, getCategories } from '@/lib/db'
import { SubscribeWidget } from '@/components/subscribe-widget'
import Link from 'next/link'
import './public.css'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const site = await getDefaultSite()
  const categories = site ? await getCategories(site.id) : []

  const themeCls = site?.theme === 'midnight' ? 'theme-midnight' : 'theme-editorial'
  const siteName = site?.name || 'Diurna'

  return (
    <div className={`pub-wrap ${themeCls}`}>
      <header className="pub-header">
        <div className="pub-header-inner">
          <Link href="/site" className="pub-logo">{siteName}</Link>
          <nav className="pub-nav">
            {categories.map((cat) => (
              <Link key={cat.id} href={`/site/category/${cat.slug}`}>{cat.name}</Link>
            ))}
          </nav>
        </div>
      </header>

      {children}

      <footer className="pub-footer">
        <div className="pub-footer-inner">
          <div className="pub-footer-grid">
            <div>
              <div className="pub-footer-brand">{siteName}</div>
              <p className="pub-footer-desc">
                Your source for the latest news, analysis, and in-depth reporting.
              </p>
              <div className="pub-footer-subscribe">
                <SubscribeWidget siteName={siteName} />
              </div>
            </div>
            <div>
              <h4>Categories</h4>
              <ul className="pub-footer-links">
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <Link href={`/site/category/${cat.slug}`}>{cat.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Pages</h4>
              <ul className="pub-footer-links">
                <li><Link href="/site/about">About</Link></li>
                <li><Link href="/site/privacy">Privacy Policy</Link></li>
                <li><Link href="/site/impressum">Impressum</Link></li>
              </ul>
            </div>
          </div>
          <div className="pub-footer-bottom">
            <span>&copy; {new Date().getFullYear()} {siteName}. All rights reserved.</span>
            <span className="pub-footer-powered">
              Powered by <a href="https://diurna.app">Diurna</a> + <a href="https://luponmedia.com">Lupon Media</a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
