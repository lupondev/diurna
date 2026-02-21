'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

type Club = { id: number; name: string; logo: string; rank: number }

const LEAGUES = [
  { id: 39, label: 'PL', name: 'Premier League' },
  { id: 140, label: 'La Liga', name: 'La Liga' },
  { id: 135, label: 'Serie A', name: 'Serie A' },
  { id: 78, label: 'BL', name: 'Bundesliga' },
]

function Skeleton() {
  return (
    <div className="cls-scroll">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="cls-club cls-skeleton">
          <div className="cls-logo-ph" />
          <div className="cls-name-ph" />
        </div>
      ))}
    </div>
  )
}

export function ClubLogoStrip() {
  const [activeLeague, setActiveLeague] = useState(39)
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/clubs?league=${activeLeague}`)
      .then((r) => r.json() as Promise<{ clubs?: Club[] }>)
      .then((data) => {
        setClubs(data.clubs || [])
        setLoading(false)
      })
      .catch(() => {
        setClubs([])
        setLoading(false)
      })
  }, [activeLeague])

  // Drag-to-scroll
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return
    isDragging.current = true
    startX.current = e.pageX - scrollRef.current.offsetLeft
    scrollLeft.current = scrollRef.current.scrollLeft
    scrollRef.current.style.cursor = 'grabbing'
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollRef.current.offsetLeft
    scrollRef.current.scrollLeft = scrollLeft.current - (x - startX.current)
  }, [])

  const onMouseUp = useCallback(() => {
    isDragging.current = false
    if (scrollRef.current) scrollRef.current.style.cursor = 'grab'
  }, [])

  if (!loading && clubs.length === 0) return null

  return (
    <div className="cls-wrap">
      <div className="cls-tabs">
        {LEAGUES.map((l) => (
          <button
            key={l.id}
            className={`cls-tab${activeLeague === l.id ? ' cls-tab--active' : ''}`}
            onClick={() => setActiveLeague(l.id)}
          >
            {l.label}
          </button>
        ))}
      </div>
      {loading ? (
        <Skeleton />
      ) : (
        <div
          ref={scrollRef}
          className="cls-scroll"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {clubs.map((c) => (
            <Link
              key={c.id}
              href={`/vijesti?team=${encodeURIComponent(c.name)}`}
              className="cls-club"
              draggable={false}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.logo}
                alt={c.name}
                className="cls-logo"
                width={40}
                height={40}
                draggable={false}
              />
              <span className="cls-name">{c.name}</span>
            </Link>
          ))}
        </div>
      )}

      <style>{`
        .cls-wrap {
          background: var(--sba-bg-1, #0e1015);
          border-bottom: 1px solid var(--sba-border, #262a38);
          padding: 0;
        }
        .cls-tabs {
          display: flex;
          gap: 0;
          border-bottom: 1px solid var(--sba-border-subtle, #1e2130);
          padding: 0 16px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .cls-tab {
          font-family: var(--sba-mono, monospace);
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--sba-text-3, #5c6078);
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          padding: 10px 16px;
          cursor: pointer;
          transition: color 0.15s, border-color 0.15s;
        }
        .cls-tab:hover { color: var(--sba-text-1, #c8cbd8); }
        .cls-tab--active {
          color: var(--sba-accent, #ff5722);
          border-bottom-color: var(--sba-accent, #ff5722);
        }
        .cls-scroll {
          display: flex;
          gap: 4px;
          overflow-x: auto;
          -ms-overflow-style: none;
          scrollbar-width: none;
          padding: 12px 16px;
          max-width: 1200px;
          margin: 0 auto;
          cursor: grab;
          user-select: none;
        }
        .cls-scroll::-webkit-scrollbar { display: none; }
        .cls-club {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          min-width: 72px;
          padding: 6px 8px;
          border-radius: 8px;
          text-decoration: none;
          flex-shrink: 0;
          transition: background 0.15s;
        }
        .cls-club:hover { background: var(--sba-bg-3, #1a1d27); }
        .cls-logo {
          width: 40px;
          height: 40px;
          object-fit: contain;
          border-radius: 4px;
        }
        .cls-name {
          font-family: var(--sba-mono, monospace);
          font-size: 9px;
          font-weight: 500;
          color: var(--sba-text-2, #8b8fa3);
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 68px;
        }
        .cls-skeleton .cls-logo-ph {
          width: 40px;
          height: 40px;
          border-radius: 4px;
          background: var(--sba-bg-3, #1a1d27);
          animation: cls-pulse 1.5s ease-in-out infinite;
        }
        .cls-skeleton .cls-name-ph {
          width: 48px;
          height: 8px;
          border-radius: 3px;
          background: var(--sba-bg-3, #1a1d27);
          animation: cls-pulse 1.5s ease-in-out infinite;
        }
        @keyframes cls-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
