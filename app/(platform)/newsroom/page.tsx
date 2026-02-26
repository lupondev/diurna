'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { getCategoriesForSite, FOOTBALL_CATEGORIES, detectCategoryFromTitle } from '@/lib/newsroom-categories'
import type { CategoryItem } from '@/lib/newsroom-categories'

// ─── Types ───────────────────────────────────────────────

interface ClusterSummary {
  summaryText: string
  mainClaims: { claim: string; sources: string[]; tier: number }[]
  conflictingReports: { topic: string; versions: string[] }[] | null
  signalIntegrity: { tier1_count: number; tier2_count: number; tier3_count: number; conflicts: boolean; consistency: number; confidence: string }
  confidence: string
}

interface Cluster {
  id: string; key: string; title: string; eventType: string; primaryEntity: string
  primaryEntityType: string; entities: string[]; sourceCount: number
  tier1Count: number; tier2Count: number; tier3Count: number
  hasConflicts: boolean; acceleration: number; trend: string; consistency: number
  dis: number; peakDis: number; firstSeen: string; latestItem: string
  newsItems: string[]; category?: string | null; categoryBadge?: string | null; summary?: ClusterSummary
  articles?: { id: string }[]
}

interface SiteInfo {
  id: string; name: string; slug: string; domain: string | null; articleCount?: number
}

interface TrendItem {
  title: string; traffic: string; link: string
}

type TimeFilter = '1H' | '6H' | '12H' | '24H' | 'ALL'

// ─── Constants ───────────────────────────────────────────

const TIME_FILTERS: { key: TimeFilter; hours: number | null }[] = [
  { key: '1H', hours: 1 }, { key: '6H', hours: 6 },
  { key: '12H', hours: 12 }, { key: '24H', hours: 24 },
  { key: 'ALL', hours: null },
]

const GEO_OPTIONS = [
  { value: 'BA', label: '🇧🇦 BA' }, { value: 'US', label: '🇺🇸 US' },
  { value: 'GB', label: '🇬🇧 UK' }, { value: 'DE', label: '🇩🇪 DE' },
]

const BLOCKED_TRENDS = ['bet365', 'kladionica', 'betting', 'odds', 'casino', 'poker', 'kladi', 'unibet', 'betway', 'mozzart', 'meridian', '1xbet', 'tipico', 'bwin', 'stake', 'fanduel', 'draftkings', 'sportsbook']

// ─── Helpers ─────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function getClusterCategory(c: Cluster): string {
  if (c.category) return c.category
  if (c.categoryBadge) return c.categoryBadge
  return detectCategoryFromTitle(c.title)
}

