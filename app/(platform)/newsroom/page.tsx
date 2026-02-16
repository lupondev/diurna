'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import './newsroom.css'

type TagInfo = { tag: { id: string; name: string } }
type Article = {
  id: string
  title: string
  slug: string
  status: string
  aiGenerated: boolean
  updatedAt: string
  createdAt: string
  publishedAt: string | null
  excerpt?: string | null
  content?: Record<string, unknown>
  category?: { name: string } | null
  tags?: TagInfo[]
  site?: { name: string } | null
}

function getTimeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getScore(a: Article) {
  let score = 50
  if (a.aiGenerated) score += 30
  if (a.tags && a.tags.length > 0) score += Math.min(a.tags.length * 3, 10)
  if (a.excerpt) score += 5
  if (a.category) score += 5
  return Math.min(score, 99)
}

function getScoreClass(score: number) {
  if (score >= 85) return 'hot'
  if (score >= 65) return 'warm'
  return 'cool'
}

function extractExcerpt(article: Article): string {
  if (article.excerpt) return article.excerpt
  const content = article.content as Record<string, unknown> | undefined
  if (content && Array.isArray((content as { content?: unknown[] }).content)) {
    for (const node of (content as { content: Array<{ type: string; content?: Array<{ text?: string }> }> }).content) {
      if (node.type === 'paragraph' && node.content) {
        return node.content.map((c) => c.text || '').join('').slice(0, 200)
      }
    }
  }
  return 'No preview available'
}

const categoryColors: Record<string, string> = {
  'Sport': 'cat-green', 'Sports': 'cat-green', 'Football': 'cat-green',
  'Politics': 'cat-purple', 'Tech': 'cat-blue', 'Technology': 'cat-blue',
  'Business': 'cat-gold', 'Entertainment': 'cat-coral', 'Show': 'cat-coral',
  'Breaking': 'cat-breaking',
}

