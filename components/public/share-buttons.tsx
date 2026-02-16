'use client'

import { useState } from 'react'

export function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)

  function getUrl() {
    return typeof window !== 'undefined' ? window.location.href : ''
  }

  function handleCopy() {
    navigator.clipboard.writeText(getUrl()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const encodedTitle = encodeURIComponent(title)

  return (
    <div className="pub-share">
      <span className="pub-share-label">Share</span>
      <a
        className="pub-share-btn"
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getUrl())}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Facebook"
        onClick={(e) => {
          e.preventDefault()
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getUrl())}`,
            'fb-share',
            'width=580,height=400'
          )
        }}
      >
        f
      </a>
      <a
        className="pub-share-btn"
        href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodeURIComponent(getUrl())}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Twitter"
        onClick={(e) => {
          e.preventDefault()
          window.open(
            `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodeURIComponent(getUrl())}`,
            'tw-share',
            'width=580,height=400'
          )
        }}
      >
        &#120143;
      </a>
      <a
        className="pub-share-btn"
        href={`https://wa.me/?text=${encodedTitle}%20${encodeURIComponent(getUrl())}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on WhatsApp"
      >
        &#8962;
      </a>
      <button
        className={`pub-share-btn ${copied ? 'copied' : ''}`}
        onClick={handleCopy}
        aria-label="Copy link"
      >
        {copied ? '✓' : '⎘'}
      </button>
    </div>
  )
}
