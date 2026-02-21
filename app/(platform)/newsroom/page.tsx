'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

// ─── Types ───────────────────────────────────────────────

interface ClusterSummary {
  mainClaims: { claim: string; sources: string[]; tier: number }[]
  conflictingReports: { topic: string; versions: string[] }[] | null
  signalIntegrity: { tier1_count: number; tier2_count: number; tier3_count: number; conflicts: boolean; consistency: number; confidence: string }
  summaryText: string
  confidence: string
}

interface Cluster {
  id: string; key: string; title: string; eventType: string; primaryEntity: string
  primaryEntityType: string; entities: string[]; sourceCount: number
  tier1Count: number; tier2Count: number; tier3Count: number
  hasConflicts: boolean; acceleration: number; trend: string; consistency: number
  dis: number; peakDis: number; firstSeen: string; latestItem: string
  newsItems: string[]; category?: string; categoryBadge?: string; summary?: ClusterSummary
}

interface SiteInfo {
  id: string; name: string; slug: string; domain: string | null
}

interface TrendItem {
  title: string; traffic: string; link: string
}

interface CategoryItem {
  id: string; icon: string; label: string; section: string
}

// ─── Category configs ────────────────────────────────────

const FOOTBALL_CATEGORIES: CategoryItem[] = [
  { id: 'all', icon: '📊', label: 'Sve priče', section: 'PREGLED' },
  { id: 'vijesti', icon: '📰', label: 'Vijesti', section: 'KATEGORIJE' },
  { id: 'transferi', icon: '🔄', label: 'Transferi', section: 'KATEGORIJE' },
  { id: 'utakmice', icon: '⚽', label: 'Utakmice', section: 'KATEGORIJE' },
  { id: 'povrede', icon: '🏥', label: 'Povrede', section: 'KATEGORIJE' },
  { id: 'igraci', icon: '👤', label: 'Igrači', section: 'KATEGORIJE' },
  { id: 'written', icon: '✅', label: 'Napisano danas', section: 'STATUS' },
  { id: 'unwritten', icon: '⏳', label: 'Čeka pisanje', section: 'STATUS' },
]

const NEWS_CATEGORIES: CategoryItem[] = [
  { id: 'all', icon: '📊', label: 'Sve priče', section: 'PREGLED' },
  { id: 'aktuelno', icon: '⚡', label: 'Aktuelno', section: 'VIJESTI' },
  { id: 'bih', icon: '🇧🇦', label: 'Bosna i Hercegovina', section: 'VIJESTI' },
  { id: 'svijet', icon: '🌍', label: 'Svijet', section: 'VIJESTI' },
  { id: 'region', icon: '🗺️', label: 'Region', section: 'VIJESTI' },
  { id: 'crna-hronika', icon: '🔴', label: 'Crna hronika', section: 'VIJESTI' },
  { id: 'sport', icon: '⚽', label: 'Sport', section: 'SPORT' },
  { id: 'fudbal', icon: '⚽', label: '↳ Fudbal', section: 'SPORT' },
  { id: 'kosarka', icon: '🏀', label: '↳ Košarka', section: 'SPORT' },
  { id: 'tech', icon: '💻', label: 'Tech', section: 'OSTALO' },
  { id: 'biznis', icon: '💼', label: 'Biznis', section: 'OSTALO' },
  { id: 'nauka', icon: '🔬', label: 'Nauka', section: 'OSTALO' },
  { id: 'zanimljivosti', icon: '✨', label: 'Zanimljivosti', section: 'OSTALO' },
  { id: 'show', icon: '🎬', label: 'Show', section: 'OSTALO' },
  { id: 'written', icon: '✅', label: 'Napisano danas', section: 'STATUS' },
  { id: 'unwritten', icon: '⏳', label: 'Čeka pisanje', section: 'STATUS' },
]

