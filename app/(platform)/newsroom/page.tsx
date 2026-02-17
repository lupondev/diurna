'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface ClusterSummary {
  mainClaims: { claim: string; sources: string[]; tier: number }[]
  conflictingReports: { topic: string; versions: string[] }[] | null
  signalIntegrity: { tier1_count: number; tier2_count: number; tier3_count: number; conflicts: boolean; consistency: number; confidence: string }
  summaryText: string
  confidence: string
}

interface Cluster {
  id: string
  key: string
  title: string
  eventType: string
  primaryEntity: string
  primaryEntityType: string
  entities: string[]
  sourceCount: number
  tier1Count: number
  tier2Count: number
  tier3Count: number
  hasConflicts: boolean
  acceleration: number
  trend: string
  consistency: number
  dis: number
  peakDis: number
  firstSeen: string
  latestItem: string
  newsItems: string[]
  summary?: ClusterSummary
}

type SectionKey = 'ALL' | 'BREAKING' | 'TRANSFERS' | 'MATCHES' | 'INJURIES'

const SECTIONS: { key: SectionKey; label: string; icon: string; eventTypes: string[] | null; minDis?: number }[] = [
  { key: 'ALL', label: 'All', icon: '\u{1F4F0}', eventTypes: null },
  { key: 'BREAKING', label: 'Breaking', icon: '\u{1F525}', eventTypes: ['SCANDAL', 'DISCIPLINE', 'BREAKING', 'RECORD'], minDis: 55 },
  { key: 'TRANSFERS', label: 'Transfer Market', icon: '\u{1F504}', eventTypes: ['TRANSFER', 'CONTRACT'] },
  { key: 'MATCHES', label: 'Matches', icon: '\u26BD', eventTypes: ['MATCH_PREVIEW', 'MATCH_RESULT', 'POST_MATCH_REACTION'] },
  { key: 'INJURIES', label: 'Injuries', icon: '\u{1F3E5}', eventTypes: ['INJURY'] },
]

const TREND_COLORS: Record<string, string> = {
  SPIKING: '#dc2626',
  RISING: '#ea580c',
  STABLE: '#6b7280',
  FADING: '#d1d5db',
}

const TREND_LABELS: Record<string, string> = {
  SPIKING: 'Write NOW',
  RISING: 'Cover soon',
  STABLE: 'Steady',
  FADING: 'Low priority',
}

interface LeagueItem {
  label: string
  icon: string
}

const DEFAULT_LEAGUES: LeagueItem[] = [
  { label: 'Premier League', icon: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}' },
  { label: 'La Liga', icon: '\u{1F1EA}\u{1F1F8}' },
  { label: 'Serie A', icon: '\u{1F1EE}\u{1F1F9}' },
  { label: 'Bundesliga', icon: '\u{1F1E9}\u{1F1EA}' },
  { label: 'Ligue 1', icon: '\u{1F1EB}\u{1F1F7}' },
  { label: 'Champions League', icon: '\u2B50' },
]

const MOCK_MATCHES = [
  { home: 'Galatasaray', away: 'Juventus', time: '18:45', comp: 'UCL' },
  { home: 'Benfica', away: 'Real Madrid', time: '21:00', comp: 'UCL' },
  { home: 'Dortmund', away: 'Atalanta', time: '21:00', comp: 'UCL' },
  { home: 'Monaco', away: 'PSG', time: '21:00', comp: 'L1' },
]

const LS_KEY = 'diurna_my_leagues'

function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function filterBySection(clusters: Cluster[], sectionKey: SectionKey): Cluster[] {
  const section = SECTIONS.find(s => s.key === sectionKey)
  if (!section || section.key === 'ALL') return clusters
  return clusters.filter(c => {
    if (section.key === 'BREAKING') {
      return c.dis >= 55 || (section.eventTypes && section.eventTypes.includes(c.eventType))
    }
    return section.eventTypes && section.eventTypes.includes(c.eventType)
  })
}

