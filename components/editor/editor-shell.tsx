'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'

const TiptapEditor = dynamic(() => import('@/components/editor/tiptap-editor'), {
  ssr: false,
  loading: () => <div className="te-loading" />,
})

const FeaturedImagePicker = dynamic(() => import('@/components/editor/featured-image-picker').then(m => ({ default: m.FeaturedImagePicker })), {
  ssr: false,
  loading: () => <div className="fi-placeholder" style={{ padding: 24, color: 'var(--g400)' }}>Loading...</div>,
})

const AISidebar = dynamic(() => import('@/components/editor/ai-sidebar').then(m => ({ default: m.AISidebar })), {
  ssr: false,
  loading: () => null,
})

const EVENT_TO_CATEGORY: Record<string, string> = {
  'TRANSFER': 'transfers', 'CONTRACT': 'transfers', 'INJURY': 'injuries',
  'MATCH_PREVIEW': 'matches', 'MATCH_RESULT': 'matches', 'POST_MATCH_REACTION': 'matches',
  'BREAKING': 'news', 'SCANDAL': 'news', 'DISCIPLINE': 'news', 'RECORD': 'news',
  'MANAGERIAL': 'news', 'TACTICAL': 'news',
}

type Version = { id: string; version: number; title: string; content: Record<string, unknown>; createdAt: string }
type TagItem = { id: string; name: string; slug: string }
type ArticleTag = { tag: TagItem }
type Category = { id: string; name: string; slug?: string; icon?: string }

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[čć]/g, 'c').replace(/[š]/g, 's').replace(/[ž]/g, 'z').replace(/[đ]/g, 'dj')
    .replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim().slice(0, 100)
}

