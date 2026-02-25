'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { formatDateTime } from '@/lib/utils'
import './media.css'

type MediaItem = {
  id: string
  filename: string
  url: string
  alt: string | null
  width: number | null
  height: number | null
  size: number
  mimeType: string
  createdAt: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function MediaPage() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/media')
      .then((r) => r.json() as Promise<MediaItem[]>)
      .then((data) => { setMedia(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/media', { method: 'POST', body: form })
      if (res.ok) {
        const item = await res.json() as MediaItem
        setMedia((prev) => [item, ...prev])
      }
    } catch {
    } finally {
      setUploading(false)
    }
  }, [])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ''
  }

  async function confirmDelete() {
    if (!deleteConfirmId) return
    setDeleting(true)
    try {
      const res = await fetch('/api/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteConfirmId }),
      })
      if (res.ok) {
        setMedia((prev) => prev.filter((m) => m.id !== deleteConfirmId))
      }
    } catch {
    } finally {
      setDeleting(false)
      setDeleteConfirmId(null)
    }
  }

  const filtered = media.filter((m) =>
    !search || m.filename.toLowerCase().includes(search.toLowerCase())
  )

  const totalSize = media.reduce((sum, m) => sum + m.size, 0)
  const itemToDelete = media.find((m) => m.id === deleteConfirmId)

  return (
    <div className="ml-page">
      <div className="ml-header">
        <div className="ml-header-left">
          <h1>Media Library</h1>
          <p>{media.length} file{media.length !== 1 ? 's' : ''} uploaded</p>
        </div>
      </div>

      <div className="ml-stats">
        <div className="ml-stat">
          <div className="ml-stat-icon">🖼️</div>
          <div>
            <div className="ml-stat-val">{media.length}</div>
            <div className="ml-stat-label">Total Files</div>
          </div>
        </div>
        <div className="ml-stat">
          <div className="ml-stat-icon">💾</div>
          <div>
            <div className="ml-stat-val">{formatSize(totalSize)}</div>
            <div className="ml-stat-label">Total Size</div>
          </div>
        </div>
      </div>

      <div
        className={`ml-dropzone${dragActive ? ' active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <div className="ml-dropzone-icon">📁</div>
        <div className="ml-dropzone-text">
          {dragActive ? 'Drop file here' : 'Drag & drop files or click to upload'}
        </div>
        <div className="ml-dropzone-hint">JPG, PNG, GIF, WebP, SVG · Max 10MB</div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} />
      </div>

      {uploading && (
        <div className="ml-uploading">
          <div className="ml-uploading-spinner" />
          <div className="ml-uploading-text">Uploading...</div>
        </div>
      )}

      <div className="ml-toolbar">
        <input
          type="text"
          className="ml-search"
          placeholder="Search files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="ml-empty">
          <div className="ml-empty-desc">Loading media...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="ml-empty">
          <div className="ml-empty-icon">🖼️</div>
          <div className="ml-empty-title">{media.length === 0 ? 'No media yet' : 'No matching files'}</div>
          <div className="ml-empty-desc">
            {media.length === 0 ? 'Upload your first image to get started' : 'Try a different search term'}
          </div>
        </div>
      ) : (
        <div className="ml-grid">
          {filtered.map((item) => (
            <div key={item.id} className="ml-item">
              <img
                src={item.url}
                alt={item.alt || item.filename}
                className="ml-item-img"
                loading="lazy"
              />
              <div className="ml-item-body">
                <div className="ml-item-name" title={item.filename}>{item.filename}</div>
                <div className="ml-item-meta">
                  <span>{formatSize(item.size)}</span>
                  <span>{formatDateTime(item.createdAt)}</span>
                </div>
              </div>
              {deleteConfirmId === item.id ? (
                <div className="ml-item-confirm" onClick={(e) => e.stopPropagation()}>
                  <span style={{ fontSize: 11, color: 'var(--coral)', fontWeight: 700 }}>Delete?</span>
                  <button
                    className="ml-item-confirm-yes"
                    onClick={confirmDelete}
                    disabled={deleting}
                  >
                    {deleting ? '…' : 'Yes'}
                  </button>
                  <button
                    className="ml-item-confirm-no"
                    onClick={() => setDeleteConfirmId(null)}
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  className="ml-item-delete"
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(item.id) }}
                  title="Delete"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
