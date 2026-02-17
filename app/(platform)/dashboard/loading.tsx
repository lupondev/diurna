export default function DashboardLoading() {
  return (
    <div style={{ padding: '28px 32px 48px', maxWidth: 1200, margin: '0 auto' }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skel {
          background: linear-gradient(90deg, var(--g100) 25%, var(--g50) 50%, var(--g100) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: var(--r);
        }
      `}</style>

      {/* Header skeleton */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div className="skel" style={{ width: 260, height: 28, marginBottom: 8 }} />
          <div className="skel" style={{ width: 200, height: 16 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="skel" style={{ width: 160, height: 16 }} />
          <div className="skel" style={{ width: 120, height: 36, borderRadius: 'var(--rm)' }} />
        </div>
      </div>

      {/* Stats row skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              background: 'var(--wh)',
              border: '1px solid var(--brd)',
              borderRadius: 'var(--rl)',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 14,
            }}
          >
            <div className="skel" style={{ width: 40, height: 40, borderRadius: 'var(--rm)', flexShrink: 0 }} />
            <div>
              <div className="skel" style={{ width: 60, height: 28, marginBottom: 6 }} />
              <div className="skel" style={{ width: 100, height: 14 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Two-column skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Recent articles */}
          <div style={{ background: 'var(--wh)', border: '1px solid var(--brd)', borderRadius: 'var(--rl)', padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="skel" style={{ width: 120, height: 16 }} />
              <div className="skel" style={{ width: 60, height: 14 }} />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--g100)' }}>
                <div style={{ flex: 1 }}>
                  <div className="skel" style={{ width: '80%', height: 16, marginBottom: 6 }} />
                  <div className="skel" style={{ width: 120, height: 12 }} />
                </div>
                <div className="skel" style={{ width: 60, height: 22, borderRadius: 6 }} />
              </div>
            ))}
          </div>
          {/* Newsroom intelligence */}
          <div style={{ background: 'var(--wh)', border: '1px solid var(--brd)', borderRadius: 'var(--rl)', padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="skel" style={{ width: 160, height: 16 }} />
              <div className="skel" style={{ width: 90, height: 14 }} />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < 3 ? '1px solid var(--g100)' : 'none' }}>
                <div className="skel" style={{ width: 38, height: 38, borderRadius: 'var(--rm)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skel" style={{ width: '70%', height: 14, marginBottom: 6 }} />
                  <div className="skel" style={{ width: 60, height: 12 }} />
                </div>
                <div className="skel" style={{ width: 50, height: 26, borderRadius: 'var(--r)' }} />
              </div>
            ))}
          </div>
        </div>
        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ background: 'var(--wh)', border: '1px solid var(--brd)', borderRadius: 'var(--rl)', padding: '20px 22px' }}>
            <div className="skel" style={{ width: 100, height: 16, marginBottom: 14 }} />
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skel" style={{ width: '100%', height: 36, marginBottom: 6, borderRadius: 'var(--rm)' }} />
            ))}
          </div>
          <div style={{ background: 'var(--wh)', border: '1px solid var(--brd)', borderRadius: 'var(--rl)', padding: '20px 22px' }}>
            <div className="skel" style={{ width: 120, height: 16, marginBottom: 14 }} />
            <div className="skel" style={{ width: '100%', height: 60, borderRadius: 'var(--rm)' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
