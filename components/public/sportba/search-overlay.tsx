'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    inputRef.current?.focus()
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    onClose()
    router.push(`/vijesti?q=${encodeURIComponent(query.trim())}`)
  }, [query, onClose, router])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '15vh',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 600, margin: '0 16px',
          background: 'var(--sba-bg-1)', border: '1px solid var(--sba-border)',
          borderRadius: 12, overflow: 'hidden',
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <svg
            style={{ flexShrink: 0, marginLeft: 16, color: 'var(--sba-text-3)' }}
            width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Pretraži vijesti..."
            style={{
              flex: 1, padding: '18px 16px', background: 'none',
              border: 'none', outline: 'none', fontSize: 16,
              color: 'var(--sba-text-0)', fontFamily: 'var(--sba-sans)',
            }}
          />
          <button
            type="button"
            onClick={onClose}
            style={{
              flexShrink: 0, marginRight: 12, padding: '8px 12px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--sba-text-3)', fontSize: 20, lineHeight: 1,
            }}
            aria-label="Zatvori"
          >
            &times;
          </button>
        </form>
        <div style={{ padding: '8px 16px 12px', borderTop: '1px solid var(--sba-border-subtle)' }}>
          <span style={{ fontFamily: 'var(--sba-mono)', fontSize: 11, color: 'var(--sba-text-3)' }}>
            Pritisni Enter za pretragu &middot; Esc za zatvaranje
          </span>
        </div>
      </div>
    </div>
  )
}
