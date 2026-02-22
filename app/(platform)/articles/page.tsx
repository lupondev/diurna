'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Article = {
  id: string
  title: string
  slug: string
  status: string
  createdAt: string
  publishedAt: string | null
  category: { name: string } | null
  site: { name: string } | null
  aiGenerated: boolean
}

type StatusFilter = 'ALL' | 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'SCHEDULED'

export default function ArticlesPage() {
  const router = useRouter()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('ALL')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Bug C fix: pass filter & search to server so it applies across ALL articles, not just the current page
  const fetchArticles = useCallback((p: number, status: StatusFilter, q: string) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: '20' })
    if (status !== 'ALL') params.set('status', status)
    if (q.trim()) params.set('q', q.trim())
    fetch(`/api/articles?${params}`)
      .then((r) => r.json() as Promise<{ articles?: Article[]; pagination?: { totalPages?: number; total?: number } }>)
      .then((data) => {
        setArticles(data.articles || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setTotal(data.pagination?.total || 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchArticles(page, filter, search)
  }, [page, filter, search, fetchArticles])

  function handleFilterChange(f: StatusFilter) {
    setFilter(f)
    setPage(1)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  async function quickAction(id: string, action: 'publish' | 'unpublish' | 'delete') {
    if (action === 'delete' && !confirm('Delete this article?')) return
    try {
      if (action === 'delete') {
        await fetch(`/api/articles/${id}`, { method: 'DELETE' })
      } else {
        await fetch(`/api/articles/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: action === 'publish' ? 'PUBLISHED' : 'DRAFT' }),
        })
      }
      fetchArticles(page, filter, search)
    } catch (e) {
      console.error('Action failed', e)
    }
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      DRAFT: { bg: '#f1f5f9', color: '#64748b' },
      IN_REVIEW: { bg: '#fef3c7', color: '#92400e' },
      SCHEDULED: { bg: '#dbeafe', color: '#1d4ed8' },
      PUBLISHED: { bg: '#dcfce7', color: '#166534' },
      ARCHIVED: { bg: '#f3f4f6', color: '#9ca3af' },
    }
    const c = colors[status] || colors.DRAFT
    return (
      <span style={{
        fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
        background: c.bg, color: c.color, textTransform: 'uppercase', letterSpacing: 0.5,
      }}>
        {status.replace('_', ' ')}
      </span>
    )
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>Articles</h1>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
            {total > 0 ? `${total} article${total !== 1 ? 's' : ''} total` : 'Manage all your articles'}
          </p>
        </div>
        <Link
          href="/editor"
          style={{
            background: '#f97316', color: '#fff', border: 'none', borderRadius: 8,
            padding: '9px 18px', fontSize: 12, fontWeight: 700, textDecoration: 'none',
          }}
        >
          + New Article
        </Link>
      </div>

      {/* Bug F fix: search bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search articles..."
          style={{
            flex: 1, padding: '7px 12px', borderRadius: 6, border: '1px solid #e2e8f0',
            fontSize: 12, outline: 'none', color: '#0f172a',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '7px 14px', borderRadius: 6, border: 'none',
            background: '#f1f5f9', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Search
        </button>
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
            style={{
              padding: '7px 12px', borderRadius: 6, border: '1px solid #e2e8f0',
              background: '#fff', color: '#94a3b8', fontSize: 12, cursor: 'pointer',
            }}
          >
            Clear
          </button>
        )}
      </form>

      {/* Bug C fix: filter buttons now trigger server-side filtering */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['ALL', 'DRAFT', 'IN_REVIEW', 'PUBLISHED', 'SCHEDULED'] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            style={{
              padding: '6px 14px', borderRadius: 6, border: '1px solid',
              borderColor: filter === f ? '#f97316' : '#e2e8f0',
              background: filter === f ? '#fff7ed' : '#fff',
              color: filter === f ? '#f97316' : '#64748b',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {f === 'ALL' ? 'All' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ height: 56, background: '#f8fafc', borderRadius: 8, animation: 'pulse 2s infinite' }} />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', fontSize: 13 }}>
          {search ? `No articles matching "${search}".` : 'No articles found.'}{' '}
          <Link href="/editor" style={{ color: '#f97316' }}>Create your first article.</Link>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Title</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Category</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Created</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Published</th>
                <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr
                  key={a.id}
                  style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer', transition: 'background .1s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#fafbfc' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
                  onClick={() => router.push(`/editor/${a.id}`)}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f172a', maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.title}
                    {a.aiGenerated && <span style={{ fontSize: 9, background: '#ede9fe', color: '#6d28d9', padding: '2px 5px', borderRadius: 4, marginLeft: 6, fontWeight: 700 }}>AI</span>}
                  </td>
                  <td style={{ padding: '12px 12px' }}>{statusBadge(a.status)}</td>
                  <td style={{ padding: '12px 12px', color: '#64748b', fontSize: 12 }}>{a.category?.name || '-'}</td>
                  <td style={{ padding: '12px 12px', color: '#94a3b8', fontSize: 11, fontFamily: 'var(--mono)' }}>
                    {new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </td>
                  <td style={{ padding: '12px 12px', color: '#94a3b8', fontSize: 11, fontFamily: 'var(--mono)' }}>
                    {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '-'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      {a.status !== 'PUBLISHED' && (
                        <button
                          onClick={() => quickAction(a.id, 'publish')}
                          style={{ fontSize: 10, padding: '4px 8px', borderRadius: 4, border: '1px solid #dcfce7', background: '#f0fdf4', color: '#166534', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Publish
                        </button>
                      )}
                      {a.status === 'PUBLISHED' && (
                        <button
                          onClick={() => quickAction(a.id, 'unpublish')}
                          style={{ fontSize: 10, padding: '4px 8px', borderRadius: 4, border: '1px solid #fef3c7', background: '#fffbeb', color: '#92400e', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Unpublish
                        </button>
                      )}
                      <button
                        onClick={() => quickAction(a.id, 'delete')}
                        style={{ fontSize: 10, padding: '4px 8px', borderRadius: 4, border: '1px solid #fee2e2', background: '#fef2f2', color: '#991b1b', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.4 : 1 }}
          >
            Prev
          </button>
          <span style={{ padding: '6px 12px', fontSize: 12, color: '#64748b' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.4 : 1 }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