const CATEGORY_BADGE: Record<string, { label: string; color: string }> = {
  'aktuelno': { label: 'AKTUELNO', color: '#f97316' },
  'bih': { label: 'BiH', color: '#a855f7' },
  'crna-hronika': { label: 'CRNA HRONIKA', color: '#ef4444' },
  'svijet': { label: 'SVIJET', color: '#14b8a6' },
  'region': { label: 'REGION', color: '#14b8a6' },
  'sport': { label: 'SPORT', color: '#22c55e' },
  'fudbal': { label: 'FUDBAL', color: '#22c55e' },
  'transferi': { label: 'TRANSFERI', color: '#3b82f6' },
  'tech': { label: 'TECH', color: '#3b82f6' },
  'biznis': { label: 'BIZNIS', color: '#eab308' },
  'nauka': { label: 'NAUKA', color: '#3b82f6' },
  'vijesti': { label: 'VIJESTI', color: '#6b7280' },
  'povrede': { label: 'POVREDE', color: '#ef4444' },
}

function getCategoriesForSite(site: SiteInfo | null): CategoryItem[] {
  if (!site) return NEWS_CATEGORIES
  if (site.domain?.includes('todayfootballmatch') || site.domain?.includes('football') || site.domain?.includes('realsport')) {
    return FOOTBALL_CATEGORIES
  }
  return NEWS_CATEGORIES
}

// ─── Constants ───────────────────────────────────────────

const TIME_FILTERS = [
  { key: '1h', label: '1H', hours: 1 },
  { key: '6h', label: '6H', hours: 6 },
  { key: '12h', label: '12H', hours: 12 },
  { key: '24h', label: '24H', hours: 24 },
  { key: 'all', label: 'SVE', hours: null as number | null },
]

const TREND_COLORS: Record<string, string> = { SPIKING: '#dc2626', RISING: '#ea580c', STABLE: '#6b7280', FADING: '#4b5563' }

const GEO_OPTIONS = [
  { value: 'BA', label: '🇧🇦 BA' }, { value: 'US', label: '🇺🇸 US' },
  { value: 'GB', label: '🇬🇧 UK' }, { value: 'DE', label: '🇩🇪 DE' },
]

const BLOCKED_TRENDS = ['bet365', 'kladionica', 'betting', 'odds', 'casino', 'poker', 'kladi', 'unibet', 'betway', 'mozzart', 'meridian', '1xbet', 'tipico', 'bwin', 'stake', 'fanduel', 'draftkings', 'sportsbook']

// ─── Helpers ─────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return 'sad'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function filterByTime(clusters: Cluster[], hours: number | null): Cluster[] {
  if (!hours) return clusters
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
  const filtered = clusters.filter(c => new Date(c.latestItem) >= cutoff)
  if (filtered.length < 5) return [...clusters].sort((a, b) => b.dis - a.dis).slice(0, Math.max(5, filtered.length))
  return filtered
}

// ─── Sub-components ──────────────────────────────────────

function TrendBadge({ trend }: { trend: string }) {
  const color = TREND_COLORS[trend] || '#6b7280'
  const icons: Record<string, string> = { SPIKING: '🔴', RISING: '🟠', STABLE: '⚪', FADING: '🟤' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, color: '#fff', background: color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {icons[trend] || ''} {trend}
    </span>
  )
}

function CategoryBadge({ category }: { category?: string }) {
  if (!category) return null
  const info = CATEGORY_BADGE[category]
  if (!info) return null
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, color: '#fff', background: info.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {info.label}
    </span>
  )
}

function SkeletonCard() {
  return (
    <div style={{ background: '#161616', borderRadius: 8, padding: 14, border: '1px solid #2a2a2a' }}>
      <div style={{ height: 10, width: 60, background: '#2a2a2a', borderRadius: 3, marginBottom: 10 }} />
      <div style={{ height: 14, width: '90%', background: '#2a2a2a', borderRadius: 3, marginBottom: 6 }} />
      <div style={{ height: 14, width: '65%', background: '#2a2a2a', borderRadius: 3, marginBottom: 10 }} />
      <div style={{ height: 8, width: '40%', background: '#2a2a2a', borderRadius: 3 }} />
    </div>
  )
}

// ─── Cluster Card ────────────────────────────────────────

