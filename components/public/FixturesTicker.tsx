'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

type TickerFixture = {
  id: number
  homeTeam: string
  awayTeam: string
  homeLogo: string
  awayLogo: string
  homeScore: number | null
  awayScore: number | null
  time: string
  elapsed: number | null
  status: 'live' | 'ft' | 'scheduled'
  league: string
}

export function FixturesTicker() {
  const [fixtures, setFixtures] = useState<TickerFixture[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<number | null>(null)
  const pausedRef = useRef(false)

  useEffect(() => {
    fetch('/api/fixtures/ticker')
      .then((r) => r.json() as Promise<{ fixtures?: TickerFixture[] }>)
      .then((data) => {
        setFixtures(data.fixtures || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Auto-scroll animation
  const animate = useCallback(() => {
    if (scrollRef.current && !pausedRef.current) {
      scrollRef.current.scrollLeft += 0.5
      // Reset to start when near the end
      if (
        scrollRef.current.scrollLeft >=
        scrollRef.current.scrollWidth - scrollRef.current.clientWidth - 1
      ) {
        scrollRef.current.scrollLeft = 0
      }
    }
    animRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    if (fixtures.length > 3) {
      animRef.current = requestAnimationFrame(animate)
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [fixtures, animate])

  if (loading || fixtures.length === 0) return null

  return (
    <div
      className="ftk-wrap"
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
    >
      <div ref={scrollRef} className="ftk-scroll">
        {fixtures.map((f) => (
          <Link
            key={f.id}
            href="/utakmice"
            className="ftk-card"
          >
            {f.status === 'live' && <span className="ftk-live-dot" />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.homeLogo} alt="" className="ftk-team-logo" width={16} height={16} />
            <span className="ftk-team">{f.homeTeam}</span>
            {f.status === 'scheduled' ? (
              <span className="ftk-time">{f.time}</span>
            ) : (
              <span className={`ftk-score${f.status === 'live' ? ' ftk-score--live' : ' ftk-score--ft'}`}>
                {f.homeScore} - {f.awayScore}
              </span>
            )}
            <span className="ftk-team">{f.awayTeam}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.awayLogo} alt="" className="ftk-team-logo" width={16} height={16} />
            {f.status === 'live' && f.elapsed && (
              <span className="ftk-elapsed">{f.elapsed}&apos;</span>
            )}
          </Link>
        ))}
      </div>

      <style>{`
        .ftk-wrap {
          background: var(--sba-bg-0, #08090c);
          border-bottom: 1px solid var(--sba-border-subtle, #1e2130);
          height: 48px;
          overflow: hidden;
        }
        .ftk-scroll {
          display: flex;
          gap: 6px;
          align-items: center;
          height: 48px;
          overflow-x: auto;
          -ms-overflow-style: none;
          scrollbar-width: none;
          padding: 0 16px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .ftk-scroll::-webkit-scrollbar { display: none; }
        .ftk-card {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--sba-bg-2, #14161d);
          border: 1px solid var(--sba-border-subtle, #1e2130);
          border-radius: 6px;
          padding: 6px 10px;
          text-decoration: none;
          white-space: nowrap;
          flex-shrink: 0;
          transition: background 0.15s;
        }
        .ftk-card:hover { background: var(--sba-bg-3, #1a1d27); }
        .ftk-team-logo {
          width: 16px;
          height: 16px;
          object-fit: contain;
          flex-shrink: 0;
        }
        .ftk-team {
          font-family: var(--sba-sans, system-ui);
          font-size: 11px;
          font-weight: 600;
          color: var(--sba-text-1, #c8cbd8);
          max-width: 80px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ftk-time {
          font-family: var(--sba-mono, monospace);
          font-size: 11px;
          font-weight: 600;
          color: var(--sba-text-3, #5c6078);
          padding: 0 4px;
        }
        .ftk-score {
          font-family: var(--sba-mono, monospace);
          font-size: 12px;
          font-weight: 700;
          padding: 0 4px;
        }
        .ftk-score--live { color: var(--sba-live, #00e676); }
        .ftk-score--ft { color: var(--sba-text-0, #f2f3f7); }
        .ftk-elapsed {
          font-family: var(--sba-mono, monospace);
          font-size: 9px;
          font-weight: 600;
          color: var(--sba-live, #00e676);
          background: rgba(0, 230, 118, 0.1);
          padding: 1px 5px;
          border-radius: 3px;
        }
        .ftk-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--sba-live, #00e676);
          flex-shrink: 0;
          animation: ftk-pulse 1.5s ease-in-out infinite;
        }
        @keyframes ftk-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.3); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ftk-live-dot { animation: none; }
        }
      `}</style>
    </div>
  )
}
