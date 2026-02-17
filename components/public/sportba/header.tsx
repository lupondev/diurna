'use client'

import Link from 'next/link'
import { useTheme } from './theme-provider'

const NAV_ITEMS = [
  { href: '/vijesti', label: 'Vijesti' },
  { href: '/transferi', label: 'Transferi' },
  { href: '/utakmice', label: 'Utakmice' },
  { href: '/povrede', label: 'Povrede' },
  { href: '/video', label: 'Video' },
]

export function Header() {
  const { toggle } = useTheme()

  return (
    <header className="sba-header" role="banner">
      <Link href="/" className="sba-logo" aria-label="Sport.ba početna">
        <span className="sba-logo-sport">SPORT</span>
        <span className="sba-logo-ba">.BA</span>
      </Link>

      <nav className="sba-header-nav" aria-label="Glavna navigacija">
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="sba-nav-link">
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="sba-actions">
        <button
          className="sba-search-btn"
          type="button"
          aria-label="Pretraži"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>

        <span
          className="sba-live-indicator"
          role="status"
          aria-label="Utakmice uživo"
        />

        <button
          className="sba-theme-toggle"
          type="button"
          onClick={toggle}
          aria-label="Promijeni temu"
        >
          <span className="sba-theme-dot" />
        </button>
      </div>
    </header>
  )
}
