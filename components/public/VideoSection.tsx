'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Video {
  videoId: string
  title: string
  thumbnail: string
  publishedAt: string
  channelTitle: string
  channel: string
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

export function VideoSection() {
  const [videos, setVideos] = useState<Video[]>([])
  const [playingId, setPlayingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/videos?channel=all')
      .then(r => r.json() as Promise<{ videos?: Video[] }>)
      .then(data => setVideos((data.videos || []).slice(0, 3)))
      .catch(() => {})
  }, [])

  const closeModal = useCallback(() => setPlayingId(null), [])

  useEffect(() => {
    if (!playingId) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [playingId, closeModal])

  if (videos.length === 0) return null

  return (
    <>
      <section>
        <div className="sba-section-head">
          <h2 className="sba-section-title">Video</h2>
          <Link href="/video" className="sba-section-more">Pogledaj sve &rarr;</Link>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }} className="video-section-grid">
          {videos.map(v => (
            <button
              key={v.videoId}
              onClick={() => setPlayingId(v.videoId)}
              style={{
                background: 'var(--sba-bg-1)', border: '1px solid var(--sba-border)',
                borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                textAlign: 'left', transition: 'border-color 0.2s, transform 0.2s',
                display: 'flex', flexDirection: 'column',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sba-accent)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--sba-border)'; e.currentTarget.style.transform = 'none' }}
            >
              <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden' }}>
                <img
                  src={v.thumbnail}
                  alt={v.title}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,0,0,0.2)',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.9)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#111"><polygon points="6,3 20,12 6,21" /></svg>
                  </div>
                </div>
              </div>
              <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{
                  fontFamily: 'var(--sba-serif)', fontSize: 13, fontWeight: 600, lineHeight: 1.35,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>{v.title}</span>
                <span style={{ fontSize: 11, color: 'var(--sba-text-2)' }}>{timeAgo(v.publishedAt)} &middot; {v.channelTitle}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

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
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 900 }}>
            <button
              onClick={closeModal}
              style={{
                position: 'absolute', top: -40, right: 0,
                background: 'none', border: 'none', color: '#fff', fontSize: 28,
                cursor: 'pointer', padding: '4px 8px', lineHeight: 1,
              }}
              aria-label="Zatvori"
            >&#10005;</button>
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
        @media (max-width: 768px) {
          .video-section-grid {
            grid-template-columns: 1fr !important;
            overflow-x: auto;
            display: flex !important;
            gap: 12px;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 4px;
          }
          .video-section-grid > button {
            min-width: 260px;
            scroll-snap-align: start;
            flex-shrink: 0;
          }
        }
      `}</style>
    </>
  )
}