// ─── Trends Panel ────────────────────────────────────────

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
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-foreground flex-1">🔥 Google Trends</span>
        <select value={geo} onChange={e => setGeo(e.target.value)} className="text-[10px] px-1.5 py-0.5 border border-border rounded bg-muted text-muted-foreground">
          {GEO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {loading ? (
        <div className="py-3 text-center text-[11px] text-muted-foreground">Loading...</div>
      ) : trends.length === 0 ? (
        <div className="py-3 text-center text-[11px] text-muted-foreground">No trends</div>
      ) : (
        <div className="flex flex-col max-h-[280px] overflow-y-auto">
          {trends.slice(0, 10).map((t, i) => (
            <button key={i} onClick={() => onWriteTrend(t.title)} className="flex items-center gap-2 py-1 px-1.5 rounded text-left hover:bg-accent transition-colors">
              <span className="font-mono text-[10px] text-muted-foreground w-4 text-right shrink-0">{i + 1}</span>
              <span className="flex-1 text-[11px] text-foreground font-medium truncate">{t.title}</span>
              {t.traffic && <span className="text-[9px] text-muted-foreground font-mono">{t.traffic}</span>}
              <span className="text-[9px] text-orange-500">✨</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Newsroom ───────────────────────────────────────

export default function NewsroomPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchRef = useRef<HTMLInputElement>(null)
  const mode = searchParams.get('mode')

  const [sites, setSites] = useState<SiteInfo[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const site = useMemo(() => sites.find(s => s.id === selectedSiteId) ?? sites[0] ?? null, [sites, selectedSiteId])
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading, setLoading] = useState(true)
  const [clusterCount, setClusterCount] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState('sve')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24H')
  const [search, setSearch] = useState('')
  const [fetching, setFetching] = useState(false)
  const [lastFetch, setLastFetch] = useState<string | null>(null)

  // Load all sites
  useEffect(() => {
    fetch('/api/site?all=true')
      .then(r => r.json() as Promise<{ sites?: SiteInfo[] }>)
      .then(data => {
        // Bug fix: show all sites with any content, not just those with domain
        const usableSites = (data.sites || []) as SiteInfo[]
        setSites(usableSites)
        const defaultSite = usableSites.find((s: SiteInfo) => s.domain) ?? usableSites[0]
        setSelectedSiteId(defaultSite?.id ?? null)
      })
      .catch(() => {})
  }, [])

  // Categories based on site or mode param
  const categories = useMemo(() => {
    if (mode === 'football') return FOOTBALL_CATEGORIES
    return getCategoriesForSite(site?.domain)
  }, [site?.domain, mode])

  // Load clusters (pass siteId so source/site tabs filter data)
  const loadClusters = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '80', timeFilter })
      if (site?.id) params.set('siteId', site.id)
      const res = await fetch(`/api/newsroom/clusters?${params}`)
      const data = await res.json() as { clusters?: Cluster[]; count?: number }
      setClusters(data.clusters || [])
      setClusterCount(data.count || 0)
      setLastFetch(new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }))
    } catch { setClusters([]) }
    finally { setLoading(false) }
  }, [timeFilter, site?.id])

  useEffect(() => {
    loadClusters()
    const interval = setInterval(loadClusters, 60000)
    return () => clearInterval(interval)
  }, [loadClusters])

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

  async function triggerFetch() {
    setFetching(true)
    try {
      const res = await fetch('/api/newsroom/manual-fetch', { method: 'POST' })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(data.error || 'Error fetching feeds')
        return
      }
      await loadClusters()
      toast.success('Feeds refreshed')
    } catch {
      toast.error('Error fetching feeds')
    } finally { setFetching(false) }
  }

  // Filter clusters
  const searchLower = search.toLowerCase()

  const footballCategorySlugs = useMemo(() => new Set(FOOTBALL_CATEGORIES.map(c => c.slug)), [])

  const filtered = useMemo(() => {
    let result = [...clusters]

    if (mode === 'football') {
      result = result.filter(c => footballCategorySlugs.has(getClusterCategory(c)))
    }

    if (categoryFilter !== 'sve' && categoryFilter !== 'napisano' && categoryFilter !== 'ceka') {
      result = result.filter(c => getClusterCategory(c) === categoryFilter)
    }
    if (categoryFilter === 'napisano') {
      result = result.filter(c => (c.articles?.length || 0) > 0)
    }
    if (categoryFilter === 'ceka') {
      result = result.filter(c => (c.articles?.length || 0) === 0)
    }

    if (search) {
      result = result.filter(c =>
        c.title.toLowerCase().includes(searchLower) ||
        c.entities.some(e => e.toLowerCase().includes(searchLower))
      )
    }

    return result.sort((a, b) => b.dis - a.dis)
  }, [clusters, categoryFilter, search, searchLower, mode, footballCategorySlugs])

  // Category counts (when mode=football, only count football-category clusters)
  const baseClusters = useMemo(() => {
    if (mode !== 'football') return clusters
    return clusters.filter(c => footballCategorySlugs.has(getClusterCategory(c)))
  }, [clusters, mode, footballCategorySlugs])

  const getCategoryCount = useCallback((slug: string): number => {
    if (slug === 'sve') return baseClusters.length
    if (slug === 'napisano') return baseClusters.filter(c => (c.articles?.length || 0) > 0).length
    if (slug === 'ceka') return baseClusters.filter(c => (c.articles?.length || 0) === 0).length
    return baseClusters.filter(c => getClusterCategory(c) === slug).length
  }, [baseClusters])

  const isHotCategory = useCallback((slug: string): boolean => {
    return baseClusters.some(c =>
      getClusterCategory(c) === slug &&
      (c.trend === 'SPIKING' || c.dis > 60)
    )
  }, [baseClusters])

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

  const featured = filtered[0] || null
  const rest = filtered.slice(1)

  const stats = {
    total: clusterCount,
    spiking: clusters.filter(c => c.trend === 'SPIKING').length,
    tier1: clusters.filter(c => c.tier1Count > 0).length,
    filtered: filtered.length,
  }

  function statusColor(trend: string) {
    if (trend === 'SPIKING') return 'bg-red-500'
    if (trend === 'RISING') return 'bg-amber-400'
    return 'bg-gray-400 dark:bg-gray-600'
  }

  function statusBadgeClass(trend: string) {
    if (trend === 'SPIKING') return 'bg-red-500/15 text-red-500 dark:bg-red-500/20 dark:text-red-400 border border-red-500/30'
    if (trend === 'RISING') return 'bg-amber-400/15 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400 border border-amber-400/30'
    return 'bg-gray-500/10 text-gray-500 dark:bg-gray-500/20 dark:text-gray-400 border border-gray-500/20'
  }

  function disColor(score: number) {
    if (score >= 80) return 'text-red-500'
    if (score >= 60) return 'text-amber-500 dark:text-amber-400'
    return 'text-gray-400 dark:text-gray-500'
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Site tabs */}
      {sites.length > 1 && (
        <div className="flex items-center gap-0.5 px-4 pt-2 border-b border-border bg-background">
          {sites.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSiteId(s.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors whitespace-nowrap ${
                site?.id === s.id
                  ? 'bg-muted text-foreground border border-b-muted border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.domain || s.name}
            </button>
          ))}
        </div>
      )}

      {/* Top controls bar */}
      <div className="h-11 shrink-0 border-b border-border flex items-center gap-2 px-4 bg-background">
        {TIME_FILTERS.map(tf => (
          <button
            key={tf.key}
            onClick={() => setTimeFilter(tf.key)}
            className={`px-3 py-1 text-xs rounded font-mono transition-colors ${
              timeFilter === tf.key
                ? 'bg-orange-500 text-white font-semibold'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {tf.key}
          </button>
        ))}

        <div className="relative flex-1 max-w-lg ml-2">
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search stories... (/)"
            className="w-full h-7 text-xs bg-muted border border-border rounded px-3 pr-7 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
          {search ? (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs hover:text-foreground">✕</button>
          ) : (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] font-mono">/</span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground font-mono">{filtered.length} stories</span>
          <button
            onClick={triggerFetch}
            disabled={fetching}
            className="flex items-center gap-1.5 px-3 py-1 text-xs bg-muted border border-border rounded hover:bg-accent transition-colors text-foreground disabled:opacity-50"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${fetching ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`} />
            {fetching ? 'Fetching...' : 'Fetch now'}
          </button>
        </div>
      </div>

      {/* Category horizontal strip */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center gap-1 px-4 py-1.5 overflow-x-auto">
          {categories.map(cat => {
            const count = getCategoryCount(cat.slug)
            const hot = isHotCategory(cat.slug)
            const active = categoryFilter === cat.slug
            return (
              <button
                key={cat.slug}
                onClick={() => setCategoryFilter(cat.slug)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-colors shrink-0 ${
                  active
                    ? 'bg-orange-500 text-white font-semibold'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <span className="text-sm">{cat.icon}</span>
                <span>{cat.label}</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1 rounded font-mono ${
                    active ? 'bg-white/20 text-white' :
                    hot ? 'bg-red-500/20 text-red-500 dark:text-red-400' : 'text-muted-foreground'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Cluster list */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Loading clusters...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <span className="text-2xl">📭</span>
              <span className="text-sm">{search ? `No results for "${search}"` : 'No stories for this filter'}</span>
              <span className="text-xs text-muted-foreground/60">Try another filter or refresh feeds.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Featured */}
              {featured && (
                <div className="relative bg-card border border-border rounded-lg p-4 hover:border-orange-500/30 transition-colors">
                  <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-lg bg-gradient-to-r from-orange-500 to-transparent" />

                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${statusBadgeClass(featured.trend)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusColor(featured.trend)}`} />
                        {featured.trend}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground border border-border uppercase tracking-wide font-semibold">
                        {getClusterCategory(featured)}
                      </span>
                      {featured.hasConflicts && <span className="text-[10px] text-amber-500 font-semibold">⚠ conflict</span>}
                    </div>
                    <span className={`text-2xl font-black font-mono shrink-0 ${disColor(featured.dis)}`}>
                      {featured.dis}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-foreground leading-snug mb-1.5">
                    {featured.title}
                  </h3>
                  {featured.summary?.summaryText && (
                    <p className="text-xs text-muted-foreground leading-relaxed mb-2 line-clamp-2">
                      {featured.summary.summaryText}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3 flex-wrap">
                    <span>{featured.sourceCount} src</span>
                    {featured.tier1Count > 0 && <span className="text-green-500 font-semibold">★{featured.tier1Count}</span>}
                    <span className="font-mono">{timeAgo(featured.latestItem)}</span>
                    {featured.entities.slice(0, 3).map(e => (
                      <span key={e} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{e}</span>
                    ))}
                  </div>

                  <button
                    onClick={() => writeArticle(featured)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded transition-colors"
                  >
                    ✨ Write article
                  </button>
                </div>
              )}

              {/* Grid */}
              {rest.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {rest.map(cluster => (
                    <div key={cluster.id} className="bg-card border border-border rounded-lg p-3 hover:border-border/80 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-1 py-0.5 rounded text-[10px] font-semibold ${statusBadgeClass(cluster.trend)}`}>
                            <span className={`w-1 h-1 rounded-full ${statusColor(cluster.trend)}`} />
                            {cluster.trend}
                          </span>
                          <span className="px-1 py-0.5 text-[10px] bg-muted text-muted-foreground rounded uppercase tracking-wide">
                            {getClusterCategory(cluster)}
                          </span>
                        </div>
                        <span className={`text-base font-black font-mono ${disColor(cluster.dis)}`}>
                          {cluster.dis}
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-foreground leading-snug mb-1.5 line-clamp-2">
                        {cluster.title}
                      </h4>

                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
                        <span>{cluster.sourceCount} src</span>
                        {cluster.tier1Count > 0 && <span className="text-green-500 font-semibold">★{cluster.tier1Count}</span>}
                        <span className="font-mono">{timeAgo(cluster.latestItem)}</span>
                        {cluster.entities.slice(0, 2).map(e => (
                          <span key={e} className="bg-muted px-1 py-0.5 rounded">{e}</span>
                        ))}
                      </div>

                      <button
                        onClick={() => writeArticle(cluster)}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded transition-colors ${
                          (cluster.articles?.length || 0) > 0
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-orange-500 hover:bg-orange-600 text-white'
                        }`}
                      >
                        {(cluster.articles?.length || 0) > 0 ? '✓ Written' : '✨ Write'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="w-64 shrink-0 border-l border-border bg-background overflow-y-auto hidden xl:block">
          <div className="p-3 space-y-3">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'CLUSTERS', value: stats.total },
                { label: 'SPIKING', value: stats.spiking },
                { label: 'TIER-1', value: stats.tier1 },
                { label: 'FILTERED', value: stats.filtered },
              ].map(s => (
                <div key={s.label} className="bg-card border border-border rounded-lg p-2 text-center">
                  <div className="text-xl font-black font-mono text-foreground">{s.value}</div>
                  <div className="text-[9px] tracking-widest text-muted-foreground uppercase mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Google Trends */}
            <TrendsPanel onWriteTrend={writeFromTrend} />

            {/* Signal Guide */}
            <div className="bg-card border border-border rounded-lg p-3">
              <div className="text-xs font-semibold text-foreground mb-2">Signal Guide</div>
              {[
                { dot: 'bg-red-500', label: 'SPIKING', desc: 'Write NOW' },
                { dot: 'bg-amber-400', label: 'RISING', desc: 'Cover soon' },
                { dot: 'bg-gray-400 dark:bg-gray-600', label: 'STABLE', desc: 'Stable' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 py-1">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                  <span className="text-[11px] font-semibold text-foreground w-16">{s.label}</span>
                  <span className="text-[11px] text-muted-foreground">{s.desc}</span>
                </div>
              ))}
            </div>

            {/* Last fetch */}
            {lastFetch && (
              <div className="text-[10px] text-muted-foreground text-center">
                Last fetch: {lastFetch}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