function filterByLeague(clusters: Cluster[], leagueFilter: string | null): Cluster[] {
  if (!leagueFilter) return clusters
  return clusters.filter(c =>
    c.entities.some(e => e.toLowerCase().includes(leagueFilter.toLowerCase()))
  )
}

function ConfidenceDots({ confidence }: { confidence: string }) {
  if (confidence === 'HIGH') return <span style={{ color: '#22c55e', fontSize: 11, letterSpacing: 1 }} title="High confidence">{'\u25CF\u25CF\u25CF'}</span>
  if (confidence === 'MEDIUM') return <span style={{ letterSpacing: 1, fontSize: 11 }} title="Medium confidence"><span style={{ color: '#d97706' }}>{'\u25CF\u25CF'}</span><span style={{ color: '#9ca3af' }}>{'\u25CB'}</span></span>
  return <span style={{ letterSpacing: 1, fontSize: 11 }} title="Low confidence"><span style={{ color: '#dc2626' }}>{'\u25CF'}</span><span style={{ color: '#9ca3af' }}>{'\u25CB\u25CB'}</span></span>
}

function TrendBadge({ trend }: { trend: string }) {
  const color = TREND_COLORS[trend] || '#6b7280'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700,
      padding: '2px 8px', borderRadius: 4, color: '#fff',
      background: color, textTransform: 'uppercase', letterSpacing: 0.5,
    }}>
      {trend === 'SPIKING' && '\u{1F534}'}{trend === 'RISING' && '\u{1F7E0}'}{trend === 'STABLE' && '\u26AA'}{trend === 'FADING' && '\u{1F7E4}'}
      {' '}{trend}
    </span>
  )
}

function SkeletonCard() {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb' }}>
      <div style={{ height: 12, width: 80, background: '#e5e7eb', borderRadius: 4, marginBottom: 12 }} className="animate-pulse" />
      <div style={{ height: 16, width: '90%', background: '#e5e7eb', borderRadius: 4, marginBottom: 8 }} className="animate-pulse" />
      <div style={{ height: 16, width: '70%', background: '#e5e7eb', borderRadius: 4, marginBottom: 12 }} className="animate-pulse" />
      <div style={{ height: 10, width: '50%', background: '#e5e7eb', borderRadius: 4 }} className="animate-pulse" />
    </div>
  )
}

