'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import '../editor.css'

const TiptapEditor = dynamic(() => import('@/components/editor/tiptap-editor'), {
  ssr: false,
  loading: () => <div style={{ minHeight: 400, background: 'var(--wh)', border: '1px solid var(--brd)', borderRadius: 'var(--rl)', animation: 'pulse 2s infinite' }} />,
})

type Version = { id: string; version: number; title: string; content: Record<string, unknown>; createdAt: string }
type TagItem = { id: string; name: string; slug: string }
type ArticleTag = { tag: TagItem }

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim().slice(0, 100)
}

export default function ArticleEditor({ id }: { id: string }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState<Record<string, unknown>>({})
  const [initialContent, setInitialContent] = useState<Record<string, unknown> | null>(null)
  const [status, setStatus] = useState('DRAFT')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [aiGenerated, setAiGenerated] = useState(false)

  // Schedule
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')

  // History
  const [showHistory, setShowHistory] = useState(false)
  const [versions, setVersions] = useState<Version[]>([])

  // Newsletter
  const [sendNewsletter, setSendNewsletter] = useState(false)

  // Tags
  const [articleTags, setArticleTags] = useState<TagItem[]>([])
  const [allTags, setAllTags] = useState<TagItem[]>([])
  const [tagInput, setTagInput] = useState('')
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)

  useEffect(() => {
    fetch(`/api/articles/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setTitle(data.title || '')
        setInitialContent(data.content || {})
        setContent(data.content || {})
        setStatus(data.status || 'DRAFT')
        setSlug(data.slug || '')
        setAiGenerated(data.aiGenerated || false)
        if (data.scheduledAt) setScheduledAt(new Date(data.scheduledAt).toISOString().slice(0, 16))
        if (data.versions) setVersions(data.versions)
        if (data.tags) setArticleTags(data.tags.map((t: ArticleTag) => t.tag))
        setLoading(false)
      })
      .catch(() => setLoading(false))

    fetch('/api/tags').then((r) => r.json()).then(setAllTags).catch(() => {})
  }, [id])

  const handleTitleChange = useCallback((val: string) => {
    setTitle(val)
    if (!slugEdited) setSlug(slugify(val))
  }, [slugEdited])

  async function handleSave(newStatus?: string) {
    setSaving(true)
    try {
      const body: Record<string, unknown> = { title, content, status: newStatus || status, slug }
      if (newStatus === 'SCHEDULED' && scheduledAt) {
        body.scheduledAt = scheduledAt
        body.status = 'SCHEDULED'
      }
      body.tagIds = articleTags.map((t) => t.id)

      const res = await fetch(`/api/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        if (newStatus) setStatus(newStatus)
        // Send newsletter if checked and publishing
        if (sendNewsletter && newStatus === 'PUBLISHED') {
          fetch('/api/newsletter/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ articleId: id }),
          }).catch(console.error)
          setSendNewsletter(false)
        }
        // Refresh versions
        const data = await res.json()
        if (data.id) {
          const fresh = await fetch(`/api/articles/${id}`).then((r) => r.json())
          if (fresh.versions) setVersions(fresh.versions)
        }
        router.refresh()
      } else if (res.status === 409) {
        alert('This slug is already taken. Please choose a different one.')
      }
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this article?')) return
    try {
      const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' })
      if (res.ok) { router.push('/newsroom'); router.refresh() }
    } catch (error) { console.error('Delete error:', error) }
  }

  function restoreVersion(v: Version) {
    setTitle(v.title)
    setContent(v.content)
    setInitialContent(v.content)
    setShowHistory(false)
  }

  async function addTag(name: string) {
    const existing = allTags.find((t) => t.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      if (!articleTags.find((t) => t.id === existing.id)) {
        setArticleTags((prev) => [...prev, existing])
      }
    } else {
      try {
        const res = await fetch('/api/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        if (res.ok) {
          const tag = await res.json()
          setAllTags((prev) => [...prev, tag])
          setArticleTags((prev) => [...prev, tag])
        }
      } catch (err) { console.error('Tag create error:', err) }
    }
    setTagInput('')
    setShowTagSuggestions(false)
  }

  function removeTag(tagId: string) {
    setArticleTags((prev) => prev.filter((t) => t.id !== tagId))
  }

  const tagSuggestions = allTags.filter((t) =>
    tagInput && t.name.toLowerCase().includes(tagInput.toLowerCase()) && !articleTags.find((at) => at.id === t.id)
  )

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ height: 32, width: 200, background: 'var(--g100)', borderRadius: 'var(--rm)', animation: 'pulse 2s infinite' }} />
        <div style={{ height: 400, background: 'var(--g50)', borderRadius: 'var(--rl)', animation: 'pulse 2s infinite' }} />
      </div>
    )
  }

  const statusLabel = status === 'DRAFT' ? 'Draft' : status === 'IN_REVIEW' ? 'In Review' : status === 'SCHEDULED' ? 'Scheduled' : status === 'PUBLISHED' ? 'Published' : status
  const statusCls = status === 'PUBLISHED' ? 'published' : status === 'DRAFT' ? 'draft' : status === 'SCHEDULED' ? 'in-review' : 'in-review'

  return (
    <div>
      {/* Top bar */}
      <div className="ed-top">
        <button className="ed-back" onClick={() => router.push('/newsroom')}>← Newsroom</button>
        <div className="ed-title-bar">
          Edit Article
          {aiGenerated && <span className="badge-ai">AI</span>}
          <span className={`badge-status ${statusCls}`}>{statusLabel}</span>
        </div>
        <button className="ed-btn ed-btn-secondary" onClick={() => setShowHistory(true)}>🕐 History</button>
        <button className="ed-btn ed-btn-secondary" onClick={() => setShowSchedule(true)}>📅 Schedule</button>
        <button className="ed-btn ed-btn-secondary" onClick={handleDelete}>🗑️ Delete</button>
        <button className="ed-btn ed-btn-secondary" onClick={() => handleSave()} disabled={saving}>
          💾 {saving ? 'Saving...' : 'Save'}
        </button>
        {status !== 'PUBLISHED' && (
          <>
            <label className="ed-nl-check">
              <input type="checkbox" checked={sendNewsletter} onChange={(e) => setSendNewsletter(e.target.checked)} />
              <span>📧 Newsletter</span>
            </label>
            <button className="ed-btn ed-btn-primary" onClick={() => handleSave('PUBLISHED')} disabled={saving}>
              ⚡ Publish
            </button>
          </>
        )}
      </div>

      {/* Editor form */}
      <div className="ed-form">
        <input
          type="text"
          className="ed-title-input"
          placeholder="Article title..."
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
        />

        {/* Slug field */}
        <div className="ed-meta">
          <div className="ed-slug-row">
            <span className="ed-slug-label">Slug:</span>
            <input
              type="text"
              className="ed-slug-input"
              value={slug}
              onChange={(e) => { setSlug(slugify(e.target.value)); setSlugEdited(true) }}
              placeholder="article-slug"
            />
          </div>

          {/* Tags */}
          <div className="ed-tags-row">
            <span className="ed-slug-label">Tags:</span>
            <div className="ed-tags-container">
              {articleTags.map((t) => (
                <span key={t.id} className="ed-tag">
                  {t.name}
                  <button className="ed-tag-remove" onClick={() => removeTag(t.id)}>×</button>
                </span>
              ))}
              <div className="ed-tag-input-wrap">
                <input
                  type="text"
                  className="ed-tag-input"
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => { setTagInput(e.target.value); setShowTagSuggestions(true) }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagInput.trim()) { e.preventDefault(); addTag(tagInput.trim()) }
                  }}
                  onFocus={() => setShowTagSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                />
                {showTagSuggestions && tagSuggestions.length > 0 && (
                  <div className="ed-tag-suggestions">
                    {tagSuggestions.slice(0, 6).map((t) => (
                      <div key={t.id} className="ed-tag-suggestion" onMouseDown={() => addTag(t.name)}>
                        {t.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {initialContent && (
          <TiptapEditor
            content={initialContent}
            onChange={(json) => setContent(json)}
          />
        )}
      </div>

      {/* Schedule Modal */}
      {showSchedule && (
        <div className="ed-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowSchedule(false) }}>
          <div className="ed-modal">
            <div className="ed-modal-head">
              <div className="ed-modal-title">📅 Schedule Article</div>
              <button className="ed-modal-close" onClick={() => setShowSchedule(false)}>×</button>
            </div>
            <div className="ed-modal-body">
              <label className="ed-modal-label">Publish date and time</label>
              <input
                type="datetime-local"
                className="ed-schedule-input"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
              {scheduledAt && (
                <div className="ed-schedule-preview">
                  Will publish on {new Date(scheduledAt).toLocaleString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              )}
              <div className="ed-modal-actions">
                <button className="ed-btn ed-btn-secondary" onClick={() => { setScheduledAt(''); setShowSchedule(false) }}>
                  Clear Schedule
                </button>
                <button
                  className="ed-btn ed-btn-primary"
                  disabled={!scheduledAt}
                  onClick={() => { handleSave('SCHEDULED'); setShowSchedule(false) }}
                >
                  📅 Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="ed-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowHistory(false) }}>
          <div className="ed-modal">
            <div className="ed-modal-head">
              <div className="ed-modal-title">🕐 Version History</div>
              <button className="ed-modal-close" onClick={() => setShowHistory(false)}>×</button>
            </div>
            <div className="ed-modal-body">
              {versions.length === 0 ? (
                <div className="ed-history-empty">No previous versions yet. Save the article to create a version.</div>
              ) : (
                <div className="ed-history-list">
                  {versions.map((v) => (
                    <div key={v.id} className="ed-history-item">
                      <div className="ed-history-info">
                        <div className="ed-history-ver">v{v.version}</div>
                        <div className="ed-history-title">{v.title}</div>
                        <div className="ed-history-date">
                          {new Date(v.createdAt).toLocaleString('en-GB', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <button className="ed-btn ed-btn-secondary" onClick={() => restoreVersion(v)}>
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