export function EditorShell({ articleId: initialArticleId }: { articleId?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [articleId, setArticleId] = useState<string | undefined>(initialArticleId)
  const articleIdRef = useRef<string | null>(initialArticleId ?? null)

  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [content, setContent] = useState<Record<string, unknown>>({})
  const [initialContent, setInitialContent] = useState<Record<string, unknown> | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [publishedStatus, setPublishedStatus] = useState<'DRAFT' | 'PUBLISHED' | 'SCHEDULED'>('DRAFT')
  const [siteId, setSiteId] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [showAI, setShowAI] = useState(false)
  const [aiResult, setAiResult] = useState<{ model?: string; tokensIn?: number; tokensOut?: number } | null>(null)
  const [sendNewsletter, setSendNewsletter] = useState(false)
  const [showSEO, setShowSEO] = useState(false)
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDesc, setMetaDesc] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [featuredImage, setFeaturedImage] = useState<string | null>(null)
  const [scheduledAt, setScheduledAt] = useState('')
  const [showSchedule, setShowSchedule] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [versions, setVersions] = useState<Version[]>([])
  const [articleTags, setArticleTags] = useState<TagItem[]>([])
  const [allTags, setAllTags] = useState<TagItem[]>([])
  const [tagInput, setTagInput] = useState('')
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [smartNotice, setSmartNotice] = useState<string | null>(null)
  const [prefilledPrompt, setPrefilledPrompt] = useState('')
  const [autoGenerate, setAutoGenerate] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)
  const [recoveryData, setRecoveryData] = useState<{ title: string; subtitle: string; content: Record<string, unknown>; categoryId: string } | null>(null)
  const [loading, setLoading] = useState(!!initialArticleId)

  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('editor-theme')
      setIsDark(stored === 'dark')
    } catch {
      // localStorage unavailable
    }
  }, [])
  const toggleEditorTheme = useCallback(() => {
    const next = !isDark
    setIsDark(next)
    try {
      localStorage.setItem('editor-theme', next ? 'dark' : 'light')
    } catch {
      // ignore
    }
  }, [isDark])

  const editorRef = useRef<unknown>(null)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)
  const hasUnsavedChanges = useRef(false)
  const initialLoadDone = useRef(false)

  const stateRef = useRef({
    title: '', subtitle: '', content: {} as Record<string, unknown>, categoryId: '', slug: '', metaTitle: '', metaDesc: '',
    featuredImage: null as string | null, articleTags: [] as TagItem[], sendNewsletter: false,
  })
  useEffect(() => {
    stateRef.current = {
      title, subtitle, content, categoryId, slug, metaTitle, metaDesc,
      featuredImage, articleTags, sendNewsletter,
    }
  }, [title, subtitle, content, categoryId, slug, metaTitle, metaDesc, featuredImage, articleTags, sendNewsletter])

  // Sync articleId from prop (e.g. after navigation)
  useEffect(() => {
    if (initialArticleId && initialArticleId !== articleIdRef.current) {
      articleIdRef.current = initialArticleId
      setArticleId(initialArticleId)
    }
  }, [initialArticleId])

  // Load site & categories
  useEffect(() => {
    fetch('/api/site').then((r) => r.json() as Promise<{ id?: string; categories?: Category[] }>).then((data) => {
      if (data.id) {
        setSiteId(data.id)
        const cats = data.categories || []
        setCategories(cats)
        if (!initialArticleId && searchParams.get('eventType')) {
          const targetSlug = EVENT_TO_CATEGORY[searchParams.get('eventType')!]
          if (targetSlug) {
            const match = cats.find((c: Category) => c.slug === targetSlug)
            if (match) setCategoryId(match.id)
          }
        }
      }
    }).catch(console.error)
  }, [initialArticleId, searchParams])

  // Load existing article (edit mode)
  useEffect(() => {
    if (!initialArticleId) return
    fetch(`/api/articles/${initialArticleId}`)
      .then((r) => r.json() as Promise<{
        title?: string; content?: Record<string, unknown>; status?: string; slug?: string; excerpt?: string
        aiGenerated?: boolean; metaTitle?: string; metaDescription?: string; scheduledAt?: string
        featuredImage?: string | null; versions?: Version[]; tags?: ArticleTag[]; categoryId?: string | null
      }>)
      .then((data) => {
        setTitle(data.title || '')
        setSubtitle(data.excerpt || '')
        setInitialContent(data.content || {})
        setContent(data.content || {})
        setPublishedStatus((data.status as 'DRAFT' | 'PUBLISHED' | 'SCHEDULED') || 'DRAFT')
        setSlug(data.slug || '')
        setMetaTitle(data.metaTitle || '')
        setMetaDesc(data.metaDescription || '')
        setFeaturedImage(data.featuredImage ?? null)
        if (data.scheduledAt) setScheduledAt(new Date(data.scheduledAt).toISOString().slice(0, 16))
        if (data.versions) setVersions(data.versions)
        if (data.tags) setArticleTags(data.tags.map((t: ArticleTag) => t.tag))
        if (data.categoryId) setCategoryId(data.categoryId)
        setLoading(false)
        initialLoadDone.current = true
      })
      .catch(() => setLoading(false))

    fetch('/api/tags').then((r) => r.json() as Promise<TagItem[]>).then(setAllTags).catch(() => {})
  }, [initialArticleId])

  // Create-only: URL params & recovery
  useEffect(() => {
    if (initialArticleId) return
    if (searchParams.get('smartGenerate') === 'true') {
      try {
        const raw = sessionStorage.getItem('smartArticle')
        if (raw) {
          const data = JSON.parse(raw)
          if (data.title) setTitle(data.title)
          if (data.tiptapContent) { setContent(data.tiptapContent); setInitialContent(data.tiptapContent) }
          if (data.model) setAiResult({ model: data.model, tokensIn: data.tokensIn, tokensOut: data.tokensOut })
          setSmartNotice('Article generated by AI — review and edit before publishing')
          setTimeout(() => setSmartNotice(null), 6000)
          sessionStorage.removeItem('smartArticle')
        }
      } catch {}
      return
    }
    if (searchParams.get('mode') === 'rewrite') {
      try {
        const raw = sessionStorage.getItem('diurna_rewrite_source')
        if (raw) {
          const data = JSON.parse(raw)
          sessionStorage.removeItem('diurna_rewrite_source')
          setPrefilledPrompt(`Rewrite: ${data.title}`)
          setShowAI(true)
          runAutoGenerate(data, 'rewrite')
        }
      } catch {}
      return
    }
    if (searchParams.get('mode') === 'headline-only') {
      try {
        const raw = sessionStorage.getItem('diurna_headline_only')
        if (raw) {
          const data = JSON.parse(raw)
          sessionStorage.removeItem('diurna_headline_only')
          setPrefilledPrompt(`Headline: ${data.title}`)
          setShowAI(true)
          runAutoGenerate(data, 'headline-only')
        }
      } catch {}
      return
    }
    if (searchParams.get('mode') === 'combined') {
      try {
        const raw = sessionStorage.getItem('diurna_combined_sources')
        if (raw) {
          const sources = JSON.parse(raw)
          sessionStorage.removeItem('diurna_combined_sources')
          if (sources.length > 0) {
            setPrefilledPrompt(`Combined from ${sources.length} sources`)
            setShowAI(true)
            runCombinedGenerate(sources)
          }
        }
      } catch {}
      return
    }
    if (searchParams.get('clusterId') && searchParams.get('title')) {
      const clusterTitle = searchParams.get('title') || ''
      const clusterSummary = searchParams.get('summary') || ''
      setTitle(clusterTitle)
      setPrefilledPrompt(`Write an article about: ${clusterTitle}${clusterSummary ? `\n\nContext: ${clusterSummary}` : ''}`)
      setShowAI(true)
      return
    }
    const promptParam = searchParams.get('prompt')
    if (promptParam) {
      setPrefilledPrompt(promptParam)
      setShowAI(true)
      setAutoGenerate(true)
      return
    }
    try {
      const backup = localStorage.getItem('diurna_editor_backup')
      if (backup) {
        const data = JSON.parse(backup)
        if (data.timestamp && Date.now() - data.timestamp < 3600000 && data.title) {
          setRecoveryData(data)
          setShowRecovery(true)
        }
      }
    } catch {}
  }, [initialArticleId, searchParams])

  function applyRecovery() {
    if (!recoveryData) return
    setTitle(recoveryData.title)
    setSubtitle(recoveryData.subtitle || '')
    if (recoveryData.content && Object.keys(recoveryData.content).length > 0) {
      setContent(recoveryData.content)
      setInitialContent(recoveryData.content)
    }
    if (recoveryData.categoryId) setCategoryId(recoveryData.categoryId)
    setShowRecovery(false)
    setRecoveryData(null)
  }

  function discardRecovery() {
    localStorage.removeItem('diurna_editor_backup')
    setShowRecovery(false)
    setRecoveryData(null)
  }

  async function runAutoGenerate(data: { title: string; sourceText?: string; domain?: string }, mode: string) {
    try {
      const body: Record<string, unknown> = {
        topic: data.title, category: 'Sport',
        articleType: mode === 'headline-only' ? 'breaking' : 'report',
        mode: mode === 'rewrite' ? 'rewrite' : 'single',
      }
      if (mode === 'rewrite' && data.sourceText) {
        body.sourceContext = data.sourceText
        body.sourceDomain = data.domain
      }
      const res = await fetch('/api/ai/smart-generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await res.json() as { title?: string; tiptapContent?: Record<string, unknown>; model?: string; tokensIn?: number; tokensOut?: number }
      if (result.title) setTitle(result.title)
      if (result.tiptapContent) { setContent(result.tiptapContent); setInitialContent(result.tiptapContent) }
      setAiResult({ model: result.model, tokensIn: result.tokensIn, tokensOut: result.tokensOut })
      setSmartNotice(mode === 'rewrite' ? `Rewritten from ${data.domain || 'source'}` : 'Generated from headline — review carefully')
      setTimeout(() => setSmartNotice(null), 8000)
    } catch {
      setTitle(data.title)
    }
  }

  async function runCombinedGenerate(sources: { title: string; source: string; role: string }[]) {
    try {
      const primary = sources.find(s => s.role === 'primary')
      const res = await fetch('/api/ai/smart-generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: primary?.title || sources[0].title, category: 'Sport',
          articleType: 'report', mode: 'combined', sources,
        }),
      })
      const data = await res.json() as { title?: string; tiptapContent?: Record<string, unknown>; model?: string; tokensIn?: number; tokensOut?: number }
      if (data.title) setTitle(data.title)
      if (data.tiptapContent) { setContent(data.tiptapContent); setInitialContent(data.tiptapContent) }
      setAiResult({ model: data.model, tokensIn: data.tokensIn, tokensOut: data.tokensOut })
      setSmartNotice('Combined article generated — review before publishing')
      setTimeout(() => setSmartNotice(null), 6000)
    } catch {}
  }

  useEffect(() => {
    if (title && !slugEdited) setSlug(slugify(title))
  }, [title, slugEdited])

  const autoSave = useCallback(async () => {
    const id = articleIdRef.current
    if (!id || !title.trim() || savingRef.current) return
    try {
      await fetch(`/api/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          featuredImage: featuredImage || null,
          subtitle: subtitle || undefined,
          slug: slug || undefined,
          categoryId: categoryId || undefined,
          tagIds: articleTags.map((t) => t.id),
        }),
      })
    } catch {}
  }, [title, content, featuredImage, subtitle, slug, categoryId, articleTags])

  useEffect(() => {
    if (!articleIdRef.current) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(autoSave, 30000)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [autoSave])

  useEffect(() => {
    if (title || Object.keys(content).length > 0) {
      try {
        localStorage.setItem('diurna_editor_backup', JSON.stringify({ title, subtitle, content, categoryId, timestamp: Date.now() }))
      } catch {}
    }
  }, [title, subtitle, content, categoryId])

  // Create mode: allow dirty after mount
  useEffect(() => {
    if (!initialArticleId) {
      const t = setTimeout(() => { initialLoadDone.current = true }, 100)
      return () => clearTimeout(t)
    }
  }, [initialArticleId])

  // Unsaved changes: mark dirty only after initial load
  useEffect(() => {
    if (initialLoadDone.current) hasUnsavedChanges.current = true
  }, [title, subtitle, content, categoryId])

  // beforeunload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // Keyboard shortcuts (ref-based, no stale closure)
  const handleSaveFromRef = useCallback(async (status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED') => {
    const s = stateRef.current
    if (!s.title.trim()) return
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        title: s.title,
        content: s.content,
        categoryId: s.categoryId || undefined,
        status,
        metaTitle: s.metaTitle || undefined,
        metaDescription: s.metaDesc || undefined,
        featuredImage: s.featuredImage ?? null,
        subtitle: s.subtitle || undefined,
        slug: s.slug || undefined,
        tagIds: s.articleTags.map((t) => t.id),
      }
      if (status === 'SCHEDULED' && scheduledAt) body.scheduledAt = scheduledAt

      const id = articleIdRef.current
      if (id) {
        const res = await fetch(`/api/articles/${id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          const updated = await res.json() as { status?: string; versions?: Version[] }
          setPublishedStatus((status === 'SCHEDULED' ? 'SCHEDULED' : status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'))
          if (updated.versions) setVersions(updated.versions)
          hasUnsavedChanges.current = false
          toast.success(status === 'PUBLISHED' ? 'Objavljeno' : 'Sačuvano')
          if (s.sendNewsletter && status === 'PUBLISHED') {
            fetch('/api/newsletter/send', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ articleId: id }),
            }).catch(() => toast.error('Newsletter slanje neuspješno'))
          }
          if (status === 'PUBLISHED') {
            localStorage.removeItem('diurna_editor_backup')
            router.push('/articles')
            router.refresh()
          }
        } else if (res.status === 409) {
          toast.error('Slug je već zauzet — odaberi drugi.')
        } else {
          toast.error('Greška pri čuvanju')
        }
      } else {
        if (!siteId) { toast.error('Site nije učitan'); return }
        body.siteId = siteId
        body.aiGenerated = !!aiResult
        body.aiModel = aiResult?.model
        const res = await fetch('/api/articles', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          const article = await res.json() as { id?: string }
          const newId = article.id ?? null
          articleIdRef.current = newId
          setArticleId(newId ?? undefined)
          setPublishedStatus(status === 'SCHEDULED' ? 'SCHEDULED' : status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT')
          hasUnsavedChanges.current = false
          if (status === 'PUBLISHED') {
            localStorage.removeItem('diurna_editor_backup')
            router.push('/articles')
            router.refresh()
          } else {
            toast.success('Sačuvano')
            router.replace(`/editor/${newId}`, { scroll: false })
          }
          if (s.sendNewsletter && status === 'PUBLISHED' && newId) {
            fetch('/api/newsletter/send', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ articleId: newId }),
            }).catch(() => toast.error('Newsletter slanje neuspješno'))
          }
        } else {
          toast.error('Greška pri kreiranju')
        }
      }
    } catch {
      toast.error('Greška — pokušaj ponovo')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }, [siteId, aiResult, scheduledAt, router])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSaveFromRef('DRAFT')
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSaveFromRef('PUBLISHED')
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [handleSaveFromRef])

  function handleBack() {
    if (hasUnsavedChanges.current && !confirm('Imate nespačane izmjene. Napustiti stranicu?')) return
    router.push(articleIdRef.current ? '/articles' : '/newsroom')
  }

  function handleTitleChange(val: string) {
    setTitle(val)
    if (!slugEdited) setSlug(slugify(val))
  }

  function handleSave(status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED') {
    handleSaveFromRef(status)
  }

  async function handleDelete() {
    if (!articleIdRef.current) return
    if (!confirm('Obrisati ovaj članak?')) return
    try {
      const res = await fetch(`/api/articles/${articleIdRef.current}`, { method: 'DELETE' })
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

  function handleAIGenerate(result: { title?: string; content?: Record<string, unknown>; model?: string; tokensIn?: number; tokensOut?: number }) {
    if (result.title) setTitle(result.title)
    if (result.content) { setContent(result.content); setInitialContent(result.content) }
    if (result.model) setAiResult({ model: result.model, tokensIn: result.tokensIn, tokensOut: result.tokensOut })
  }

  const statusBadgeStyle = {
    DRAFT: { background: '#fef3c7', color: '#92400e' },
    PUBLISHED: { background: '#dcfce7', color: '#166534' },
    SCHEDULED: { background: '#dbeafe', color: '#1d4ed8' },
  }[publishedStatus]

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ height: 32, width: 200, background: 'var(--g100)', borderRadius: 'var(--rm)', animation: 'pulse 2s infinite' }} />
        <div style={{ height: 400, background: 'var(--g50)', borderRadius: 'var(--rl)', animation: 'pulse 2s infinite' }} />
      </div>
    )
  }

  return (
    <div className={`editor-layout ${isDark ? 'ed-dark' : 'ed-light'}`}>
      <div className="ed-top">
        <button className="ed-back" onClick={handleBack}>
          {articleIdRef.current ? '← Articles' : '← Back'}
        </button>
        <div className="ed-title-bar">
          {title || (articleIdRef.current ? 'Edit Article' : 'New Article')}
          {aiResult && <span className="badge-ai">AI</span>}
          <span
            className="badge-status"
            style={{
              fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
              fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em',
              ...statusBadgeStyle,
            }}
          >
            {publishedStatus.toLowerCase()}
          </span>
        </div>
        {articleIdRef.current && (
          <>
            <button className="ed-btn ed-btn-secondary" onClick={() => setShowHistory(true)}>🕐 History</button>
            <button className="ed-btn ed-btn-secondary" onClick={handleDelete}>🗑️</button>
          </>
        )}
        <button className="ed-btn ed-btn-secondary" onClick={() => handleSave('DRAFT')} disabled={saving || !title.trim()}>
          💾 {saving ? 'Saving...' : (articleIdRef.current ? 'Save' : 'Save Draft')}
        </button>
        <button className="ed-btn ed-btn-secondary" onClick={() => setShowSchedule(true)}>📅 Schedule</button>
        <button
          type="button"
          className="ed-btn ed-btn-secondary"
          onClick={toggleEditorTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{ minWidth: 36, padding: '6px 10px' }}
        >
          {isDark ? '□' : '■'}
        </button>
        <label className="ed-nl-check">
          <input type="checkbox" checked={sendNewsletter} onChange={(e) => setSendNewsletter(e.target.checked)} />
          <span>📧</span>
        </label>
        <button className="ed-btn ed-btn-primary" onClick={() => handleSave('PUBLISHED')} disabled={saving || !title.trim()}>
          ⚡ {saving ? 'Publishing...' : 'Publish'}
        </button>
      </div>

      {smartNotice && (
        <div className="ed-notice">
          <span>✨ {smartNotice}</span>
          <button onClick={() => setSmartNotice(null)}>×</button>
        </div>
      )}

      {showRecovery && recoveryData && (
        <div style={{
          background: '#fffbeb', borderBottom: '1px solid #fde68a',
          padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12,
          fontSize: 13, color: '#92400e',
        }}>
          <span>📝 You have an unsaved draft: <strong>{recoveryData.title}</strong></span>
          <button
            onClick={applyRecovery}
            style={{ padding: '4px 12px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
          >
            Restore
          </button>
          <button
            onClick={discardRecovery}
            style={{ padding: '4px 12px', background: 'none', border: '1px solid #fde68a', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 12, color: '#92400e' }}
          >
            Discard
          </button>
        </div>
      )}

      <div className="editor-main">
        <div className="editor-left">
          <div className="ed-form">
            <input type="text" className="ed-title-input" placeholder="Naslov članka..."
              value={title} onChange={(e) => handleTitleChange(e.target.value)} />
            <input type="text" className="ed-subtitle-input" placeholder="Podnaslov (opcionalno)"
              value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
            <FeaturedImagePicker value={featuredImage} onChange={setFeaturedImage} />
            <div className="ed-meta">
              <select className="ed-select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.icon ? `${cat.icon} ` : ''}{cat.name}</option>
                ))}
              </select>
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
                      <button type="button" className="ed-tag-remove" onClick={() => setArticleTags((prev) => prev.filter((p) => p.id !== t.id))}>×</button>
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
            <TiptapEditor
              content={initialContent && Object.keys(initialContent).length > 0 ? initialContent : undefined}
              onChange={(json) => setContent(json)}
              onEditorReady={(e) => { editorRef.current = e }}
              placeholder="Start writing your article..."
            />
          </div>

          <div className="ed-bottom">
            <button className="ed-seo-toggle" onClick={() => setShowSEO(!showSEO)}>
              {showSEO ? '▾' : '▸'} SEO Settings
            </button>
            {showSEO && (
              <div className="ed-seo-panel">
                <div className="ed-serp-preview">
                  <div className="ed-serp-title">{metaTitle || title || 'Article Title'}</div>
                  <div className="ed-serp-url">sportba.ba › vijesti › {slug || 'article-slug'}</div>
                  <div className="ed-serp-desc">{metaDesc || subtitle || 'Article description will appear here...'}</div>
                </div>
                <div className="ed-seo-field">
                  <label>Meta Title</label>
                  <input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder={title} maxLength={60} />
                  <span className="ed-seo-count">{(metaTitle || title).length}/60</span>
                </div>
                <div className="ed-seo-field">
                  <label>Meta Description</label>
                  <textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} placeholder="Article description for search engines..." maxLength={155} rows={2} />
                  <span className="ed-seo-count">{metaDesc.length}/155</span>
                </div>
                <div className="ed-seo-field">
                  <label>Slug</label>
                  <input type="text" value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugEdited(true) }} className="ed-slug-mono" />
                </div>
              </div>
            )}
          </div>

          {aiResult && (
            <div className="ai-result-info">
              <span>🤖 {aiResult.model}</span>
              <span>· {aiResult.tokensIn}→{aiResult.tokensOut} tokens</span>
            </div>
          )}
        </div>

        {showAI && (
          <div className="editor-right">
            <AISidebar
              editor={editorRef.current as import('@tiptap/react').Editor | null}
              onGenerate={handleAIGenerate}
              prefilledPrompt={prefilledPrompt}
              autoGenerate={autoGenerate}
            />
          </div>
        )}
      </div>

      <button className="ai-toggle-btn" onClick={() => setShowAI(!showAI)} title="Toggle AI Co-Pilot">
        {showAI ? '✕' : '🤖'} {showAI ? '' : 'AI'}
      </button>

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