function ClusterCard({ c, isFeatured, onWrite }: { c: Cluster; isFeatured?: boolean; onWrite: () => void }) {
  const trendColor = TREND_COLORS[c.trend] || '#6b7280'

  return (
    <div style={{
      background: isFeatured ? 'linear-gradient(135deg, #161616, #1a1a2a)' : '#161616',
      borderRadius: 8, border: `1px solid ${isFeatured ? '#333' : '#2a2a2a'}`,
      borderLeft: `3px solid ${trendColor}`, padding: isFeatured ? '16px 18px' : '12px 14px',
      gridColumn: isFeatured ? '1 / -1' : undefined,
    }}>
      {/* Top row: badges + DIS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
        {isFeatured && (
          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: '#f97316', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.8 }}>TOP</span>
        )}
        <TrendBadge trend={c.trend} />
        <CategoryBadge category={c.category || c.categoryBadge} />
        {c.hasConflicts && <span style={{ fontSize: 9, color: '#fbbf24', fontWeight: 600 }}>⚠ conflict</span>}
        <span style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 800, color: '#555', fontFamily: 'monospace' }}>{c.dis}</span>
      </div>

      {/* Title */}
      <h3 style={{
        fontSize: isFeatured ? 18 : 14, fontWeight: 600, color: '#e8e8e8',
        margin: '0 0 6px', lineHeight: 1.35, fontFamily: 'Inter, system-ui, sans-serif',
      }}>{c.title}</h3>

      {/* Summary (featured only) */}
      {isFeatured && c.summary && (
        <p style={{ fontSize: 13, color: '#888', lineHeight: 1.5, margin: '0 0 10px' }}>{c.summary.summaryText}</p>
      )}

      {/* Meta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#666', marginBottom: 8 }}>
        <span>{c.sourceCount} src</span>
        {c.tier1Count > 0 && <span style={{ color: '#22c55e', fontWeight: 600 }}>★{c.tier1Count}</span>}
        <span style={{ fontFamily: 'monospace' }}>{timeAgo(c.latestItem)}</span>
        <div style={{ display: 'flex', gap: 3, marginLeft: 'auto' }}>
          {c.entities.slice(0, 2).map((e, i) => (
            <span key={i} style={{ fontSize: 9, background: '#222', color: '#999', padding: '1px 6px', borderRadius: 8, fontWeight: 500 }}>{e}</span>
          ))}
        </div>
      </div>

      {/* Write button */}
      <button onClick={onWrite} style={{
        background: '#f97316', color: '#fff', border: 'none', borderRadius: 6,
        padding: '5px 14px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
        transition: 'background 0.15s',
      }}>
        ✨ Napiši članak
      </button>
    </div>
  )
}

// ─── Google Trends Panel ─────────────────────────────────