export default function NewsroomPage() {
  const router = useRouter()
  const searchRef = useRef<HTMLInputElement>(null)
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading, setLoading] = useState(true)
  const [clusterMeta, setClusterMeta] = useState({ count: 0 })
  const [activeSection, setActiveSection] = useState<SectionKey>('ALL')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeLeague, setActiveLeague] = useState<string | null>(null)
  const [leagues, setLeagues] = useState<LeagueItem[]>(DEFAULT_LEAGUES)
  const [addingLeague, setAddingLeague] = useState(false)
  const [newLeagueName, setNewLeagueName] = useState('')

  const fetchClusters = useCallback(async () => {
    try {
      const res = await fetch('/api/newsroom/clusters?limit=50')
      const data = await res.json()
      setClusters(data.clusters || [])
      setClusterMeta({ count: data.count || 0 })
    } catch {
      setClusters([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClusters()
    const interval = setInterval(fetchClusters, 60000)
    return () => clearInterval(interval)
  }, [fetchClusters])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY)
      if (stored) setLeagues(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const saveLeagues = useCallback((updated: LeagueItem[]) => {
    setLeagues(updated)
    localStorage.setItem(LS_KEY, JSON.stringify(updated))
  }, [])

  const addLeague = useCallback(() => {
    const name = newLeagueName.trim()
    if (!name) return
    if (leagues.some(l => l.label.toLowerCase() === name.toLowerCase())) {
      setNewLeagueName('')
      setAddingLeague(false)
      return
    }
    saveLeagues([...leagues, { label: name, icon: '\u{1F3C6}' }])
    setNewLeagueName('')
    setAddingLeague(false)
  }, [newLeagueName, leagues, saveLeagues])

  const removeLeague = useCallback((label: string) => {
    const updated = leagues.filter(l => l.label !== label)
    saveLeagues(updated)
    if (activeLeague === label) setActiveLeague(null)
  }, [leagues, activeLeague, saveLeagues])

  const searchLower = search.toLowerCase()

  const filtered = useMemo(() => {
    let result = filterBySection(clusters, activeSection)
    result = filterByLeague(result, activeLeague)
    if (search) {
      result = result.filter(c =>
        c.title.toLowerCase().includes(searchLower) ||
        c.entities.some(e => e.toLowerCase().includes(searchLower))
      )
    }
    return result.sort((a, b) => b.dis - a.dis)
  }, [clusters, activeSection, activeLeague, search, searchLower])

  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of SECTIONS) {
      counts[s.key] = filterBySection(clusters, s.key).length
    }
    return counts
  }, [clusters])

  const topStory = filtered[0] || null
  const restStories = filtered.slice(1)

  function writeArticle(cluster: Cluster) {
    const params = new URLSearchParams()
    params.set('title', cluster.title)
    params.set('clusterId', cluster.id)
    router.push(`/editor?${params.toString()}`)
  }

  return (
    <div style={{ background: '#f5f6f8', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER */}
      <header style={{
        background: '#0c0f1a', borderBottom: '1px solid #1e293b', padding: '0 24px',
        height: 52, display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 50,
      }}>
        <span style={{ color: '#f97316', fontWeight: 800, fontSize: 15, fontFamily: 'monospace', letterSpacing: 1, flexShrink: 0 }}>DIURNA</span>

        <nav style={{ display: 'flex', gap: 4, overflowX: 'auto', flexShrink: 1 }}>
          {SECTIONS.map(s => {
            const active = activeSection === s.key
            return (
              <button key={s.key} onClick={() => setActiveSection(s.key)} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6,
                border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                background: active ? '#1e293b' : 'transparent', color: active ? '#fff' : '#64748b',
                transition: 'all 0.15s',
              }}>
                <span>{s.icon}</span>
                <span>{s.label}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, fontFamily: 'monospace',
                  background: active ? '#f97316' : '#334155', color: active ? '#fff' : '#94a3b8',
                }}>{sectionCounts[s.key] || 0}</span>
              </button>
            )
          })}
        </nav>

        <div style={{ flex: 1 }} />

        <div style={{ position: 'relative', flexShrink: 0 }}>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search stories..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
              padding: '6px 32px 6px 10px', color: '#e2e8f0', fontSize: 12, width: 180,
              outline: 'none',
            }}
          />
          {search ? (
            <button onClick={() => setSearch('')} style={{
              position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13,
            }}>{'\u2715'}</button>
          ) : (
            <span style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              color: '#475569', fontSize: 10, fontFamily: 'monospace',
            }}>/</span>
          )}
        </div>

        <button onClick={fetchClusters} style={{
          background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
          padding: '5px 8px', cursor: 'pointer', color: '#94a3b8', fontSize: 14, flexShrink: 0,
        }} title="Refresh">{'\u21BB'}</button>

        <span style={{
          fontSize: 11, color: '#64748b', fontFamily: 'monospace', display: 'flex',
          alignItems: 'center', gap: 6, flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          {clusterMeta.count} clusters
        </span>
      </header>

      {/* MAIN */}
      <div style={{
        maxWidth: 1200, margin: '0 auto', width: '100%', padding: '16px 16px 0',
        display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16, flex: 1,
      }} className="newsroom-grid">
        {/* LEFT COLUMN */}
        <div>
          {/* Section title */}
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
              {SECTIONS.find(s => s.key === activeSection)?.icon} {SECTIONS.find(s => s.key === activeSection)?.label}
            </span>
            <span style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>
              {filtered.length} {filtered.length === 1 ? 'story' : 'stories'}
            </span>
            {activeLeague && (
              <span style={{
                fontSize: 11, background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px',
                borderRadius: 10, fontWeight: 600,
              }}>
                {activeLeague}
                <button onClick={() => setActiveLeague(null)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8',
                  marginLeft: 4, fontSize: 11,
                }}>{'\u2715'}</button>
              </span>
            )}
          </div>

          {/* LOADING */}
          {loading && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="stories-grid">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* NO CLUSTERS */}
          {!loading && clusters.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{'\u{1F4F0}'}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>No stories available.</div>
              <div style={{ fontSize: 12 }}>Run the cluster engine to generate stories.</div>
            </div>
          )}

          {/* NO RESULTS FOR FILTER */}
          {!loading && clusters.length > 0 && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
              {search ? (
                <div style={{ fontSize: 14 }}>No stories matching &apos;{search}&apos;</div>
              ) : (
                <div style={{ fontSize: 14 }}>No stories in {SECTIONS.find(s => s.key === activeSection)?.label}</div>
              )}
            </div>
          )}

          {/* TOP STORY HERO */}
          {!loading && topStory && (
            <div style={{
              background: '#0c0f1a', borderRadius: 12, padding: 0, marginBottom: 16,
              overflow: 'hidden', position: 'relative',
            }}>
              <div style={{ height: 3, background: 'linear-gradient(90deg, #f97316, #dc2626)' }} />
              <div style={{ padding: '16px 20px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 4,
                    background: '#f97316', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.8,
                  }}>TOP STORY</span>
                  <TrendBadge trend={topStory.trend} />
                  <span style={{
                    fontSize: 18, fontWeight: 800, color: '#f97316', fontFamily: 'monospace', marginLeft: 'auto',
                  }}>{topStory.dis}</span>
                </div>
                <h2 style={{
                  fontSize: 21, fontWeight: 700, color: '#f1f5f9', margin: '0 0 10px',
                  fontFamily: 'Georgia, serif', lineHeight: 1.3, maxWidth: '88%',
                }}>{topStory.title}</h2>
                {topStory.summary && (
                  <p style={{ fontSize: 13, color: '#7c8aa0', lineHeight: 1.5, margin: '0 0 14px' }}>
                    {topStory.summary.summaryText}
                  </p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                    <span style={{ color: '#94a3b8' }}>{topStory.sourceCount} sources</span>
                    {topStory.tier1Count > 0 && (
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>{'\u2605'}{topStory.tier1Count} tier-1</span>
                    )}
                    <ConfidenceDots confidence={topStory.summary?.confidence || 'LOW'} />
                    {topStory.hasConflicts && (
                      <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 600 }}>{'\u26A0'} Sources conflict</span>
                    )}
                    <span style={{ color: '#475569', fontFamily: 'monospace', fontSize: 11 }}>{timeAgo(topStory.latestItem)}</span>
                  </div>
                  <button onClick={() => writeArticle(topStory)} style={{
                    background: '#f97316', color: '#fff', border: 'none', borderRadius: 6,
                    padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {'\u270D'} Write Article
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STORY CARDS GRID */}
          {!loading && restStories.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }} className="stories-grid">
              {restStories.map(c => {
                const expanded = expandedId === c.id
                const trendColor = TREND_COLORS[c.trend] || '#6b7280'
                return (
                  <div key={c.id} onClick={() => setExpandedId(expanded ? null : c.id)} style={{
                    background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb',
                    borderLeft: `3px solid ${trendColor}`, padding: '12px 14px', cursor: 'pointer',
                    transition: 'box-shadow 0.15s',
                  }}>
                    {/* Row 1: trend + conflict + DIS */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <TrendBadge trend={c.trend} />
                      {c.hasConflicts && (
                        <span style={{ fontSize: 10, color: '#d97706', fontWeight: 600 }}>{'\u26A0'} conflict</span>
                      )}
                      <span style={{
                        marginLeft: 'auto', fontSize: 16, fontWeight: 800, color: '#9ca3af',
                        fontFamily: 'monospace',
                      }}>{c.dis}</span>
                    </div>

                    {/* Row 2: title */}
                    <h3 style={{
                      fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 6px',
                      fontFamily: 'Georgia, serif', lineHeight: 1.35,
                    }}>{c.title}</h3>

                    {/* Row 3: meta */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                      <span>{c.sourceCount} src</span>
                      {c.tier1Count > 0 && <span style={{ color: '#22c55e', fontWeight: 600 }}>{'\u2605'}{c.tier1Count}</span>}
                      <ConfidenceDots confidence={c.summary?.confidence || 'LOW'} />
                      <span style={{ fontFamily: 'monospace' }}>{timeAgo(c.latestItem)}</span>
                    </div>

                    {/* Row 4: entity pills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {c.entities.slice(0, 3).map((e, i) => (
                        <span key={i} style={{
                          fontSize: 10, background: '#f1f5f9', color: '#475569', padding: '2px 7px',
                          borderRadius: 10, fontWeight: 500,
                        }}>{e}</span>
                      ))}
                      {c.entities.length > 3 && (
                        <span style={{ fontSize: 10, color: '#9ca3af' }}>+{c.entities.length - 3}</span>
                      )}
                    </div>

                    {/* Expanded */}
                    {expanded && (
                      <div onClick={e => e.stopPropagation()} style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e5e7eb' }}>
                        {c.summary && (
                          <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, margin: '0 0 10px' }}>
                            {c.summary.summaryText}
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => writeArticle(c)} style={{
                            background: '#f97316', color: '#fff', border: 'none', borderRadius: 6,
                            padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                          }}>
                            {'\u270D'} Write Article
                          </button>
                          <button onClick={() => {}} style={{
                            background: '#f1f5f9', color: '#475569', border: '1px solid #e5e7eb', borderRadius: 6,
                            padding: '6px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          }}>
                            View Sources ({c.sourceCount})
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <aside className="newsroom-sidebar">
          {/* Today's Matches */}
          <div style={{
            background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 14, marginBottom: 12,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              {'\u26BD'} Today&apos;s Matches
            </div>
            {MOCK_MATCHES.map((m, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1fr 48px 1fr', alignItems: 'center',
                padding: '6px 0', borderBottom: i < MOCK_MATCHES.length - 1 ? '1px solid #f1f5f9' : 'none',
                fontSize: 12,
              }}>
                <span style={{ textAlign: 'right', fontWeight: 500, color: '#111827' }}>{m.home}</span>
                <span style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{m.time}</span>
                <span style={{ fontWeight: 500, color: '#111827' }}>{m.away}</span>
              </div>
            ))}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', marginTop: 8,
            }}>
              <span style={{ fontSize: 11, color: '#f97316', fontWeight: 600, cursor: 'pointer' }}>
                All fixtures {'\u2192'}
              </span>
            </div>
          </div>

          {/* My Leagues */}
          <div style={{
            background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 14, marginBottom: 12,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 10 }}>
              {'\u{1F3C6}'} My Leagues
            </div>
            {leagues.map((l) => {
              const isActive = activeLeague === l.label
              return (
                <div key={l.label} className="league-row" style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 6,
                  cursor: 'pointer', fontSize: 12, fontWeight: isActive ? 700 : 500,
                  background: isActive ? '#dbeafe' : 'transparent',
                  color: isActive ? '#1d4ed8' : '#374151',
                  transition: 'background 0.15s',
                  position: 'relative',
                }} onClick={() => setActiveLeague(isActive ? null : l.label)}>
                  <span>{l.icon}</span>
                  <span style={{ flex: 1 }}>{l.label}</span>
                  <button className="league-remove" onClick={(e) => { e.stopPropagation(); removeLeague(l.label) }} style={{
                    background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer',
                    fontSize: 11, padding: '0 2px', opacity: 0, transition: 'opacity 0.15s',
                  }}>{'\u2715'}</button>
                </div>
              )
            })}
            {addingLeague ? (
              <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                <input
                  autoFocus
                  type="text"
                  placeholder="League or club..."
                  value={newLeagueName}
                  onChange={e => setNewLeagueName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addLeague(); if (e.key === 'Escape') { setAddingLeague(false); setNewLeagueName('') } }}
                  style={{
                    flex: 1, fontSize: 11, padding: '4px 8px', border: '1px solid #e5e7eb',
                    borderRadius: 4, outline: 'none',
                  }}
                />
                <button onClick={addLeague} style={{
                  fontSize: 11, padding: '4px 8px', background: '#f97316', color: '#fff',
                  border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600,
                }}>Add</button>
              </div>
            ) : (
              <button onClick={() => setAddingLeague(true)} style={{
                marginTop: 6, fontSize: 11, color: '#f97316', background: 'none',
                border: '1px dashed #f97316', borderRadius: 6, padding: '5px 10px',
                cursor: 'pointer', width: '100%', fontWeight: 600,
              }}>+ Add League</button>
            )}
          </div>

          {/* Video Highlights */}
          <div style={{
            background: '#f8fafc', borderRadius: 10, border: '1px solid #e5e7eb', padding: 14, marginBottom: 12,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              {'\u{1F4F9}'} VIDEO HIGHLIGHTS
              <span style={{
                fontSize: 9, background: '#22c55e', color: '#fff', padding: '1px 6px',
                borderRadius: 4, fontWeight: 700,
              }}>FREE</span>
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>
              {'\u{1F3AC}'} Available after matches
            </div>
          </div>

          {/* Signal Guide */}
          <div style={{
            background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 14,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Signal Guide</div>
            {Object.entries(TREND_LABELS).map(([trend, label]) => (
              <div key={trend} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 11 }}>
                <span style={{
                  width: 10, height: 10, borderRadius: 2, background: TREND_COLORS[trend],
                  display: 'inline-block', flexShrink: 0,
                }} />
                <span style={{ fontWeight: 600, color: '#374151', width: 60 }}>{trend}</span>
                <span style={{ color: '#6b7280' }}>{label}</span>
              </div>
            ))}
            <div style={{
              borderTop: '1px solid #e5e7eb', marginTop: 8, paddingTop: 8, fontSize: 10, color: '#9ca3af',
              lineHeight: 1.6,
            }}>
              <span style={{ color: '#22c55e' }}>{'\u25CF\u25CF\u25CF'}</span> verified {'\u00B7'}{' '}
              <span style={{ color: '#d97706' }}>{'\u25CF\u25CF'}</span><span>{'\u25CB'}</span> partial {'\u00B7'}{' '}
              <span style={{ color: '#dc2626' }}>{'\u25CF'}</span><span>{'\u25CB\u25CB'}</span> conflicting
            </div>
          </div>
        </aside>
      </div>

      {/* FOOTER */}
      <footer style={{
        background: '#0c0f1a', borderTop: '1px solid #1e293b', padding: '20px 24px', marginTop: 32,
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <span style={{ color: '#f97316', fontWeight: 800, fontSize: 14, fontFamily: 'monospace' }}>DIURNA</span>
            <span style={{ color: '#475569', fontSize: 12, marginLeft: 12 }}>AI-Powered Sports Newsroom</span>
          </div>
          <div style={{ color: '#475569', fontSize: 11 }}>
            Powered by Lupon Media {'\u00B7'} {new Date().getFullYear()}
          </div>
        </div>
      </footer>

      {/* INLINE STYLES for hover effects + responsive */}
      <style>{`
        .newsroom-grid { grid-template-columns: 1fr 260px; }
        .stories-grid { grid-template-columns: 1fr 1fr; }
        .league-row:hover { background: #f8fafc !important; }
        .league-row:hover .league-remove { opacity: 1 !important; }
        @media (max-width: 768px) {
          .newsroom-grid { grid-template-columns: 1fr !important; }
          .newsroom-sidebar { order: 2; }
          .stories-grid { grid-template-columns: 1fr !important; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>
    </div>
  )
}
