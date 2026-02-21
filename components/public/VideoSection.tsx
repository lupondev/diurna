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

function isNew(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 7 * 24 * 60 * 60 * 1000
}

export function VideoSection() {
  const [videos, setVideos] = useState<Video[]>([])
  const [playingId, setPlayingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/videos?channel=all')
      .then(r => r.json() as Promise<{ videos?: Video[] }>)
      .then(data => setVideos((data.videos || []).slice(0, 6)))
      .catch(() => {})
  }, [])

  const closeModal = useCallback(() => setPlayingId(null), [])

  useEffect(() => {
    if (!playingId) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = '' }
  }, [playingId, closeModal])

  if (videos.length === 0) return null

  return (
    <>
      <section>
        <div className="sba-section-head">
          <h2 className="sba-section-title">Video</h2>
          <Link href="/video" className="sba-section-more">Pogledaj sve &rarr;</Link>
        </div>

        <div className="vid-scroll">
          {videos.map(v => (
            <button
              key={v.videoId}
              onClick={() => setPlayingId(v.videoId)}
              className="vid-card"
            >
              <div className="vid-thumb">
                <img
                  src={`https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`}
                  onError={e => { e.currentTarget.src = `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg` }}
                  alt={v.title}
                  loading="lazy"
                />
                {isNew(v.publishedAt) && <span className="vid-badge-new">NOVO</span>}
                <div className="vid-play">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><polygon points="6,3 20,12 6,21" /></svg>
                </div>
              </div>
              <span className="vid-title">{v.title}</span>
            </button>
          ))}
        </div>
      </section>

      {playingId && (
        <div className="vid-modal-overlay" onClick={closeModal}>
          <div className="vid-modal" onClick={e => e.stopPropagation()}>
            <button onClick={closeModal} className="vid-modal-close" aria-label="Zatvori">&#10005;</button>
            <div className="vid-modal-frame">
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
        .vid-scroll {
          display: flex; gap: 12px; overflow-x: auto;
          scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;
          padding-bottom: 4px; scrollbar-width: none;
        }
        .vid-scroll::-webkit-scrollbar { display: none; }

        .vid-card {
          flex-shrink: 0; width: 220px; background: none; border: none;
          cursor: pointer; text-align: left; scroll-snap-align: start;
          display: flex; flex-direction: column; gap: 8px;
        }
        @media (min-width: 768px) { .vid-card { width: 240px; } }

        .vid-thumb {
          position: relative; border-radius: 10px; overflow: hidden;
          aspect-ratio: 16/9;
        }
        .vid-thumb img {
          width: 100%; height: 100%; object-fit: cover; display: block;
          transition: transform 0.3s ease;
        }
        .vid-card:hover .vid-thumb img { transform: scale(1.05); }

        .vid-badge-new {
          position: absolute; top: 8px; left: 8px; z-index: 1;
          background: #22c55e; color: #fff; font-size: 9px; font-weight: 700;
          padding: 2px 7px; border-radius: 3px; letter-spacing: 0.05em;
          font-family: var(--sba-mono, monospace);
        }

        .vid-play {
          position: absolute; inset: 0; display: flex; align-items: center;
          justify-content: center; opacity: 0; transition: opacity 0.2s;
        }
        .vid-play::before {
          content: ''; position: absolute; inset: 0;
          background: rgba(0,0,0,0.35);
        }
        .vid-play svg { position: relative; z-index: 1; filter: drop-shadow(0 1px 4px rgba(0,0,0,0.5)); }
        .vid-card:hover .vid-play { opacity: 1; }

        .vid-title {
          font-family: var(--sba-serif, serif); font-size: 13px; font-weight: 600;
          line-height: 1.35; color: var(--sba-text-0, #fff);
          display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
        }

        .vid-modal-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.9); display: flex;
          align-items: center; justify-content: center; padding: 16px;
        }
        .vid-modal { position: relative; width: 100%; max-width: 900px; }
        .vid-modal-close {
          position: absolute; top: -40px; right: 0; background: none;
          border: none; color: #fff; font-size: 28px; cursor: pointer;
          padding: 4px 8px; line-height: 1; opacity: 0.7; transition: opacity 0.2s;
        }
        .vid-modal-close:hover { opacity: 1; }
        .vid-modal-frame {
          position: relative; padding-bottom: 56.25%;
          border-radius: 12px; overflow: hidden; background: #000;
        }
        .vid-modal-frame iframe {
          position: absolute; inset: 0; width: 100%; height: 100%; border: none;
        }
      `}</style>
    </>
  )
}
