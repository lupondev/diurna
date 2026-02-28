'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { SUPPORTED_LANGUAGES } from '@/lib/languages'

const TIMEZONES = [
  { value: 'Europe/Sarajevo', label: 'Europe/Sarajevo (CET)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
]

type SiteRow = {
  id: string
  name: string
  slug: string
  domain: string | null
  language: string
  timezone: string
  theme: string
  createdAt: string
  articleCount: number
  deletedAt?: string | null
}

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function SitesTab() {
  const [sites, setSites] = useState<SiteRow[]>([])
  const [currentSiteId, setCurrentSiteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [formDomain, setFormDomain] = useState('')
  const [formLanguage, setFormLanguage] = useState('bs')
  const [formTimezone, setFormTimezone] = useState('Europe/Sarajevo')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [showDeleted, setShowDeleted] = useState(false)
  const [deletedSites, setDeletedSites] = useState<SiteRow[]>([])
  const [loadingDeleted, setLoadingDeleted] = useState(false)
  const [recoveringId, setRecoveringId] = useState<string | null>(null)

  const loadSites = useCallback(async (includeDeleted = false) => {
    setLoading(true)
    setError(null)
    try {
      const [sitesRes, currentRes] = await Promise.all([
        fetch(includeDeleted ? '/api/sites?includeDeleted=true' : '/api/sites'),
        fetch('/api/site'),
      ])
      if (!sitesRes.ok) throw new Error('Failed to load sites')
      if (currentRes.ok) {
        const current = (await currentRes.json()) as { id?: string }
        setCurrentSiteId(current.id ?? null)
      } else {
        setCurrentSiteId(null)
        // Don't treat /api/site failure as an error — 404 just means no active badge
      }
      const data = (await sitesRes.json()) as { sites?: SiteRow[] }
      const list = data.sites ?? []
      setSites(includeDeleted ? list.filter((s) => s.deletedAt === null) : list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sites')
      setSites([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSites()
  }, [loadSites])

  useEffect(() => {
    if (showDeleted) {
      setLoadingDeleted(true)
      fetch('/api/sites?includeDeleted=true')
        .then((r) => r.json() as Promise<{ sites?: SiteRow[] }>)
        .then((data) => {
          const list = data.sites ?? []
          setDeletedSites(list.filter((s) => s.deletedAt !== null))
        })
        .catch(() => setDeletedSites([]))
        .finally(() => setLoadingDeleted(false))
    }
  }, [showDeleted])

  const handleRecover = async (siteId: string) => {
    setRecoveringId(siteId)
    setError(null)
    try {
      const res = await fetch('/api/admin/recover-sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
        credentials: 'include',
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error || 'Failed to recover site')
        return
      }
      setDeletedSites((prev) => prev.filter((s) => s.id !== siteId))
      loadSites()
      toast.success('Site recovered successfully')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to recover site')
    } finally {
      setRecoveringId(null)
    }
  }

  const handleAddClick = () => {
    setShowForm(true)
    setFormName('')
    setFormSlug('')
    setFormDomain('')
    setFormLanguage('bs')
    setFormTimezone('Europe/Sarajevo')
    setError(null)
  }

  const handleNameChange = (name: string) => {
    setFormName(name)
    setFormSlug(slugFromName(name))
  }

  const handleCreate = async () => {
    if (!formName.trim() || !formSlug.trim()) {
      setError('Name and slug are required')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          slug: formSlug.trim(),
          domain: formDomain.trim() || undefined,
          language: formLanguage,
          timezone: formTimezone,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error || 'Failed to create site')
        return
      }
      setShowForm(false)
      loadSites()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create site')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (siteId: string) => {
    if (sites.length <= 1) return
    setError(null)
    try {
      const res = await fetch('/api/sites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error || 'Failed to delete site')
        setDeleteConfirmId(null)
        return
      }
      setDeleteConfirmId(null)
      const wasCurrentSite = currentSiteId === siteId
      const remaining = sites.filter((s) => s.id !== siteId)
      setSites(remaining)
      if (wasCurrentSite && remaining.length > 0) {
        setCurrentSiteId(remaining[0].id)
      }
      toast.success('Site deleted successfully')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete site')
      setDeleteConfirmId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="st-section">
      <div className="st-section-head">
        <div className="st-section-title">Your Sites</div>
        <div className="st-section-desc">Manage sites in your organization. Each site has its own content and settings.</div>
      </div>

      {error && (
        <p style={{ color: 'var(--coral)', fontSize: 12, marginBottom: 12 }}>{error}</p>
      )}

      {loading ? (
        <p style={{ color: 'var(--g500)', fontSize: 13 }}>Loading sites…</p>
      ) : (
        <>
          {sites.map((site) => (
            <div key={site.id} className="st-card" style={{ marginBottom: 12 }}>
              <div className="st-card-head" style={{ marginBottom: 4 }}>
                <div className="st-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {site.domain || site.slug}
                  {currentSiteId === site.id && (
                    <span className="st-nl-sub-badge active">Active</span>
                  )}
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  {deleteConfirmId === site.id ? (
                    <>
                      <button
                        type="button"
                        className="st-comp-remove"
                        onClick={() => handleDelete(site.id)}
                        style={{ marginRight: 8 }}
                      >
                        Confirm delete
                      </button>
                      <button
                        type="button"
                        className="st-fb-reconnect"
                        style={{ padding: '6px 12px' }}
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      style={{ fontSize: 11, fontWeight: 600, color: 'var(--coral)', background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={() => setDeleteConfirmId(site.id)}
                      disabled={sites.length <= 1}
                      title={sites.length <= 1 ? 'Cannot delete the last site' : 'Delete site'}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <div className="st-card-desc" style={{ marginBottom: 0 }}>
                {site.name} · {site.articleCount} articles · {site.language} · Created {formatDate(site.createdAt)}
              </div>
            </div>
          ))}

          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              className="st-fb-reconnect"
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={() => setShowDeleted((v) => !v)}
            >
              {showDeleted ? 'Hide deleted sites' : 'Show deleted sites'}
            </button>
          </div>

          {showDeleted && (
            <div className="st-card" style={{ marginTop: 16 }}>
              <div className="st-card-head">
                <div className="st-card-title">Recover Deleted Sites</div>
              </div>
              <div className="st-card-desc">Sites that were soft-deleted. Recover to restore them.</div>
              {loadingDeleted ? (
                <p style={{ color: 'var(--g500)', fontSize: 13, padding: 12 }}>Loading…</p>
              ) : deletedSites.length === 0 ? (
                <p style={{ color: 'var(--g500)', fontSize: 13, padding: 12 }}>No deleted sites</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {deletedSites.map((site) => (
                    <div key={site.id} className="st-card" style={{ marginBottom: 0, opacity: 0.85 }}>
                      <div className="st-card-head" style={{ marginBottom: 4 }}>
                        <div className="st-card-title">{site.domain || site.slug}</div>
                        <button
                          type="button"
                          className="st-fb-connect-btn"
                          style={{ padding: '6px 12px', fontSize: 11 }}
                          onClick={() => handleRecover(site.id)}
                          disabled={recoveringId === site.id}
                        >
                          {recoveringId === site.id ? 'Recovering…' : 'Recover'}
                        </button>
                      </div>
                      <div className="st-card-desc" style={{ marginBottom: 0 }}>
                        {site.name} · {site.articleCount} articles
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!showForm && (
            <button type="button" className="st-comp-add" onClick={handleAddClick}>
              ➕ Add New Site
            </button>
          )}

          {showForm && (
            <div className="st-card" style={{ marginTop: 16 }}>
              <div className="st-card-head">
                <div className="st-card-title">Add New Site</div>
              </div>
              <div className="st-card-desc">Create a new site in your organization. You can configure it in General after creation.</div>
              <div className="st-row">
                <span className="st-label">Site Name</span>
                <input
                  className="st-input"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="My Publication"
                />
              </div>
              <div className="st-row">
                <span className="st-label">Slug</span>
                <input
                  className="st-input mono"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="my-publication"
                />
              </div>
              <div className="st-row">
                <span className="st-label">Domain (optional)</span>
                <input
                  className="st-input"
                  value={formDomain}
                  onChange={(e) => setFormDomain(e.target.value)}
                  placeholder="example.com"
                />
              </div>
              <div className="st-row">
                <span className="st-label">Language</span>
                <select
                  className="st-select"
                  value={formLanguage}
                  onChange={(e) => setFormLanguage(e.target.value)}
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
                  ))}
                </select>
              </div>
              <div className="st-row">
                <span className="st-label">Timezone</span>
                <select
                  className="st-select"
                  value={formTimezone}
                  onChange={(e) => setFormTimezone(e.target.value)}
                >
                  {TIMEZONES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="st-theme-actions" style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="st-fb-connect-btn"
                  style={{ background: 'var(--mint)' }}
                  onClick={handleCreate}
                  disabled={submitting}
                >
                  {submitting ? 'Creating…' : 'Create Site'}
                </button>
                <button
                  type="button"
                  className="st-save-discard"
                  style={{ background: 'var(--g100)', color: 'var(--g700)' }}
                  onClick={() => { setShowForm(false); setError(null); }}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
