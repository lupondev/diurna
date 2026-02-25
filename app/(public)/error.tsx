'use client'

import { useEffect } from 'react'

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Public page error:', error)
  }, [error])

  return (
    <div style={{ padding: '80px 24px', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚽</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Stranica nije dostupna</h2>
      <p style={{ fontSize: 14, color: '#71717A', marginBottom: 24 }}>
        Pokušajte ponovo ili se vratite na početnu.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{
            padding: '10px 24px',
            fontSize: 13,
            fontWeight: 700,
            border: 'none',
            borderRadius: 8,
            background: '#00D4AA',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Pokušaj ponovo
        </button>
        <a
          href="/"
          style={{
            padding: '10px 24px',
            fontSize: 13,
            fontWeight: 700,
            borderRadius: 8,
            background: '#F4F4F5',
            color: '#18181B',
            textDecoration: 'none',
          }}
        >
          Početna
        </a>
      </div>
    </div>
  )
}
