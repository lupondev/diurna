import Link from 'next/link'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'TodayFootballMatch'

export default function PublicNotFound() {
  return (
    <main style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      textAlign: 'center',
      fontFamily: 'var(--sba-sans, system-ui, sans-serif)',
      color: 'var(--sba-text-0, #18181b)',
      background: 'var(--sba-bg-0, #fff)',
    }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Stranica nije pronađena
      </h1>
      <p style={{ fontSize: 15, color: 'var(--sba-text-2, #71717a)', maxWidth: 400, marginBottom: 24 }}>
        Članak ili stranica ne postoji ili je uklonjena.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/"
          style={{
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 600,
            background: 'var(--sba-accent, #ff5722)',
            color: '#fff',
            borderRadius: 8,
            textDecoration: 'none',
          }}
        >
          Početna
        </Link>
        <Link
          href="/vijesti"
          style={{
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 600,
            border: '1px solid var(--sba-border, #e4e4e7)',
            color: 'var(--sba-text-0)',
            borderRadius: 8,
            textDecoration: 'none',
          }}
        >
          Vijesti
        </Link>
      </div>
      <p style={{ fontSize: 12, color: 'var(--sba-text-3, #a1a1aa)', marginTop: 32 }}>
        {SITE_NAME}
      </p>
    </main>
  )
}
