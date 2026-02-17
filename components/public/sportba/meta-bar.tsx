'use client'

import { useState, useCallback, useEffect } from 'react'

interface MetaBarProps {
  author: string
  date: string
  readTime: number
  views: string
}

export function MetaBar({ author, date, readTime, views }: MetaBarProps) {
  const [speaking, setSpeaking] = useState(false)
  const [fontSize, setFontSize] = useState(18)

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
    }
  }, [])

  const toggleTTS = useCallback(() => {
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }
    const body = document.querySelector('.sba-article-body')
    if (!body) return
    const text = body.textContent || ''
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'hr-HR'
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
    setSpeaking(true)
  }, [speaking])

  const adjustFont = useCallback((delta: number) => {
    setFontSize((prev) => {
      const next = Math.max(14, Math.min(24, prev + delta))
      const body = document.querySelector(
        '.sba-article-body'
      ) as HTMLElement | null
      if (body) body.style.fontSize = `${next}px`
      return next
    })
  }, [])

  const share = useCallback((platform: string) => {
    const url = encodeURIComponent(window.location.href)
    const title = encodeURIComponent(document.title)
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${title}%20${url}`,
      viber: `viber://forward?text=${title}%20${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      x: `https://x.com/intent/tweet?text=${title}&url=${url}`,
    }
    if (platform === 'copy') {
      navigator.clipboard.writeText(window.location.href)
      return
    }
    window.open(urls[platform], '_blank', 'noopener')
  }, [])

  return (
    <div className="sba-meta-bar">
      <div className="sba-meta-info">
        <span className="sba-meta-author">{author}</span>
        <span className="sba-meta-sep">&middot;</span>
        <time className="sba-meta-date">{date}</time>
        <span className="sba-meta-sep">&middot;</span>
        <span className="sba-meta-read">{readTime} min čitanja</span>
        <span className="sba-meta-sep">&middot;</span>
        <span className="sba-meta-views">{views} pregleda</span>
      </div>
      <div className="sba-meta-actions">
        <button
          className={`sba-meta-btn${speaking ? ' sba-meta-btn--active' : ''}`}
          onClick={toggleTTS}
          aria-label={speaking ? 'Zaustavi čitanje' : 'Slušaj članak'}
          title={speaking ? 'Zaustavi čitanje' : 'Slušaj članak'}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            {speaking && (
              <>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </>
            )}
          </svg>
        </button>
        <div className="sba-meta-font-group">
          <button
            className="sba-meta-btn"
            onClick={() => adjustFont(-2)}
            aria-label="Smanji font"
          >
            A&minus;
          </button>
          <button
            className="sba-meta-btn"
            onClick={() => adjustFont(2)}
            aria-label="Povećaj font"
          >
            A+
          </button>
        </div>
        <div className="sba-meta-share-group">
          <button
            className="sba-meta-share-pill"
            onClick={() => share('whatsapp')}
          >
            WhatsApp
          </button>
          <button
            className="sba-meta-share-pill"
            onClick={() => share('viber')}
          >
            Viber
          </button>
          <button
            className="sba-meta-share-pill"
            onClick={() => share('facebook')}
          >
            Facebook
          </button>
          <button className="sba-meta-share-pill" onClick={() => share('x')}>
            X
          </button>
          <button
            className="sba-meta-share-pill"
            onClick={() => share('copy')}
          >
            Kopiraj
          </button>
        </div>
      </div>
    </div>
  )
}
