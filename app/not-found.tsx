import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F8F9FB',
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      textAlign: 'center',
      padding: '24px',
    }}>
      <div style={{
        fontSize: 28,
        fontWeight: 900,
        color: '#18181B',
        letterSpacing: '-0.02em',
        marginBottom: 4,
      }}>
        Diurna<span style={{ color: '#00D4AA' }}>.</span>
      </div>

      <div style={{
        fontSize: 120,
        fontWeight: 900,
        lineHeight: 1,
        background: 'linear-gradient(135deg, #00D4AA, #5B5FFF)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginTop: 32,
      }}>
        404
      </div>

      <h1 style={{
        fontSize: 24,
        fontWeight: 800,
        color: '#18181B',
        marginTop: 16,
      }}>
        Page not found
      </h1>

      <p style={{
        fontSize: 15,
        color: '#71717A',
        maxWidth: 400,
        marginTop: 8,
        lineHeight: 1.6,
      }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Let&apos;s get you back on track.
      </p>

      <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 700,
            background: '#00D4AA',
            color: 'white',
            borderRadius: 10,
            textDecoration: 'none',
            transition: 'all .15s',
          }}
        >
          Go to Dashboard
        </Link>
        <Link
          href="/newsroom"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 700,
            background: 'white',
            color: '#3F3F46',
            border: '1px solid #E4E4E7',
            borderRadius: 10,
            textDecoration: 'none',
            transition: 'all .15s',
          }}
        >
          Newsroom
        </Link>
      </div>

      <p style={{
        fontSize: 11,
        color: '#A1A1AA',
        marginTop: 48,
      }}>
        Diurna v1.0 &bull; Powered by Lupon Media SSP &bull; &copy; 2026
      </p>
    </div>
  )
}
