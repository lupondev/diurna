'use client'

import { useEffect } from 'react'

export function PreloadHeroImage({ src }: { src: string }) {
  useEffect(() => {
    if (!src?.trim() || typeof document === 'undefined') return
    const href = src.startsWith('http') ? src : new URL(src, window.location.origin).href
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = href
    link.setAttribute('fetchpriority', 'high')
    document.head.appendChild(link)
    return () => { document.head.removeChild(link) }
  }, [src])
  return null
}
