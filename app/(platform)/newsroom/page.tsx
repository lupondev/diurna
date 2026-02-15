'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import './newsroom.css'

type Article = {
  id: string
  title: string
  status: string
  aiGenerated: boolean
  updatedAt: string
  category?: { name: string } | null
}

const getStatusInfo = (status: string, aiGenerated: boolean) => {
  if (aiGenerated) return { cls: 'ai', icon: '🤖', badge: 'ai', label: 'AI Generated' }
  switch (status) {
    case 'PUBLISHED': return { cls: 'pub', icon: '✓', badge: 'pub', label: 'Published' }
    case 'SCHEDULED': return { cls: 'sch', icon: '⏰', badge: 'sch', label: 'Scheduled' }
    case 'IN_REVIEW': return { cls: 'rev', icon: '👁️', badge: 'rev', label: 'In Review' }
    default: return { cls: 'dra', icon: '📝', badge: 'dra', label: 'Draft' }
  }
}

export default function NewsroomPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)

  useEffect(() => {
    fetch('/api/articles')
      .then((r) => r.json())
      .then((data) => { setArticles(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filteredArticles = articles.filter((a) => {
    const matchesFilter = filter === 'All'
      || (filter === 'Published' && a.status === 'PUBLISHED')
      || (filter === 'Draft' && a.status === 'DRAFT')
      || (filter === 'Scheduled' && a.status === 'SCHEDULED')
      || (filter === 'In Review' && a.status === 'IN_REVIEW')
    const matchesSearch = !search || a.title.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filteredArticles.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredArticles.map((a) => a.id)))
    }
  }

  async function bulkAction(action: 'IN_REVIEW' | 'PUBLISHED' | 'DELETE') {
    if (selected.size === 0) return
    setBulkLoading(true)
    const ids = Array.from(selected)

    if (action === 'DELETE') {
      await Promise.all(ids.map((id) =>
        fetch(`/api/articles/${id}`, { method: 'DELETE' })
      ))
      setArticles((prev) => prev.filter((a) => !ids.includes(a.id)))
    } else {
      await Promise.all(ids.map((id) =>
        fetch(`/api/articles/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: action }),
        })
      ))
      setArticles((prev) =>
        prev.map((a) => ids.includes(a.id) ? { ...a, status: action } : a)
      )
    }
    setSelected(new Set())
    setBulkLoading(false)
  }

  const stats = {
    total: articles.length,
    published: articles.filter((a) => a.status === 'PUBLISHED').length,
    drafts: articles.filter((a) => a.status === 'DRAFT').length,
    ai: articles.filter((a) => a.aiGenerated).length,
  }

  const statCards = [
    { label: 'Total Articles', value: stats.total, icon: '📰', cls: 'all' },
    { label: 'Published', value: stats.published, icon: '✓', cls: 'pub' },
    { label: 'Drafts', value: stats.drafts, icon: '📝', cls: 'dra' },
    { label: 'AI Generated', value: stats.ai, icon: '🤖', cls: 'ai' },
  ]

  const filters = ['All', 'Published', 'Draft', 'Scheduled', 'In Review']

  return (
    <div className="nr-page">
      {/* Header */}
      <div className="nr-header">
        <div className="nr-header-left">
          <h1>Newsroom</h1>
          <p>{articles.length} article{articles.length !== 1 ? 's' : ''} in your newsroom</p>
        </div>
      </div>

      {/* Stats */}
      <div className="nr-stats">
        {statCards.map((s) => (
          <div key={s.label} className="nr-stat">
            <div className={`nr-stat-icon ${s.cls}`}>{s.icon}</div>
            <div>
              <div className="nr-stat-val">{s.value}</div>
              <div className="nr-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="nr-filters">
        {filters.map((f) => (
          <span key={f} className={`nr-chip${filter === f ? ' act' : ''}`} onClick={() => setFilter(f)}>{f}</span>
        ))}
        <input type="text" className="nr-search" placeholder="Search articles..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="nr-bulk">
          <span className="nr-bulk-count">{selected.size} selected</span>
          <button className="nr-bulk-btn review" onClick={() => bulkAction('IN_REVIEW')} disabled={bulkLoading}>
            👁️ Move to Review
          </button>
          <button className="nr-bulk-btn publish" onClick={() => bulkAction('PUBLISHED')} disabled={bulkLoading}>
            ⚡ Publish
          </button>
          <button className="nr-bulk-btn delete" onClick={() => bulkAction('DELETE')} disabled={bulkLoading}>
            🗑️ Delete
          </button>
          <button className="nr-bulk-clear" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {/* Articles */}
      {loading ? (
        <div className="nr-card">
          <div style={{ padding: '60px 18px', textAlign: 'center', fontSize: 13, color: 'var(--g400)' }}>
            Loading articles...
          </div>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="nr-card">
          <div className="nr-empty">
            <div className="nr-empty-icon">📝</div>
            <p className="nr-empty-title">{articles.length === 0 ? 'No articles yet' : 'No matching articles'}</p>
            <p className="nr-empty-desc">
              {articles.length === 0
                ? 'Create your first article with AI or write it manually'
                : 'Try a different filter or search term'}
            </p>
            {articles.length === 0 && (
              <Link href="/editor" className="nr-new-btn">✨ Create First Article</Link>
            )}
          </div>
        </div>
      ) : (
        <div className="nr-card">
          <div className="nr-card-head">
            <label className="nr-select-all" onClick={toggleAll}>
              <span className={`nr-checkbox${selected.size === filteredArticles.length ? ' checked' : ''}`}>
                {selected.size === filteredArticles.length ? '✓' : ''}
              </span>
              <span className="nr-card-title">All Articles</span>
            </label>
            <span className="nr-card-count">{filteredArticles.length} items</span>
          </div>
          {filteredArticles.map((article) => {
            const si = getStatusInfo(article.status, article.aiGenerated)
            const isSelected = selected.has(article.id)
            return (
              <div key={article.id} className={`nr-art${isSelected ? ' selected' : ''}`}>
                <span
                  className={`nr-checkbox${isSelected ? ' checked' : ''}`}
                  onClick={(e) => { e.preventDefault(); toggleSelect(article.id) }}
                >
                  {isSelected ? '✓' : ''}
                </span>
                <Link href={`/editor/${article.id}`} className="nr-art-link">
                  <div className={`nr-art-thumb ${si.cls}`}>{si.icon}</div>
                  <div className="nr-art-info">
                    <div className="nr-art-title">{article.title}</div>
                    <div className="nr-art-meta">
                      <span className={`nr-art-badge ${si.badge}`}>{si.label}</span>
                      <span className="nr-art-cat">{article.category?.name || 'Uncategorized'}</span>
                      {article.aiGenerated && <span className="nr-art-badge ai">🤖 AI</span>}
                    </div>
                  </div>
                  <div className="nr-art-right">
                    <span className="nr-art-date">
                      {new Date(article.updatedAt).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                    <span className="nr-art-edit">Edit →</span>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
