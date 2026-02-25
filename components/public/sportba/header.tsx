'use client'

import { useState, useEffect, useRef } from 'react'
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

export function Header({ siteName = 'TodayFootballMatch', liveCount = 0 }: { siteName?: string; liveCount?: number }) {
  const { toggle } = useTheme()
  const logo = parseLogo(siteName)
  const [moreOpen, setMoreOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [slim, setSlim] = useState(false)
  const lastY = useRef(0)

  const isFootball = isFootballSite(siteName)
  const navItems = isFootball ? FOOTBALL_NAV : NEWS_NAV_MAIN
  const allMobileItems = isFootball ? FOOTBALL_NAV : [...NEWS_NAV_MAIN, ...NEWS_NAV_MORE]

  useEffect(() => {
    if (mobileNavOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [mobileNavOpen])

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      const prev = lastY.current
      lastY.current = y
      setSlim(y > 100 && y > prev)
    }
    let ticking = false
    const handle = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          onScroll()
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener('scroll', handle, { passive: true })
    return () => window.removeEventListener('scroll', handle)
  }, [])

  return (
    <>
      <header
        className={`sba-header${slim ? ' sba-header--slim' : ''}`}
        role="banner"
        aria-hidden={slim}
      >
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

        <div className="sba-header-nav-mobile">
          <button
            type="button"
            className="sba-hamburger"
            aria-label={mobileNavOpen ? 'Zatvori meni' : 'Otvori meni'}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            <span className="sba-hamburger-icon" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>

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

      {slim && (
        <header className="sba-header-slim" role="banner" aria-hidden="false">
          <Link href="/" className="sba-logo sba-logo--compact" aria-label={`${siteName} početna`}>
            <span className="sba-logo-sport">{logo.main}</span>
            {logo.suffix && <span className="sba-logo-ba">{logo.suffix}</span>}
          </Link>
          {liveCount > 0 && (
            <span className="sba-header-slim-live" role="status">
              <span className="sba-live-label-dot" aria-hidden />
              {liveCount} UŽIVO
            </span>
          )}
          <div className="sba-header-nav-mobile">
            <button
              type="button"
              className="sba-hamburger"
              aria-label={mobileNavOpen ? 'Zatvori meni' : 'Otvori meni'}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
            >
              <span className="sba-hamburger-icon" aria-hidden><span /><span /><span /></span>
            </button>
          </div>
          <div className="sba-actions">
            <button type="button" className="sba-search-btn" aria-label="Pretraži" onClick={() => setSearchOpen(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </button>
            <span className="sba-live-indicator" aria-hidden />
            <button type="button" className="sba-theme-toggle" aria-label="Promijeni temu" onClick={toggle}>
              <span className="sba-theme-dot" />
            </button>
          </div>
        </header>
      )}

      {mobileNavOpen && (
        <div className="sba-mobile-nav-overlay" role="dialog" aria-label="Navigacija">
          {allMobileItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="sba-nav-link"
              onClick={() => setMobileNavOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  )
}
