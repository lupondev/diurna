'use client'

export default function PlatformError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h2>
      <p style={{ color: 'var(--g400)', marginBottom: 16, fontSize: 14 }}>{error.message}</p>
      <button
        onClick={reset}
        style={{
          padding: '8px 20px',
          background: 'var(--primary)',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  )
}