export default function NewsroomPage() {
  const router = useRouter()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [tagFilter, setTagFilter] = useState('')
  const [allTags, setAllTags] = useState<{ id: string; name: string }[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewTab, setPreviewTab] = useState<'preview' | 'edit' | 'seo'>('preview')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [sortBy, setSortBy] = useState('latest')
  const feedRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/articles')
      .then((r) => r.json())
      .then((data) => {
        setArticles(data)
        if (data.length > 0) setSelectedId(data[0].id)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    fetch('/api/tags')
      .then((r) => r.json())
      .then((data) =>
        setAllTags(data.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })))
      )
      .catch(() => {})
  }, [])

  const filteredArticles = articles
    .filter((a) => {
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Queue' && (a.status === 'DRAFT' || a.status === 'IN_REVIEW')) ||
        (statusFilter === 'Published' && a.status === 'PUBLISHED') ||
        (statusFilter === 'Scheduled' && a.status === 'SCHEDULED') ||
        (statusFilter === 'AI' && a.aiGenerated)
      const matchesSearch = !search || a.title.toLowerCase().includes(search.toLowerCase())
      const matchesTag = !tagFilter || a.tags?.some((t) => t.tag.id === tagFilter)
      return matchesStatus && matchesSearch && matchesTag
    })
    .sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

  const selectedArticle = articles.find((a) => a.id === selectedId) || null

  const stats = {
    queue: articles.filter((a) => a.status === 'DRAFT' || a.status === 'IN_REVIEW').length,
    published: articles.filter((a) => a.status === 'PUBLISHED').length,
    scheduled: articles.filter((a) => a.status === 'SCHEDULED').length,
    ai: articles.filter((a) => a.aiGenerated).length,
    total: articles.length,
  }

  const publishArticle = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PUBLISHED' }),
      })
      if (res.ok) {
        setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'PUBLISHED' } : a)))
      }
    } catch (e) {
      console.error('Publish error:', e)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case '/':
          e.preventDefault()
          searchRef.current?.focus()
          break
        case 'j':
        case 'ArrowDown': {
          e.preventDefault()
          const idx = filteredArticles.findIndex((a) => a.id === selectedId)
          const next = filteredArticles[Math.min(idx + 1, filteredArticles.length - 1)]
          if (next) {
            setSelectedId(next.id)
            document.querySelector(`[data-id="${next.id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          }
          break
        }
        case 'k':
        case 'ArrowUp': {
          e.preventDefault()
          const idx = filteredArticles.findIndex((a) => a.id === selectedId)
          const prev = filteredArticles[Math.max(idx - 1, 0)]
          if (prev) {
            setSelectedId(prev.id)
            document.querySelector(`[data-id="${prev.id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          }
          break
        }
        case 'p': {
          e.preventDefault()
          if (selectedArticle && selectedArticle.status !== 'PUBLISHED') {
            publishArticle(selectedArticle.id)
          }
          break
        }
        case 'e': {
          e.preventDefault()
          if (selectedArticle) router.push(`/editor/${selectedArticle.id}`)
          break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [filteredArticles, selectedId, selectedArticle, publishArticle, router])

  // Ticker items from articles
  const tickerItems = articles.slice(0, 8).map((a) => ({
    title: a.title.length > 45 ? a.title.slice(0, 45) + '…' : a.title,
    tag: a.tags?.[0]?.tag.name,
    isAi: a.aiGenerated,
  }))

  const chipFilters = [
    { key: 'All', label: 'All' },
    { key: 'Queue', label: '📥 Queue' },
    { key: 'Published', label: '✓ Published' },
    { key: 'Scheduled', label: '📅 Scheduled' },
    { key: 'AI', label: '🤖 AI' },
  ]

  return (
    <div className="nr5">
      {/* Top Header */}
      <div className="nr5-head">
        <div className="nr5-head-left">
          <h1 className="nr5-title">Newsroom</h1>
          <span className="nr5-live">LIVE</span>
        </div>
        <div className="nr5-search-box">
          <span className="nr5-search-icon">🔍</span>
          <input
            ref={searchRef}
            type="text"
            className="nr5-search-input"
            placeholder="Search articles, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="nr5-search-shortcut">/</span>
        </div>
        <div className="nr5-head-actions">
          <Link href="/editor" className="nr5-btn nr5-btn-primary">✨ New Article</Link>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="nr5-stats">
        <div className={`nr5-stat${statusFilter === 'Queue' ? ' active' : ''}`} onClick={() => setStatusFilter('Queue')}>
          <div className="nr5-stat-val coral">{stats.queue}</div>
          <div className="nr5-stat-label">In Queue</div>
          {stats.queue > 0 && <div className="nr5-stat-change up">↑ {stats.queue} pending</div>}
        </div>
        <div className={`nr5-stat${statusFilter === 'Published' ? ' active' : ''}`} onClick={() => setStatusFilter('Published')}>
          <div className="nr5-stat-val green">{stats.published}</div>
          <div className="nr5-stat-label">Published</div>
        </div>
        <div className={`nr5-stat${statusFilter === 'Scheduled' ? ' active' : ''}`} onClick={() => setStatusFilter('Scheduled')}>
          <div className="nr5-stat-val blue">{stats.scheduled}</div>
          <div className="nr5-stat-label">Scheduled</div>
        </div>
        <div className={`nr5-stat${statusFilter === 'AI' ? ' active' : ''}`} onClick={() => setStatusFilter('AI')}>
          <div className="nr5-stat-val gold">{stats.ai}</div>
          <div className="nr5-stat-label">AI Generated</div>
        </div>
        <div className={`nr5-stat${statusFilter === 'All' ? ' active' : ''}`} onClick={() => setStatusFilter('All')}>
          <div className="nr5-stat-val mint">{stats.total}</div>
          <div className="nr5-stat-label">Total Articles</div>
        </div>
      </div>

      {/* Ticker */}
      {tickerItems.length > 0 && (
        <div className="nr5-ticker">
          <div className="nr5-ticker-label">🔥 HOT</div>
          <div className="nr5-ticker-content">
            <div className="nr5-ticker-track">
              {[...tickerItems, ...tickerItems].map((item, i) => (
                <div key={i} className="nr5-ticker-item">
                  {item.title}
                  {item.tag && <span className="nr5-ticker-tag">{item.tag}</span>}
                  {item.isAi && i < tickerItems.length && <span className="nr5-ticker-new">AI</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="nr5-filters">
        {chipFilters.map((f) => (
          <button
            key={f.key}
            className={`nr5-chip${statusFilter === f.key ? ' active' : ''}`}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
        <div className="nr5-filter-divider" />
        {allTags.length > 0 && (
          <select className="nr5-sort" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
            <option value="">All Tags</option>
            {allTags.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
        <div className="nr5-filter-right">
          <div className="nr5-view-toggle">
            <button className={`nr5-view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')}>
              ☰ List
            </button>
            <button className={`nr5-view-btn${viewMode === 'calendar' ? ' active' : ''}`} onClick={() => setViewMode('calendar')}>
              📅 Calendar
            </button>
          </div>
          <span className="nr5-count">{filteredArticles.length} articles</span>
          <select className="nr5-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="latest">Latest ↓</option>
            <option value="oldest">Oldest ↓</option>
          </select>
        </div>
      </div>

      {/* Content Area: Feed + Preview */}
      <div className="nr5-content">
        <div className="nr5-feed" ref={feedRef}>
          {loading ? (
            <div className="nr5-loading">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="nr5-skeleton" />
              ))}
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="nr5-empty">
              <div className="nr5-empty-icon">📝</div>
              <div className="nr5-empty-title">
                {articles.length === 0 ? 'No articles yet' : 'No matching articles'}
              </div>
              <div className="nr5-empty-desc">
                {articles.length === 0 ? 'Create your first article with AI or manually' : 'Try different filters or search'}
              </div>
              {articles.length === 0 && (
                <Link href="/editor" className="nr5-create-btn">✨ Create Article</Link>
              )}
            </div>
          ) : (
            filteredArticles.map((article, idx) => {
              const score = getScore(article)
              const scoreCls = getScoreClass(score)
              const isSelected = selectedId === article.id
              const isPublished = article.status === 'PUBLISHED'
              const catCls = article.category ? (categoryColors[article.category.name] || 'cat-default') : 'cat-default'

              return (
                <div
                  key={article.id}
                  className={`nr5-article${isSelected ? ' selected' : ''}${isPublished ? ' published' : ''}`}
                  onClick={() => setSelectedId(article.id)}
                  style={{ animationDelay: `${idx * 0.02}s` }}
                  data-id={article.id}
                >
                  {article.aiGenerated && score >= 85 && (
                    <div className="nr5-trending">🤖 AI GENERATED</div>
                  )}
                  <div className="nr5-article-inner">
                    <div className="nr5-article-body">
                      <div className="nr5-article-meta">
                        <span className="nr5-article-source">{article.site?.name || 'Newsroom'}</span>
                        {article.category && (
                          <span className={`nr5-article-cat ${catCls}`}>{article.category.name}</span>
                        )}
                        <span className="nr5-article-time">{getTimeAgo(article.updatedAt)}</span>
                      </div>
                      <h2 className="nr5-article-title">{article.title}</h2>
                      <div className="nr5-article-tags">
                        {article.aiGenerated && <span className="nr5-tag ai">🤖 AI {score}%</span>}
                        {article.tags?.slice(0, 3).map((t) => (
                          <span key={t.tag.id} className="nr5-tag source">{t.tag.name}</span>
                        ))}
                        <span className={`nr5-tag status-${article.status.toLowerCase()}`}>
                          {article.status === 'DRAFT' ? '📝 Draft' : article.status === 'PUBLISHED' ? '✓ Live' : article.status === 'SCHEDULED' ? '📅 Scheduled' : '👁️ Review'}
                        </span>
                      </div>
                    </div>
                    <div className="nr5-article-side">
                      <div className={`nr5-score ${isPublished ? 'done' : scoreCls}`}>
                        {isPublished ? '—' : score}
                      </div>
                      {isPublished ? (
                        <button className="nr5-pub-btn done">✓ Live</button>
                      ) : article.status === 'SCHEDULED' ? (
                        <button className="nr5-pub-btn scheduled">Scheduled</button>
                      ) : (
                        <button
                          className="nr5-pub-btn ready"
                          onClick={(e) => { e.stopPropagation(); publishArticle(article.id) }}
                        >
                          Publish
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Preview Panel */}
        <aside className="nr5-preview">
          <div className="nr5-preview-head">
            <span className="nr5-preview-label">Article Preview</span>
            <div className="nr5-preview-tabs">
              {(['preview', 'edit', 'seo'] as const).map((tab) => (
                <button
                  key={tab}
                  className={`nr5-ptab${previewTab === tab ? ' active' : ''}`}
                  onClick={() => setPreviewTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {selectedArticle ? (
            <>
              <div className="nr5-preview-body">
                {previewTab === 'preview' && (
                  <>
                    <div className="nr5-ai-tags">
                      {selectedArticle.aiGenerated && <span className="nr5-aitag generated">✨ AI Generated</span>}
                      <span className="nr5-aitag quality">✓ {selectedArticle.status === 'PUBLISHED' ? 'Published' : selectedArticle.status === 'DRAFT' ? 'Draft' : selectedArticle.status}</span>
                      {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                        <span className="nr5-aitag seo">🏷️ {selectedArticle.tags.length} tags</span>
                      )}
                    </div>
                    {selectedArticle.category && (
                      <div className="nr5-pv-category">{selectedArticle.category.name}</div>
                    )}
                    <h1 className="nr5-pv-headline">{selectedArticle.title}</h1>
                    <p className="nr5-pv-lead">{extractExcerpt(selectedArticle)}</p>
                    <div className="nr5-pv-image">📰</div>
                    {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                      <div className="nr5-pv-tags">
                        <div className="nr5-pv-tags-title">Tags</div>
                        {selectedArticle.tags.map((t) => (
                          <span key={t.tag.id} className="nr5-pv-tag">{t.tag.name}</span>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {previewTab === 'edit' && (
                  <div className="nr5-pv-edit">
                    <div className="nr5-pv-edit-rows">
                      <div className="nr5-pv-edit-row">
                        <span className="nr5-pv-edit-lbl">Status</span>
                        <span className="nr5-pv-edit-val">{selectedArticle.status}</span>
                      </div>
                      <div className="nr5-pv-edit-row">
                        <span className="nr5-pv-edit-lbl">Slug</span>
                        <span className="nr5-pv-edit-val mono">{selectedArticle.slug || '—'}</span>
                      </div>
                      <div className="nr5-pv-edit-row">
                        <span className="nr5-pv-edit-lbl">Updated</span>
                        <span className="nr5-pv-edit-val">{new Date(selectedArticle.updatedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="nr5-pv-edit-row">
                        <span className="nr5-pv-edit-lbl">AI Generated</span>
                        <span className="nr5-pv-edit-val">{selectedArticle.aiGenerated ? 'Yes' : 'No'}</span>
                      </div>
                      {selectedArticle.category && (
                        <div className="nr5-pv-edit-row">
                          <span className="nr5-pv-edit-lbl">Category</span>
                          <span className="nr5-pv-edit-val">{selectedArticle.category.name}</span>
                        </div>
                      )}
                    </div>
                    <Link href={`/editor/${selectedArticle.id}`} className="nr5-edit-full">
                      ✏️ Open Full Editor
                    </Link>
                  </div>
                )}
                {previewTab === 'seo' && (
                  <div className="nr5-pv-seo">
                    <div className="nr5-seo-ring">
                      <div className={`nr5-seo-circle ${getScoreClass(getScore(selectedArticle))}`}>
                        {getScore(selectedArticle)}
                      </div>
                      <div className="nr5-seo-ring-label">Content Score</div>
                    </div>
                    <div className="nr5-seo-checks">
                      <div className={`nr5-seo-check ${selectedArticle.title.length > 10 ? 'pass' : 'fail'}`}>
                        {selectedArticle.title.length > 10 ? '✓' : '✕'} Title length ({selectedArticle.title.length} chars)
                      </div>
                      <div className={`nr5-seo-check ${selectedArticle.slug ? 'pass' : 'fail'}`}>
                        {selectedArticle.slug ? '✓' : '✕'} URL slug configured
                      </div>
                      <div className={`nr5-seo-check ${selectedArticle.excerpt ? 'pass' : 'fail'}`}>
                        {selectedArticle.excerpt ? '✓' : '✕'} Meta description
                      </div>
                      <div className={`nr5-seo-check ${selectedArticle.category ? 'pass' : 'fail'}`}>
                        {selectedArticle.category ? '✓' : '✕'} Category assigned
                      </div>
                      <div className={`nr5-seo-check ${selectedArticle.tags && selectedArticle.tags.length > 0 ? 'pass' : 'fail'}`}>
                        {selectedArticle.tags && selectedArticle.tags.length > 0 ? '✓' : '✕'} Tags added
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="nr5-preview-actions">
                {selectedArticle.status !== 'PUBLISHED' ? (
                  <>
                    <button className="nr5-pact publish" onClick={() => publishArticle(selectedArticle.id)}>⚡ Publish Now</button>
                    <button className="nr5-pact schedule" onClick={() => router.push(`/editor/${selectedArticle.id}`)}>🕐 Schedule</button>
                  </>
                ) : (
                  <button className="nr5-pact publish" disabled>✓ Published</button>
                )}
                <button className="nr5-pact edit" onClick={() => router.push(`/editor/${selectedArticle.id}`)}>✏️ Edit</button>
              </div>
            </>
          ) : (
            <div className="nr5-preview-body">
              <div className="nr5-preview-empty">
                <div className="nr5-preview-empty-icon">📰</div>
                <p>Select an article to preview</p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Distribution Bar */}
      <div className="nr5-dist">
        <span className="nr5-dist-label">Distribute to:</span>
        <span className="nr5-dist-ch active">✓ Website</span>
        <span className="nr5-dist-ch active">✓ RSS Feed</span>
        <span className="nr5-dist-ch pending">⏳ Newsletter</span>
        <span className="nr5-dist-ch off">○ Social</span>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="nr5-shortcuts">
        <div className="nr5-sc"><kbd>J</kbd><kbd>K</kbd> Navigate</div>
        <div className="nr5-sc"><kbd>P</kbd> Publish</div>
        <div className="nr5-sc"><kbd>/</kbd> Search</div>
        <div className="nr5-sc"><kbd>E</kbd> Edit</div>
      </div>
    </div>
  )
}
