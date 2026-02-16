'use client'

import { useState, useRef, useEffect } from 'react'
import { LOCALES, type Locale } from '@/lib/i18n'

interface LanguageSelectorProps {
  locale: Locale
  onChange: (locale: Locale) => void
  compact?: boolean
}

export function LanguageSelector({ locale, onChange, compact }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const current = LOCALES.find((l) => l.code === locale) || LOCALES[0]

  return (
    <div ref={ref} className="lang-selector" style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="lang-trigger"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: compact ? '0.3rem 0.5rem' : '0.4rem 0.75rem',
          border: '1px solid var(--brd, #e5e7eb)',
          borderRadius: '6px',
          background: 'var(--wh, #fff)',
          color: 'var(--tx, #333)',
          fontSize: compact ? '0.75rem' : '0.85rem',
          cursor: 'pointer',
          fontFamily: 'var(--sans)',
        }}
      >
        <span>{current.flag}</span>
        {!compact && <span>{current.label}</span>}
        <span style={{ fontSize: '0.6rem', marginLeft: '0.15rem' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          className="lang-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            background: 'var(--wh, #fff)',
            border: '1px solid var(--brd, #e5e7eb)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 50,
            minWidth: '160px',
            overflow: 'hidden',
          }}
        >
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => { onChange(l.code); setOpen(false) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: 'none',
                background: l.code === locale ? 'var(--accent-bg, #f0fdf9)' : 'transparent',
                color: 'var(--tx, #333)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontFamily: 'var(--sans)',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => { if (l.code !== locale) (e.target as HTMLElement).style.background = 'var(--g50, #f9fafb)' }}
              onMouseLeave={(e) => { if (l.code !== locale) (e.target as HTMLElement).style.background = 'transparent' }}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
              {l.code === locale && <span style={{ marginLeft: 'auto', color: 'var(--accent, #00D4AA)' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