function TrendsPanel({ onWriteTrend }: { onWriteTrend: (title: string) => void }) {
  const [trends, setTrends] = useState<TrendItem[]>([])
  const [geo, setGeo] = useState('BA')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/trends?geo=${geo}`)
      .then(r => r.json() as Promise<{ trends?: TrendItem[] }>)
      .then(data => {
        const filtered = (data.trends || []).filter(t => !BLOCKED_TRENDS.some(b => t.title.toLowerCase().includes(b)))
        setTrends(filtered)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [geo])

  return (
    <div style={{ background: '#161616', borderRadius: 8, border: '1px solid #2a2a2a', padding: 14, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#e8e8e8', flex: 1 }}>🔥 Google Trends</span>
        <select value={geo} onChange={e => setGeo(e.target.value)} style={{
          fontSize: 10, padding: '2px 4px', border: '1px solid #2a2a2a', borderRadius: 4, background: '#111', color: '#999',
        }}>
          {GEO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {loading ? (
        <div style={{ padding: 12, textAlign: 'center', fontSize: 11, color: '#666' }}>Loading...</div>
      ) : trends.length === 0 ? (
        <div style={{ padding: 12, textAlign: 'center', fontSize: 11, color: '#666' }}>Nema trendova</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 280, overflowY: 'auto' }}>
          {trends.slice(0, 10).map((t, i) => (
            <div key={i} onClick={() => onWriteTrend(t.title)} className="nr-trend-row" style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px', borderRadius: 4,
              cursor: 'pointer', fontSize: 11,
            }}>
              <span style={{ fontFamily: 'monospace', color: '#555', fontSize: 10, width: 18, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
              <span style={{ flex: 1, color: '#ccc', fontWeight: 500 }}>{t.title}</span>
              {t.traffic && <span style={{ fontSize: 9, color: '#555', fontFamily: 'monospace' }}>{t.traffic}</span>}
              <span style={{ fontSize: 9, color: '#f97316' }}>✨</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Newsroom ───────────────────────────────────────

export default function NewsroomPage() {
  const router = useRouter()
  const searchRef = useRef<HTMLInputElement>(null)

  // State
  const [sites, setSites] = useState<SiteInfo[]>([])
  const [selectedSite, setSelectedSite] = useState<SiteInfo | null>(null)
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading, setLoading] = useState(true)
  const [clusterCount, setClusterCount] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [timeFilter, setTimeFilter] = useState('24h')
  const [search, setSearch] = useState('')
  const [fetchingFeeds, setFetchingFeeds] = useState(false)

  // Fetch sites on mount
  useEffect(() => {
    fetch('/api/setup/sites')
      .then(r => r.json() as Promise<{ sites?: SiteInfo[] }>)
      .then(data => {
        const s = data.sites || []
        setSites(s)
        if (s.length > 0) setSelectedSite(s[0])
      })
      .catch(() => {})
  }, [])

  // Fetch clusters when site changes
  const fetchClusters = useCallback(async () => {
    try {
      const res = await fetch('/api/newsroom/clusters?limit=80')
      const data = await res.json() as { clusters?: Cluster[]; count?: number }
      setClusters(data.clusters || [])
      setClusterCount(data.count || 0)
    } catch { setClusters([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchClusters()
    const interval = setInterval(fetchClusters, 60000)
    return () => clearInterval(interval)
  }, [fetchClusters])

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const triggerFeedFetch = useCallback(async () => {
    setFetchingFeeds(true)
    try {
      await fetch('/api/cron/fetch-feeds')
      await fetch('/api/cron/cluster-engine')
      await fetchClusters()
      toast.success('Feedovi osvježeni')
    } catch {
      toast.error('Greška pri dohvaćanju feedova')
    }
    finally { setFetchingFeeds(false) }
  }, [fetchClusters])

  // Category config for selected site
  const categories = useMemo(() => getCategoriesForSite(selectedSite), [selectedSite])

  // Filter clusters
  const activeTimeHours = TIME_FILTERS.find(t => t.key === timeFilter)?.hours ?? null
  const searchLower = search.toLowerCase()

  const filtered = useMemo(() => {
    let result = [...clusters]

    // Filter by time
    result = filterByTime(result, activeTimeHours)

    // Filter by category
    if (selectedCategory !== 'all' && selectedCategory !== 'written' && selectedCategory !== 'unwritten') {
      result = result.filter(c => {
        // Match by cluster category field
        if (c.category === selectedCategory) return true
        if (c.categoryBadge === selectedCategory) return true
        // Fallback: match by eventType mapping
        const eventCategoryMap: Record<string, string[]> = {
          'transferi': ['TRANSFER', 'CONTRACT'],
          'utakmice': ['MATCH_RESULT', 'MATCH_PREVIEW', 'POST_MATCH_REACTION'],
          'povrede': ['INJURY'],
          'vijesti': ['BREAKING', 'SCANDAL', 'DISCIPLINE', 'RECORD', 'MANAGERIAL'],
          'igraci': ['TRANSFER', 'INJURY', 'CONTRACT'],
          'sport': ['MATCH_RESULT', 'MATCH_PREVIEW', 'TRANSFER', 'INJURY'],
          'fudbal': ['MATCH_RESULT', 'MATCH_PREVIEW', 'TRANSFER', 'INJURY'],
        }
        const types = eventCategoryMap[selectedCategory]
        if (types && types.includes(c.eventType)) return true
        return false
      })
    }

    // Filter by search
    if (search) {
      result = result.filter(c =>
        c.title.toLowerCase().includes(searchLower) ||
        c.entities.some(e => e.toLowerCase().includes(searchLower))
      )
    }

    return result.sort((a, b) => b.dis - a.dis)
  }, [clusters, selectedCategory, activeTimeHours, search, searchLower])

  // Category counts
  const getCategoryCount = useCallback((catId: string): number => {
    if (catId === 'all') return clusters.length
    if (catId === 'written' || catId === 'unwritten') return 0
    return clusters.filter(c => {
      if (c.category === catId || c.categoryBadge === catId) return true
      return false
    }).length
  }, [clusters])

  // Is "hot" category (has breaking stories)
  const isHotCategory = useCallback((catId: string): boolean => {
    return clusters.some(c =>
      (c.category === catId || c.categoryBadge === catId) &&
      (c.trend === 'SPIKING' || c.dis > 60)
    )
  }, [clusters])

  // Navigation
  function writeArticle(cluster: Cluster) {
    const params = new URLSearchParams()
    params.set('clusterId', cluster.id)
    params.set('title', cluster.title)
    if (cluster.summary?.summaryText) params.set('summary', cluster.summary.summaryText)
    if (cluster.summary?.mainClaims) params.set('sources', cluster.summary.mainClaims.map(c => c.claim).join('|||'))
    if (cluster.entities.length > 0) params.set('entities', cluster.entities.join(','))
    params.set('eventType', cluster.eventType)
    router.push(`/editor?${params.toString()}`)
  }

  function writeFromTrend(title: string) {
    router.push(`/editor?prompt=${encodeURIComponent(`Write an article about the trending topic: ${title}`)}`)
  }

  const topStory = filtered[0] || null
  const restStories = filtered.slice(1)

  return (
    <div className="nr-root">
      {/* ─── TOPBAR ─── */}
      <header className="nr-topbar">
        <span className="nr-logo">DIURNA.</span>

        {/* Site Switcher */}
        {sites.length > 1 && (
          <div className="nr-site-switcher">
            {sites.map(s => (
              <button
                key={s.id}
                className={`nr-site-btn ${selectedSite?.id === s.id ? 'nr-site-btn--active' : ''}`}
                onClick={() => setSelectedSite(s)}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        <div style={{ flex: 1 }} />

        <span className="nr-cluster-count">
          <span className="nr-pulse-dot" />
          {clusterCount} klastera
        </span>

        <button className="nr-fetch-btn" onClick={triggerFeedFetch} disabled={fetchingFeeds}>
          {fetchingFeeds ? '⏳ Dohvaćam…' : '📡 Fetch sada'}
        </button>
      </header>

      {/* ─── MAIN LAYOUT ─── */}
      <div className="nr-layout">
        {/* LEFT SIDEBAR — Categories */}
        <aside className="nr-sidebar">
          {(() => {
            let lastSection = ''
            return categories.map(cat => {
              const showSection = cat.section !== lastSection
              lastSection = cat.section
              const count = getCategoryCount(cat.id)
              const hot = isHotCategory(cat.id)
              const active = selectedCategory === cat.id

              return (
                <div key={cat.id}>
                  {showSection && (
                    <div className="nr-sidebar-section">{cat.section}</div>
                  )}
                  <button
                    className={`nr-sidebar-item ${active ? 'nr-sidebar-item--active' : ''}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    <span className="nr-sidebar-icon">{cat.icon}</span>
                    <span className="nr-sidebar-label">{cat.label}</span>
                    {count > 0 && (
                      <span className={`nr-sidebar-count ${hot ? 'nr-sidebar-count--hot' : ''}`}>
                        {count}
                      </span>
                    )}
                  </button>
                </div>
              )
            })
          })()}
        </aside>

        {/* CENTER — Cluster List */}
        <div className="nr-center">
          {/* Time filters + search */}
          <div className="nr-controls">
            <div className="nr-time-filters">
              {TIME_FILTERS.map(tf => (
                <button
                  key={tf.key}
                  className={`nr-time-btn ${timeFilter === tf.key ? 'nr-time-btn--active' : ''}`}
                  onClick={() => setTimeFilter(tf.key)}
                >
                  {tf.label}
                </button>
              ))}
            </div>
            <div className="nr-search-wrap">
              <input
                ref={searchRef}
                type="text"
                placeholder="Pretraži priče…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="nr-search"
              />
              {search ? (
                <button onClick={() => setSearch('')} className="nr-search-clear">✕</button>
              ) : (
                <span className="nr-search-hint">/</span>
              )}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="nr-grid">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="nr-empty">
              <div style={{ fontSize: 36, marginBottom: 12 }}>📰</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#ccc' }}>
                {search ? `Nema rezultata za "${search}"` : 'Nema vijesti u ovoj kategoriji'}
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>Pokušajte drugi filter ili osvježite feedove.</div>
            </div>
          )}

          {/* Featured + Grid */}
          {!loading && filtered.length > 0 && (
            <>
              {topStory && (
                <ClusterCard c={topStory} isFeatured onWrite={() => writeArticle(topStory)} />
              )}
              {restStories.length > 0 && (
                <div className="nr-grid">
                  {restStories.map(c => (
                    <ClusterCard key={c.id} c={c} onWrite={() => writeArticle(c)} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT PANEL */}
        <aside className="nr-right">
          {/* Today's stats */}
          <div className="nr-stats-grid">
            <div className="nr-stat-card">
              <div className="nr-stat-value">{clusterCount}</div>
              <div className="nr-stat-label">Klastera</div>
            </div>
            <div className="nr-stat-card">
              <div className="nr-stat-value">{clusters.filter(c => c.trend === 'SPIKING').length}</div>
              <div className="nr-stat-label">Spiking</div>
            </div>
            <div className="nr-stat-card">
              <div className="nr-stat-value">{clusters.filter(c => c.tier1Count > 0).length}</div>
              <div className="nr-stat-label">Tier-1</div>
            </div>
            <div className="nr-stat-card">
              <div className="nr-stat-value">{filtered.length}</div>
              <div className="nr-stat-label">Filtrirano</div>
            </div>
          </div>

          {/* Google Trends */}
          <TrendsPanel onWriteTrend={writeFromTrend} />

          {/* Signal Guide */}
          <div style={{ background: '#161616', borderRadius: 8, border: '1px solid #2a2a2a', padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#e8e8e8', marginBottom: 10 }}>Signal vodič</div>
            {Object.entries(TREND_COLORS).map(([trend, color]) => (
              <div key={trend} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 11 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                <span style={{ fontWeight: 600, color: '#ccc', width: 60 }}>{trend}</span>
                <span style={{ color: '#666' }}>
                  {trend === 'SPIKING' ? 'Piši ODMAH' : trend === 'RISING' ? 'Uskoro pokri' : trend === 'STABLE' ? 'Stabilan' : 'Nizak prioritet'}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* ─── STYLES ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .nr-root {
          background: #0f0f0f;
          color: #e8e8e8;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* Topbar */
        .nr-topbar {
          height: 48px;
          background: #0a0a0a;
          border-bottom: 1px solid #2a2a2a;
          display: flex;
          align-items: center;
          padding: 0 16px;
          gap: 12px;
          flex-shrink: 0;
        }
        .nr-logo {
          font-weight: 800;
          font-size: 15px;
          color: #f97316;
          letter-spacing: 0.5px;
          flex-shrink: 0;
        }
        .nr-site-switcher {
          display: flex;
          gap: 4px;
          background: #161616;
          border-radius: 6px;
          padding: 2px;
        }
        .nr-site-btn {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 4px;
          border: none;
          background: transparent;
          color: #888;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .nr-site-btn--active {
          background: #2a2a2a;
          color: #fff;
        }
        .nr-site-btn:hover { color: #ccc; }
        .nr-cluster-count {
          font-size: 11px;
          color: #666;
          font-family: monospace;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .nr-pulse-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22c55e;
          animation: nr-pulse 2s ease-in-out infinite;
        }
        @keyframes nr-pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        .nr-fetch-btn {
          font-size: 11px;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 6px;
          border: 1px solid #2a2a2a;
          background: #161616;
          color: #999;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .nr-fetch-btn:hover { background: #222; color: #fff; }
        .nr-fetch-btn:disabled { opacity: 0.5; cursor: wait; }

        /* Main layout */
        .nr-layout {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        /* Sidebar */
        .nr-sidebar {
          width: 200px;
          background: #0a0a0a;
          border-right: 1px solid #2a2a2a;
          overflow-y: auto;
          padding: 8px 0;
          flex-shrink: 0;
          scrollbar-width: thin;
          scrollbar-color: #333 transparent;
        }
        .nr-sidebar-section {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #555;
          padding: 12px 14px 4px;
        }
        .nr-sidebar-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 7px 14px;
          border: none;
          background: transparent;
          color: #888;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          text-align: left;
          transition: all 0.12s;
          border-left: 3px solid transparent;
          font-family: inherit;
        }
        .nr-sidebar-item:hover { background: #161616; color: #ccc; }
        .nr-sidebar-item--active {
          background: #161616;
          color: #22c55e;
          border-left-color: #22c55e;
          font-weight: 600;
        }
        .nr-sidebar-icon { font-size: 14px; flex-shrink: 0; width: 18px; text-align: center; }
        .nr-sidebar-label { flex: 1; }
        .nr-sidebar-count {
          font-family: monospace;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 8px;
          background: #222;
          color: #666;
        }
        .nr-sidebar-count--hot {
          background: #f97316;
          color: #fff;
        }

        /* Center */
        .nr-center {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .nr-controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .nr-time-filters {
          display: flex;
          gap: 2px;
          background: #161616;
          border-radius: 6px;
          padding: 2px;
        }
        .nr-time-btn {
          font-size: 11px;
          font-weight: 600;
          font-family: monospace;
          padding: 4px 10px;
          border-radius: 4px;
          border: none;
          background: transparent;
          color: #666;
          cursor: pointer;
          transition: all 0.12s;
        }
        .nr-time-btn--active { background: #fff; color: #0f0f0f; }
        .nr-time-btn:hover { color: #ccc; }

        .nr-search-wrap {
          flex: 1;
          position: relative;
        }
        .nr-search {
          width: 100%;
          padding: 6px 30px 6px 12px;
          font-size: 12px;
          background: #161616;
          border: 1px solid #2a2a2a;
          border-radius: 6px;
          color: #e8e8e8;
          outline: none;
          font-family: inherit;
          transition: border-color 0.15s;
        }
        .nr-search:focus { border-color: #555; }
        .nr-search::placeholder { color: #555; }
        .nr-search-clear {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: #666; cursor: pointer; font-size: 12px;
        }
        .nr-search-hint {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          color: #444; font-size: 10px; font-family: monospace;
        }

        .nr-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .nr-empty {
          text-align: center;
          padding: 64px 16px;
          color: #666;
        }

        /* Right panel */
        .nr-right {
          width: 280px;
          background: #0a0a0a;
          border-left: 1px solid #2a2a2a;
          overflow-y: auto;
          padding: 12px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          scrollbar-width: thin;
          scrollbar-color: #333 transparent;
        }
        .nr-stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .nr-stat-card {
          background: #161616;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          padding: 12px;
          text-align: center;
        }
        .nr-stat-value {
          font-size: 22px;
          font-weight: 800;
          color: #e8e8e8;
          font-family: monospace;
        }
        .nr-stat-label {
          font-size: 10px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .nr-trend-row:hover { background: #222; }

        /* Responsive */
        @media (max-width: 1024px) {
          .nr-right { display: none; }
        }
        @media (max-width: 768px) {
          .nr-sidebar { width: 160px; }
          .nr-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .nr-sidebar { display: none; }
        }
      `}</style>
    </div>
  )
}
