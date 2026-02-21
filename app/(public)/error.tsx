'use client'

export default function PublicError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: 16,
      color: 'var(--sba-text-2, #999)',
      fontFamily: 'var(--sba-mono, monospace)',
    }}>
      <p style={{ fontSize: 14 }}>Došlo je do greške</p>
      <button
        onClick={reset}
        style={{
          padding: '8px 20px',
          fontSize: 13,
          background: 'var(--sba-accent, #f97316)',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        Pokušaj ponovo
      </button>
    </div>
  )
}
