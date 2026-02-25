'use client'

import { useState, useEffect, useRef } from 'react'

interface MediaItem {
  id: string
  url: string
  filename: string
  alt?: string | null
}

interface UnsplashImage {
  id: string
  small: string
  regular: string
  alt: string
  author: string
  authorUrl: string
}

interface ImageSearchResponse {
  results: UnsplashImage[]
  totalPages: number
}

type TabId = 'media' | 'unsplash' | 'url'

interface FeaturedImagePickerProps {
  value: string | null
  onChange: (url: string | null) => void
}

export function FeaturedImagePicker({ value, onChange }: FeaturedImagePickerProps) {
  const [showModal, setShowModal] = useState(false)
  const [tab, setTab] = useState<TabId>('media')
  const [media, setMedia] = useState<MediaItem[]>([])
  const [mediaLoading, setMediaLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UnsplashImage[]>([])
  const [searching, setSearching] = useState(false)
  const [searchPage, setSearchPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [urlInput, setUrlInput] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!showModal) return
    setMediaLoading(true)
    fetch('/api/media')
      .then((r) => r.json())
      .then((data: unknown) => {
        const d = data as MediaItem[] | { media?: MediaItem[] }
        setMedia(Array.isArray(d) ? d : d.media ?? [])
      })
      .catch(() => {})
      .finally(() => setMediaLoading(false))
  }, [showModal])

  useEffect(() => {
    if (showModal && tab === 'unsplash' && searchRef.current) searchRef.current.focus()
  }, [showModal, tab])

  async function handleUnsplashSearch(page = 1) {
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/images/search?query=${encodeURIComponent(query)}&page=${page}`)
      const data = (await res.json()) as ImageSearchResponse
      if (res.ok) {
        setSearchResults(page === 1 ? data.results : (prev) => [...prev, ...data.results])
        setSearchPage(page)
        setTotalPages(data.totalPages)
      }
    } catch {
      // ignore
    } finally {
      setSearching(false)
    }
  }

  function handleSelectUrl(url: string) {
    const trimmed = url.trim()
    if (trimmed && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
      onChange(trimmed)
      setShowModal(false)
      setUrlInput('')
    }
  }

  const hasValue = !!value?.trim()

  return (
    <div className="fi-picker">
      {!hasValue ? (
        <button
          type="button"
          className="fi-placeholder"
          onClick={() => setShowModal(true)}
          aria-label="Add featured image"
        >
          📷 Add featured image
        </button>
      ) : (
        <div className="fi-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value ?? ''} alt="" />
          <button
            type="button"
            className="fi-preview-remove"
            onClick={() => onChange(null)}
            aria-label="Remove featured image"
          >
            ✕
          </button>
          <span className="fi-preview-label">Featured image</span>
        </div>
      )}

      {showModal && (
        <div
          className="ed-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false)
          }}
        >
          <div className="ed-modal" style={{ width: 700 }}>
            <div className="ed-modal-head">
              <div className="ed-modal-title">Featured image</div>
              <button type="button" className="ed-modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <div className="fi-modal-tabs">
              <button
                type="button"
                className={`te-img-tab ${tab === 'media' ? 'active' : ''}`}
                onClick={() => setTab('media')}
              >
                Media Library
              </button>
              <button
                type="button"
                className={`te-img-tab ${tab === 'unsplash' ? 'active' : ''}`}
                onClick={() => setTab('unsplash')}
              >
                Unsplash Search
              </button>
              <button
                type="button"
                className={`te-img-tab ${tab === 'url' ? 'active' : ''}`}
                onClick={() => setTab('url')}
              >
                Paste URL
              </button>
            </div>
            <div className="ed-modal-body">
              {tab === 'media' && (
                <>
                  {mediaLoading ? (
                    <div className="fi-modal-loading">Loading media...</div>
                  ) : media.length === 0 ? (
                    <div className="fi-modal-loading">No media files yet.</div>
                  ) : (
                    <div className="te-media-grid">
                      {media.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className="te-media-item"
                          onClick={() => {
                            onChange(m.url)
                            setShowModal(false)
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.url} alt={m.alt || m.filename} />
                          <div className="te-media-name">{m.filename}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {tab === 'unsplash' && (
                <>
                  <div className="te-unsplash-search">
                    <input
                      ref={searchRef}
                      type="text"
                      className="te-unsplash-input"
                      placeholder="Search Unsplash..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUnsplashSearch(1)
                      }}
                    />
                    <button
                      type="button"
                      className="te-unsplash-search-btn"
                      onClick={() => handleUnsplashSearch(1)}
                      disabled={searching || !query.trim()}
                    >
                      {searching ? '...' : 'Search'}
                    </button>
                  </div>
                  {searchResults.length > 0 && (
                    <>
                      <div className="te-unsplash-grid">
                        {searchResults.map((img) => (
                          <button
                            key={img.id}
                            type="button"
                            className="te-unsplash-item"
                            onClick={() => {
                              onChange(img.regular)
                              setShowModal(false)
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.small} alt={img.alt} loading="lazy" />
                            <div className="te-unsplash-credit">
                              <span className="te-unsplash-author">{img.author}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                      {searchPage < totalPages && (
                        <div style={{ textAlign: 'center', marginTop: 12 }}>
                          <button
                            type="button"
                            className="ed-btn ed-btn-secondary"
                            onClick={() => handleUnsplashSearch(searchPage + 1)}
                            disabled={searching}
                          >
                            Load More
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {tab === 'url' && (
                <div className="fi-url-tab">
                  <input
                    type="url"
                    className="te-unsplash-input"
                    placeholder="https://..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSelectUrl(urlInput)
                    }}
                  />
                  <button
                    type="button"
                    className="ed-btn ed-btn-primary"
                    onClick={() => handleSelectUrl(urlInput)}
                    disabled={!urlInput.trim()}
                  >
                    Use URL
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
