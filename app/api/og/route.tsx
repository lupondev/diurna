import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const title = searchParams.get('title') || 'Diurna News'
  const category = searchParams.get('category') || 'News'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '60px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Category badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              background: '#00D4AA',
              color: '#0f172a',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '18px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {category}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: title.length > 60 ? 42 : 52,
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.2,
            marginBottom: '40px',
            maxWidth: '900px',
          }}
        >
          {title}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #00D4AA, #00A888)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 800,
                color: '#fff',
              }}
            >
              D
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#94a3b8' }}>
              Diurna
              <span style={{ color: '#00D4AA' }}>.</span>
            </div>
          </div>
          <div style={{ fontSize: '16px', color: '#64748b' }}>
            diurna.vercel.app
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
