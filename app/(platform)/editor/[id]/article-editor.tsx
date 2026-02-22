'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import '../editor.css'

const TiptapEditor = dynamic(() => import('@/components/editor/tiptap-editor'), {
  ssr: false,
  loading: () => <div className="te-loading" />,
})

const AISidebar = dynamic(() => import('@/components/editor/ai-sidebar').then(m => ({ default: m.AISidebar })), {
  ssr: false,
  loading: () => null,
})

type Version = { id: string; version: number; title: string; content: Record<string, unknown>; createdAt: string }
type TagItem = { id: string; name: string; slug: string }
type ArticleTag = { tag: TagItem }
type Category = { id: string; name: string; slug?: string; icon?: string }

// Bug A fix: include Bosnian character replacements
function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[čć]/g, 'c').replace(/[š]/g, 's').replace(/[ž]/g, 'z').replace(/[đ]/g, 'dj')
    .replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim().slice(0, 100)
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
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [versions, setVersions] = useState<Version[]>([])
  const [sendNewsletter, setSendNewsletter] = useState(false)
  const [articleTags, setArticleTags] = useState<TagItem[]>([])
  const [allTags, setAllTags] = useState<TagItem[]>([])
  const [tagInput, setTagInput] = useState('')
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [showSEO, setShowSEO] = useState(false)
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDesc, setMetaDesc] = useState('')
  // Bug C fix: load and track categoryId
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const editorRef = useRef<unknown>(null)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch(`/api/articles/${id}`)
      .then((r) => r.json() as Promise<{
        title?: string; content?: Record<string, unknown>; status?: string; slug?: string
        aiGenerated?: boolean; metaTitle?: string; metaDescription?: string; scheduledAt?: string
        versions?: Version[]; tags?: ArticleTag[]; categoryId?: string | null
      }>)
      .then((data) => {
        setTitle(data.title || '')
        setInitialContent(data.content || {})
        setContent(data.content || {})
        setStatus(data.status || 'DRAFT')
        setSlug(data.slug || '')
        setAiGenerated(data.aiGenerated || false)
        setMetaTitle(data.metaTitle || '')
        setMetaDesc(data.metaDescription || '')
        if (data.scheduledAt) setScheduledAt(new Date(data.scheduledAt).toISOString().slice(0, 16))
        if (data.versions) setVersions(data.versions)
        if (data.tags) setArticleTags(data.tags.map((t: ArticleTag) => t.tag))
        // Bug C fix: restore categoryId from loaded article
        if (data.categoryId) setCategoryId(data.categoryId)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // Bug C fix: also load site categories for the select
    fetch('/api/site')
      .then((r) => r.json() as Promise<{ categories?: Category[] }>)
      .then((data) => { if (data.categories) setCategories(data.categories) })
      .catch(() => {})

    fetch('/api/tags').then((r) => r.json() as Promise<TagItem[]>).then(setAllTags).catch(() => {})
  }, [id])

  const handleTitleChange = useCallback((val: string) => {
    setTitle(val)
    if (!slugEdited) setSlug(slugify(val))
  }, [slugEdited])

  // Auto-save every 30s
  const autoSave = useCallback(async () => {
    if (!title.trim() || saving) return
    try {
      await fetch(`/api/articles/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      })
    } catch {}
  }, [id, title, content, saving])

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(autoSave, 30000)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [autoSave])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSave('PUBLISHED')
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, status, categoryId])

  async function handleSave(newStatus?: string) {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        title,
        content,
        status: newStatus || status,
        slug,
        metaTitle: metaTitle || undefined,
        metaDescription: metaDesc || undefined,
        // Bug C fix: always send categoryId
        categoryId: categoryId || null,
        tagIds: articleTags.map((t) => t.id),
      }
      if (newStatus === 'SCHEDULED' && scheduledAt) {
        body.scheduledAt = scheduledAt
        body.status = 'SCHEDULED'
      }

      const res = await fetch(`/api/articles/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const updated = await res.json() as { status?: string; versions?: Version[] }
        if (newStatus) setStatus(newStatus)
        // Bug D fix: use versions from PATCH response instead of extra GET
        if (updated.versions) setVersions(updated.versions)
        toast.success(newStatus === 'PUBLISHED' ? 'Objavljeno' : 'Sačuvano')
        if (sendNewsletter && newStatus === 'PUBLISHED') {
          fetch('/api/newsletter/send', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ articleId: id }),
          }).catch(console.error)
          setSendNewsletter(false)
        }
        router.refresh()
      } else if (res.status === 409) {
        toast.error('Slug je već zauzet — odaberi drugi.')
      } else {
        toast.error('Greška pri čuvanju')
      }
    } catch {
      toast.error('Greška — pokušaj ponovo')
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!confirm('Obrisati ovaj članak?')) return
    try {
      const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' })
      if (res.ok) { router.push('/articles'); router.refresh() }
    } catch {}
  }

  function restoreVersion(v: Version) {
    setTitle(v.title)
    setContent(v.content)
    setInitialContent(v.content)
    setShowHistory(false)
    toast.success(`Verzija v${v.version} restaurirana`)
  }

  async function addTag(name: string) {
    const existing = allTags.find((t) => t.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      if (!articleTags.find((t) => t.id === existing.id)) setArticleTags((prev) => [...prev, existing])
    } else {
      try {
        const res = await fetch('/api/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
        if (res.ok) { const tag = await res.json() as TagItem; setAllTags((prev) => [...prev, tag]); setArticleTags((prev) => [...prev, tag]) }
      } catch {}
    }
    setTagInput('')
    setShowTagSuggestions(false)
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
  const statusCls = status === 'PUBLISHED' ? 'published' : status === 'DRAFT' ? 'draft' : 'in-review'

  return (
    <div className="editor-layout">
      {/* Top bar */}
      <div className="ed-top">
        <button className="ed-back" onClick={() => router.push('/articles')}>← Articles</button>
        <div className="ed-title-bar">
          Edit Article
          {aiGenerated && <span className="badge-ai">AI</span>}
          <span className={`badge-status ${statusCls}`}>{statusLabel}</span>
        </div>
        <button className="ed-btn ed-btn-secondary" onClick={() => setShowHistory(true)}>🕐 History</button>
        <button className="ed-btn ed-btn-secondary" onClick={() => setShowSchedule(true)}>📅 Schedule</button>
        <button className="ed-btn ed-btn-secondary" onClick={handleDelete}>🗑️</button>
        <button className="ed-btn ed-btn-secondary" onClick={() => handleSave()} disabled={saving}>
          💾 {saving ? 'Saving...' : 'Save'}
        </button>
        {status !== 'PUBLISHED' && (
          <>
            <label className="ed-nl-check">
              <input type="checkbox" checked={sendNewsletter} onChange={(e) => setSendNewsletter(e.target.checked)} />
              <span>📧</span>
            </label>
            <button className="ed-btn ed-btn-primary" onClick={() => handleSave('PUBLISHED')} disabled={saving}>
              ⚡ Publish
            </button>
          </>
        )}
      </div>

      <div className="editor-main">
        {/* LEFT: Editor */}
        <div className="editor-left">
          <div className="ed-form">
            <input type="text" className="ed-title-input" placeholder="Article title..."
              value={title} onChange={(e) => handleTitleChange(e.target.value)} />

            <div className="ed-meta">
              {/* Bug C fix: category selector */}
              {categories.length > 0 && (
                <select
                  className="ed-select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  style={{ marginBottom: 8 }}
                >
                  <option value="">No category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.icon ? `${cat.icon} ` : ''}{cat.name}</option>
                  ))}
                </select>
              )}
              <div className="ed-slug-row">
                <span className="ed-slug-label">Slug:</span>
                <input type="text" className="ed-slug-input"
                  value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugEdited(true) }}
                  placeholder="article-slug" />
              </div>
              <div className="ed-tags-row">
                <span className="ed-slug-label">Tags:</span>
                <div className="ed-tags-container">
                  {articleTags.map((t) => (
                    <span key={t.id} className="ed-tag">
                      {t.name}
                      <button className="ed-tag-remove" onClick={() => setArticleTags((prev) => prev.filter((p) => p.id !== t.id))}>×</button>
                    </span>
                  ))}
                  <div className="ed-tag-input-wrap">
                    <input type="text" className="ed-tag-input" placeholder="Add tag..."
                      value={tagInput}
                      onChange={(e) => { setTagInput(e.target.value); setShowTagSuggestions(true) }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && tagInput.trim()) { e.preventDefault(); addTag(tagInput.trim()) } }}
                      onFocus={() => setShowTagSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)} />
                    {showTagSuggestions && tagSuggestions.length > 0 && (
                      <div className="ed-tag-suggestions">
                        {tagSuggestions.slice(0, 6).map((t) => (
                          <div key={t.id} className="ed-tag-suggestion" onMouseDown={() => addTag(t.name)}>{t.name}</div>
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
                onEditorReady={(e) => { editorRef.current = e }}
              />
            )}
          </div>

          {/* Bottom: SEO */}
          <div className="ed-bottom">
            <button className="ed-seo-toggle" onClick={() => setShowSEO(!showSEO)}>
              {showSEO ? '▾' : '▸'} SEO Settings
            </button>
            {showSEO && (
              <div className="ed-seo-panel">
                <div className="ed-seo-field">
                  <label>Meta Title</label>
                  <input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder={title} maxLength={60} />
                  <span className="ed-seo-count">{(metaTitle || title).length}/60</span>
                </div>
                <div className="ed-seo-field">
                  <label>Meta Description</label>
                  <textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} placeholder="Article description..." maxLength={155} rows={2} />
                  <span className="ed-seo-count">{metaDesc.length}/155</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: AI Sidebar */}
        {showAI && (
          <div className="editor-right">
            <AISidebar
              editor={editorRef.current as import('@tiptap/react').Editor | null}
              onGenerate={(result) => {
                if (result.title) setTitle(result.title)
                if (result.content) { setContent(result.content); setInitialContent(result.content) }
              }}
            />
          </div>
        )}
      </div>

      {/* Floating AI toggle */}
      <button className="ai-toggle-btn" onClick={() => setShowAI(!showAI)} title="Toggle AI Co-Pilot">
        {showAI ? '✕' : '🤖'} {showAI ? '' : 'AI'}
      </button>

      {/* Schedule modal */}
      {showSchedule && (
        <div className="ed-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowSchedule(false) }}>
          <div className="ed-modal">
            <div className="ed-modal-head">
              <div className="ed-modal-title">📅 Schedule Article</div>
              <button className="ed-modal-close" onClick={() => setShowSchedule(false)}>×</button>
            </div>
            <div className="ed-modal-body">
              <label className="ed-modal-label">Publish date and time</label>
              <input type="datetime-local" className="ed-schedule-input" value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)} min={new Date().toISOString().slice(0, 16)} />
              {scheduledAt && (
                <div className="ed-schedule-preview">
                  Will publish on {new Date(scheduledAt).toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              <div className="ed-modal-actions">
                <button className="ed-btn ed-btn-secondary" onClick={() => { setScheduledAt(''); setShowSchedule(false) }}>Clear</button>
                <button className="ed-btn ed-btn-primary" disabled={!scheduledAt}
                  onClick={() => { handleSave('SCHEDULED'); setShowSchedule(false) }}>📅 Schedule</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History modal */}
      {showHistory && (
        <div className="ed-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowHistory(false) }}>
          <div className="ed-modal">
            <div className="ed-modal-head">
              <div className="ed-modal-title">🕐 Version History</div>
              <button className="ed-modal-close" onClick={() => setShowHistory(false)}>×</button>
            </div>
            <div className="ed-modal-body">
              {versions.length === 0 ? (
                <div className="ed-history-empty">No previous versions yet.</div>
              ) : (
                <div className="ed-history-list">
                  {versions.map((v) => (
                    <div key={v.id} className="ed-history-item">
                      <div className="ed-history-info">
                        <div className="ed-history-ver">v{v.version}</div>
                        <div className="ed-history-title">{v.title}</div>
                        <div className="ed-history-date">
                          {new Date(v.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <button className="ed-btn ed-btn-secondary" onClick={() => restoreVersion(v)}>Restore</button>
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
