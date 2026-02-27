'use client'


import { useState, useEffect, useCallback } from 'react'

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
]

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

function isNew(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 7 * 24 * 60 * 60 * 1000
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
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = '' }
  }, [playingId, closeModal])

  return (
    <main style={{ background: 'var(--sba-bg-0)', minHeight: '100vh', fontFamily: 'var(--sba-sans)' }}>
      {/* Header */}
      <div className="vp-header">
        <div className="vp-title-row">
          <h1 className="vp-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--sba-accent, #e74c3c)" style={{ marginRight: 8 }}><polygon points="6,3 20,12 6,21" /></svg>
            Video
          </h1>
          <p className="vp-subtitle">Highlights, golovi i intervjui</p>
        </div>

        <div className="vp-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`vp-tab ${activeTab === t.key ? 'vp-tab--active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="vp-container">
        {loading && (
          <div className="vp-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="vp-skeleton">
                <div className="vp-skeleton-thumb" />
                <div style={{ padding: '10px 12px' }}>
                  <div className="vp-skeleton-line" style={{ width: '85%' }} />
                  <div className="vp-skeleton-line" style={{ width: '50%', marginTop: 6 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p style={{ color: 'var(--sba-muted, #666)', padding: '3rem 0', textAlign: 'center' }}>
            Trenutno nema dostupnog video sadržaja.
          </p>
        )}

        {!loading && filtered.length > 0 && (
          <div className="vp-grid">
            {filtered.map(v => (
              <button key={v.videoId} onClick={() => setPlayingId(v.videoId)} className="vp-card">
                <div className="vp-card-thumb">
                  <img
                    src={`https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`}
                    onError={e => { e.currentTarget.src = `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg` }}
                    alt={v.title}
                    loading="lazy"
                  />
                  {isNew(v.publishedAt) && <span className="vp-badge-new">NOVO</span>}
                  <div className="vp-card-play">
                    <div className="vp-card-play-btn">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><polygon points="6,3 20,12 6,21" /></svg>
                    </div>
                  </div>
                </div>
                <div className="vp-card-body">
                  <span className="vp-card-title">{v.title}</span>
                  <span className="vp-card-meta">{timeAgo(v.publishedAt)} &middot; {v.channelTitle}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal Player */}
      {playingId && (
        <div className="vp-modal-overlay" onClick={closeModal}>
          <div className="vp-modal" onClick={e => e.stopPropagation()}>
            <button onClick={closeModal} className="vp-modal-close" aria-label="Zatvori">&#10005;</button>
            <div className="vp-modal-frame">
              <iframe
                src={`https://www.youtube.com/embed/${playingId}?autoplay=1`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        </div>
      )}

      <style>{`
        .vp-header {
          max-width: 1280px; margin: 0 auto; padding: 28px 16px 0;
        }
        .vp-title-row { margin-bottom: 16px; }
        .vp-title {
          font-family: var(--sba-serif, serif); font-size: 26px; font-weight: 700;
          margin: 0 0 4px; display: flex; align-items: center;
          color: var(--sba-text-0, #fff);
        }
        .vp-subtitle {
          font-size: 14px; color: var(--sba-text-2, #888); margin: 0;
        }
        .vp-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
        .vp-tab {
          padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;
          border: 1px solid var(--sba-border, #333); background: transparent;
          color: var(--sba-text-1, #ccc); cursor: pointer; transition: all 0.15s;
        }
        .vp-tab--active {
          background: var(--sba-accent, #e74c3c); border-color: var(--sba-accent, #e74c3c);
          color: #fff;
        }

        .vp-container { max-width: 1280px; margin: 0 auto; padding: 20px 16px 40px; }

        .vp-grid {
          display: grid; gap: 16px;
          grid-template-columns: repeat(2, 1fr);
        }
        @media (min-width: 640px) { .vp-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 960px) { .vp-grid { grid-template-columns: repeat(4, 1fr); } }

        .vp-card {
          background: none; border: none; cursor: pointer; text-align: left;
          display: flex; flex-direction: column; gap: 8px;
        }
        .vp-card-thumb {
          position: relative; border-radius: 10px; overflow: hidden; aspect-ratio: 16/9;
        }
        .vp-card-thumb img {
          width: 100%; height: 100%; object-fit: cover; display: block;
          transition: transform 0.3s ease;
        }
        .vp-card:hover .vp-card-thumb img { transform: scale(1.05); }

        .vp-badge-new {
          position: absolute; top: 8px; left: 8px; z-index: 1;
          background: #22c55e; color: #fff; font-size: 9px; font-weight: 700;
          padding: 2px 7px; border-radius: 3px; letter-spacing: 0.05em;
          font-family: var(--sba-mono, monospace);
        }

        .vp-card-play {
          position: absolute; inset: 0; display: flex; align-items: center;
          justify-content: center; opacity: 0; transition: opacity 0.2s;
        }
        .vp-card-play::before {
          content: ''; position: absolute; inset: 0;
          background: rgba(0,0,0,0.35);
        }
        .vp-card-play-btn {
          position: relative; z-index: 1; width: 48px; height: 48px;
          border-radius: 50%; background: rgba(0,0,0,0.6); display: flex;
          align-items: center; justify-content: center;
          backdrop-filter: blur(4px); border: 2px solid rgba(255,255,255,0.3);
          transition: transform 0.2s;
        }
        .vp-card:hover .vp-card-play { opacity: 1; }
        .vp-card:hover .vp-card-play-btn { transform: scale(1.1); }

        .vp-card-body { display: flex; flex-direction: column; gap: 3px; padding: 0 2px; }
        .vp-card-title {
          font-family: var(--sba-serif, serif); font-size: 14px; font-weight: 600;
          line-height: 1.35; color: var(--sba-text-0, #fff);
          display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
        }
        .vp-card-meta { font-size: 12px; color: var(--sba-text-2, #888); }

        /* Skeleton */
        .vp-skeleton {
          border-radius: 10px; overflow: hidden;
          background: var(--sba-bg-1, #1a1a2e);
        }
        .vp-skeleton-thumb {
          aspect-ratio: 16/9;
          background: linear-gradient(90deg, var(--sba-bg-1, #1a1a2e) 25%, var(--sba-bg-0, #111) 50%, var(--sba-bg-1, #1a1a2e) 75%);
          background-size: 200% 100%; animation: shimmer 1.5s infinite;
        }
        .vp-skeleton-line {
          height: 12px; border-radius: 4px;
          background: var(--sba-bg-0, #111); opacity: 0.5;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Modal */
        .vp-modal-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.92); display: flex;
          align-items: center; justify-content: center; padding: 16px;
        }
        .vp-modal { position: relative; width: 100%; max-width: 960px; }
        .vp-modal-close {
          position: absolute; top: -44px; right: 0; background: none;
          border: none; color: #fff; font-size: 28px; cursor: pointer;
          padding: 4px 8px; line-height: 1; opacity: 0.6; transition: opacity 0.2s;
        }
        .vp-modal-close:hover { opacity: 1; }
        .vp-modal-frame {
          position: relative; padding-bottom: 56.25%;
          border-radius: 12px; overflow: hidden; background: #000;
        }
        .vp-modal-frame iframe {
          position: absolute; inset: 0; width: 100%; height: 100%; border: none;
        }
      `}</style>
    </main>
  )
}
