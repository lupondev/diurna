'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import '../category.css'

interface Video {
  videoId: string
  title: string
  thumbnail: string
  publishedAt: string
  channelTitle: string
  channel: string
}

const TABS = [
  { key: 'all', label: 'Sve' },
  { key: 'pl', label: 'Premier League' },
  { key: 'ucl', label: 'Champions League' },
]

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

export default function VideoPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [playingId, setPlayingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/videos?channel=all')
      .then(r => r.json() as Promise<{ videos?: Video[] }>)
      .then(data => setVideos(data.videos || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = activeTab === 'all' ? videos : videos.filter(v => v.channel === activeTab)

  const closeModal = useCallback(() => setPlayingId(null), [])

  useEffect(() => {
    if (!playingId) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [playingId, closeModal])

  return (
    <main className="sba-cat">
      <div className="sba-cat-header">
        <h1 className="sba-cat-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>&#9654;</span> Video
        </h1>
        <p className="sba-cat-desc">Golovi, highlighti, analize i intervjui</p>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: activeTab === t.key ? '1px solid var(--sba-accent)' : '1px solid var(--sba-border)',
                background: activeTab === t.key ? 'var(--sba-accent)' : 'var(--sba-bg-1)',
                color: activeTab === t.key ? '#fff' : 'var(--sba-text-1)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sba-cat-layout">
        <div className="sba-cat-main">
          {loading && (
            <div className="sba-cat-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ borderRadius: 10, overflow: 'hidden', background: 'var(--sba-bg-1)', border: '1px solid var(--sba-border)' }}>
                  <div style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg,#1a1a2e,#0a0a14)', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ height: 14, background: 'var(--sba-bg-2, #1e293b)', borderRadius: 4, width: '80%', marginBottom: 8 }} />
                    <div style={{ height: 10, background: 'var(--sba-bg-2, #1e293b)', borderRadius: 4, width: '40%' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <p style={{ color: 'var(--sba-muted)', padding: '2rem 0' }}>Trenutno nema dostupnog video sadržaja.</p>
          )}

          {!loading && filtered.length > 0 && (
            <div className="sba-cat-grid">
              {filtered.map(v => (
                <button
                  key={v.videoId}
                  onClick={() => setPlayingId(v.videoId)}
                  className="sba-cat-card"
                  style={{ textAlign: 'left', cursor: 'pointer' }}
                >
                  <div className="sba-cat-card-thumb" style={{ position: 'relative' }}>
                    <img
                      src={v.thumbnail}
                      alt={v.title}
                      loading="lazy"
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {/* Play button overlay */}
                    <div style={{
                      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(0,0,0,0.25)', transition: 'background 0.2s',
                    }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.9)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.3)', transition: 'transform 0.2s',
                      }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#111">
                          <polygon points="6,3 20,12 6,21" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="sba-cat-card-body">
                    <span className="sba-cat-card-title" style={{ WebkitLineClamp: 2 }}>{v.title}</span>
                    <span className="sba-cat-card-meta">{timeAgo(v.publishedAt)} &middot; {v.channelTitle}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="sba-cat-rail">
          <div style={{ padding: 16, background: 'var(--sba-bg-1)', borderRadius: 10, border: '1px solid var(--sba-border)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Kanali</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href="https://youtube.com/@premierleague" target="_blank" rel="noopener" style={{ fontSize: 13, color: 'var(--sba-text-1)', textDecoration: 'none' }}>
                Premier League
              </Link>
              <Link href="https://youtube.com/@ChampionsLeague" target="_blank" rel="noopener" style={{ fontSize: 13, color: 'var(--sba-text-1)', textDecoration: 'none' }}>
                UEFA Champions League
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Modal Player */}
      {playingId && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ position: 'relative', width: '100%', maxWidth: 900 }}
          >
            <button
              onClick={closeModal}
              style={{
                position: 'absolute', top: -40, right: 0,
                background: 'none', border: 'none', color: '#fff', fontSize: 28,
                cursor: 'pointer', padding: '4px 8px', lineHeight: 1,
              }}
              aria-label="Zatvori"
            >
              &#10005;
            </button>
            <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 12, overflow: 'hidden' }}>
              <iframe
                src={`https://www.youtube.com/embed/${playingId}?autoplay=1`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                loading="lazy"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </main>
  )
}
