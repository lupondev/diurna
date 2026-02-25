'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function PlatformError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#18181B' }}>Nešto nije u redu</h2>
      <p style={{ fontSize: 14, color: '#71717A', marginBottom: 24, lineHeight: 1.5 }}>
        Došlo je do greške. Pokušajte ponovo ili se vratite na početnu stranicu.
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
          href="/dashboard"
          style={{
            padding: '10px 24px',
            fontSize: 13,
            fontWeight: 700,
            borderRadius: 8,
            background: '#F4F4F5',
            color: '#18181B',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Početna
        </a>
      </div>
      {error.digest && (
        <p style={{ fontSize: 10, color: '#A1A1AA', marginTop: 24, fontFamily: 'monospace' }}>
          Error ID: {error.digest}
        </p>
      )}
    </div>
  )
}
