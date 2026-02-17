'use client'

import { useState, useEffect, useCallback } from 'react'

export function ReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const el = document.querySelector('.sba-article-body') as HTMLElement | null
      if (!el) return
      const rect = el.getBoundingClientRect()
      const total = el.offsetHeight
      const visible = Math.min(Math.max(-rect.top, 0), total)
      setProgress(Math.min((visible / total) * 100, 100))
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className="sba-progress-bar"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="sba-progress-fill" style={{ width: `${progress}%` }} />
    </div>
  )
}

export function ScrollDepthTracker() {
  useEffect(() => {
    const markers = document.querySelectorAll('[data-depth]')
    if (!markers.length) return

    const seen = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const depth = (entry.target as HTMLElement).dataset.depth
            if (depth && !seen.has(depth)) {
              seen.add(depth)
            }
          }
        })
      },
      { threshold: 0 }
    )

    markers.forEach((m) => observer.observe(m))
    return () => observer.disconnect()
  }, [])

  return null
}

export function FloatingShareBar() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const body = document.querySelector(
        '.sba-article-body'
      ) as HTMLElement | null
      if (!body) return
      const rect = body.getBoundingClientRect()
      const inBody = rect.top < window.innerHeight && rect.bottom > 0
      setVisible(inBody)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const share = useCallback((platform: string) => {
    const url = encodeURIComponent(window.location.href)
    const title = encodeURIComponent(document.title)
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${title}%20${url}`,
      viber: `viber://forward?text=${title}%20${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    }
    if (platform === 'copy') {
      navigator.clipboard.writeText(window.location.href)
      return
    }
    window.open(urls[platform], '_blank', 'noopener')
  }, [])

  return (
    <div
      className={`sba-floating-share${visible ? ' sba-floating-share--visible' : ''}`}
    >
      <button
        className="sba-floating-share-btn"
        onClick={() => share('whatsapp')}
        aria-label="WhatsApp"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </button>
      <button
        className="sba-floating-share-btn"
        onClick={() => share('viber')}
        aria-label="Viber"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.4 0c-1.9.03-6.1.34-8.4 2.47C1.3 4.18.5 6.77.4 9.98c-.1 3.22-.3 9.25 5.7 10.84 0 .68 0 1.85.43 2.8.52 1.09 1.32 1.38 1.63 1.38.23 0 .37-.1.42-.14.43-.32 2.44-2.04 3.38-2.93.67-.01 1.34-.04 2-.12 2.66-.25 4.7-1.2 6.07-2.81 2.08-2.46 1.97-5.58 1.88-6.59-.09-1.01-.46-3.65-2.08-5.49C18.21 5.2 15.56 3.62 12.09 3.39c-.28-.02-1.16-.08-2.1-.08-.56 0-1.12.02-1.57.05.45-.03 1.01-.05 1.57-.05.94 0 1.82.06 2.1.08 3.47.23 6.12 1.81 7.72 3.52 1.62 1.84 1.99 4.48 2.08 5.49.09 1.01.2 4.13-1.88 6.59-1.37 1.61-3.41 2.56-6.07 2.81-.66.08-1.33.11-2 .12-.94.89-2.95 2.61-3.38 2.93-.05.04-.19.14-.42.14-.31 0-1.11-.29-1.63-1.38-.43-.95-.43-2.12-.43-2.8C-.7 19.23-.5 13.2-.38 9.98.52 6.77 1.3 4.18 3 2.47 5.33.34 9.5.03 11.4 0z" />
        </svg>
      </button>
      <button
        className="sba-floating-share-btn"
        onClick={() => share('facebook')}
        aria-label="Facebook"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </button>
      <button
        className="sba-floating-share-btn"
        onClick={() => share('copy')}
        aria-label="Kopiraj link"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </button>
    </div>
  )
}

export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 600)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      className={`sba-back-to-top${visible ? ' sba-back-to-top--visible' : ''}`}
      onClick={() => window.scrollTo({ top: 0 })}
      aria-label="Nazad na vrh"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  )
}
