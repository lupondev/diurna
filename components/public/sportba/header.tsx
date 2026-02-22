'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTheme } from './theme-provider'
import { SearchOverlay } from './search-overlay'

const FOOTBALL_NAV = [
  { href: '/vijesti', label: 'Vijesti' },
  { href: '/transferi', label: 'Transferi' },
  { href: '/utakmice', label: 'Utakmice' },
  { href: '/igraci', label: 'Igrači' },
  { href: '/tabela', label: 'Tabela' },
  { href: '/povrede', label: 'Povrede' },
  { href: '/video', label: 'Video' },
  { href: '/legende', label: 'Legende' },
  { href: '/organizacije', label: 'Organizacije' },
]

const NEWS_NAV_MAIN = [
  { href: '/vijesti', label: 'Vijesti' },
  { href: '/aktuelno', label: 'Aktuelno' },
  { href: '/bih', label: 'BiH' },
  { href: '/svijet', label: 'Svijet' },
  { href: '/tech', label: 'Tech' },
  { href: '/biznis', label: 'Biznis' },
]

const NEWS_NAV_MORE = [
  { href: '/region', label: 'Region' },
  { href: '/legende', label: 'Legende' },
  { href: '/organizacije', label: 'Organizacije' },
]

function isFootballSite(name: string): boolean {
  const lower = name.toLowerCase()
  return lower.includes('football') || lower.includes('sport') || lower.includes('fudbal')
}

function parseLogo(name: string) {
  const dot = name.indexOf('.')
  if (dot > 0) return { main: name.slice(0, dot).toUpperCase(), suffix: name.slice(dot).toUpperCase() }
  return { main: name.toUpperCase(), suffix: '' }
}

export function Header({ siteName = 'TodayFootballMatch' }: { siteName?: string }) {
  const { toggle } = useTheme()
  const logo = parseLogo(siteName)
  const [moreOpen, setMoreOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const isFootball = isFootballSite(siteName)
  const navItems = isFootball ? FOOTBALL_NAV : NEWS_NAV_MAIN

  return (
    <>
      <header className="sba-header" role="banner">
        <Link href="/" className="sba-logo" aria-label={`${siteName} početna`}>
          <span className="sba-logo-sport">{logo.main}</span>
          {logo.suffix && <span className="sba-logo-ba">{logo.suffix}</span>}
        </Link>

        <nav className="sba-header-nav" aria-label="Glavna navigacija">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="sba-nav-link">
              {item.label}
            </Link>
          ))}
          {!isFootball && (
            <div style={{ position: 'relative' }}>
              <button
                className="sba-nav-link"
                onClick={() => setMoreOpen(!moreOpen)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit', padding: 'inherit' }}
                aria-expanded={moreOpen}
              >
                Više ▾
              </button>
              {moreOpen && (
                <div
                  style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 4,
                    background: 'var(--sba-bg-1, #1a1a1a)', border: '1px solid var(--sba-border, #333)',
                    borderRadius: 8, padding: '4px 0', minWidth: 140, zIndex: 100,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  }}
                >
                  {NEWS_NAV_MORE.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="sba-nav-link"
                      style={{ display: 'block', padding: '8px 16px', whiteSpace: 'nowrap' }}
                      onClick={() => setMoreOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="sba-actions">
          <button
            className="sba-search-btn"
            type="button"
            aria-label="Pretraži"
            onClick={() => setSearchOpen(true)}
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

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  )
}
