'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'

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
  newsItems: string[]; summary?: ClusterSummary
}

interface Fixture {
  id: number; date: string; status: string; elapsed: number | null
  league: string; homeTeam: string; awayTeam: string
  homeGoals: number | null; awayGoals: number | null
}

interface TrendItem {
  title: string; traffic: string; link: string
}

type SectionKey = 'NEWS' | 'TRANSFERS' | 'MATCHES_TABLE' | 'STATISTICS' | 'INJURIES' | 'PLAYERS' | 'CLUBS' | 'VIDEO' | 'WATCH_LIVE'

// ─── Constants ───────────────────────────────────────────

const SECTIONS: { key: SectionKey; label: string; icon: string; hasData: boolean | string; eventTypes?: string[] }[] = [
  { key: 'NEWS', label: 'News', icon: '📰', hasData: true, eventTypes: ['BREAKING', 'SCANDAL', 'DISCIPLINE', 'RECORD', 'MANAGERIAL', 'TACTICAL', 'POST_MATCH_REACTION', 'MATCH_PREVIEW', 'MATCH_RESULT'] },
  { key: 'TRANSFERS', label: 'Transfers', icon: '🔄', hasData: true, eventTypes: ['TRANSFER', 'CONTRACT'] },
  { key: 'MATCHES_TABLE', label: 'Matches Table', icon: '📊', hasData: false },
  { key: 'STATISTICS', label: 'Statistics', icon: '📈', hasData: false },
  { key: 'INJURIES', label: 'Injuries', icon: '🏥', hasData: true, eventTypes: ['INJURY'] },
  { key: 'PLAYERS', label: 'Players', icon: '👤', hasData: false },
  { key: 'CLUBS', label: 'Clubs', icon: '🏟️', hasData: false },
  { key: 'VIDEO', label: 'Video', icon: '📹', hasData: 'scorebat' },
  { key: 'WATCH_LIVE', label: 'Watch Live', icon: '📺', hasData: false },
]

const TIME_FILTERS: { key: string; label: string; hours: number | null }[] = [
  { key: '1h', label: '1H', hours: 1 }, { key: '6h', label: '6H', hours: 6 },
  { key: '12h', label: '12H', hours: 12 }, { key: '24h', label: '24H', hours: 24 },
  { key: 'all', label: 'ALL', hours: null },
]

const TREND_COLORS: Record<string, string> = { SPIKING: '#dc2626', RISING: '#ea580c', STABLE: '#6b7280', FADING: '#d1d5db' }
const TREND_LABELS: Record<string, string> = { SPIKING: 'Write NOW', RISING: 'Cover soon', STABLE: 'Steady', FADING: 'Low priority' }

const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'P', 'LIVE', 'BT']

const LEAGUE_CLUB_MAP: Record<string, string[]> = {
  'Premier League': ['Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton', 'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 'Ipswich', 'Leicester', 'Liverpool', 'Manchester City', 'Manchester United', 'Newcastle', 'Nottingham Forest', 'Southampton', 'Tottenham', 'West Ham', 'Wolves'],
  'La Liga': ['Barcelona', 'Real Madrid', 'Atletico Madrid', 'Real Sociedad', 'Athletic Bilbao', 'Real Betis', 'Villarreal', 'Sevilla', 'Valencia', 'Girona', 'Celta Vigo', 'Mallorca', 'Las Palmas', 'Getafe', 'Osasuna', 'Rayo Vallecano', 'Alaves', 'Leganes', 'Espanyol', 'Valladolid'],
  'Serie A': ['AC Milan', 'Inter Milan', 'Juventus', 'Napoli', 'Roma', 'Lazio', 'Atalanta', 'Fiorentina', 'Bologna', 'Torino', 'Monza', 'Udinese', 'Sassuolo', 'Empoli', 'Cagliari', 'Genoa', 'Lecce', 'Verona', 'Frosinone', 'Salernitana'],
  'Bundesliga': ['Bayern Munich', 'Borussia Dortmund', 'RB Leipzig', 'Bayer Leverkusen', 'Stuttgart', 'Eintracht Frankfurt', 'Wolfsburg', 'Freiburg', 'Hoffenheim', 'Werder Bremen', 'Mainz', 'Augsburg', 'Union Berlin', 'Heidenheim', 'Darmstadt', 'Koln', 'Bochum', 'Monchengladbach'],
  'Ligue 1': ['PSG', 'Paris Saint-Germain', 'Marseille', 'Lyon', 'Monaco', 'Lille', 'Nice', 'Lens', 'Rennes', 'Strasbourg', 'Montpellier', 'Toulouse', 'Nantes', 'Reims', 'Brest', 'Le Havre', 'Lorient', 'Metz', 'Clermont'],
  'Champions League': ['Champions League', 'UCL', 'UEFA'],
}

const CLUB_ALIASES: Record<string, string[]> = {
  'Manchester City': ['Man City', 'MCFC', 'City'], 'Manchester United': ['Man Utd', 'Man United', 'MUFC', 'United'],
  'Tottenham': ['Tottenham Hotspur', 'Spurs'], 'Borussia Dortmund': ['BVB', 'Dortmund'],
  'Bayern Munich': ['Bayern', 'FCB'], 'Paris Saint-Germain': ['PSG'],
  'Atletico Madrid': ['Atletico', 'Atleti'], 'Inter Milan': ['Inter', 'Internazionale'],
  'AC Milan': ['Milan'], 'Real Madrid': ['Madrid', 'Real'], 'Barcelona': ['Barca', 'FCB'],
  'RB Leipzig': ['Leipzig'], 'Bayer Leverkusen': ['Leverkusen'],
}

interface LeagueItem { label: string; icon: string }
const DEFAULT_LEAGUES: LeagueItem[] = [
  { label: 'Premier League', icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' }, { label: 'La Liga', icon: '🇪🇸' },
  { label: 'Serie A', icon: '🇮🇹' }, { label: 'Bundesliga', icon: '🇩🇪' },
  { label: 'Ligue 1', icon: '🇫🇷' }, { label: 'Champions League', icon: '⭐' },
]

const GEO_OPTIONS = [
  { value: 'BA', label: '🇧🇦 BA' }, { value: 'US', label: '🇺🇸 US' },
  { value: 'GB', label: '🇬🇧 UK' }, { value: 'DE', label: '🇩🇪 DE' },
  { value: 'HR', label: '🇭🇷 HR' }, { value: 'RS', label: '🇷🇸 RS' },
]

const LS_KEY = 'diurna_my_leagues'

// ─── Helpers ─────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function filterByTime(clusters: Cluster[], hours: number | null): Cluster[] {
  if (!hours) return clusters
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
  const filtered = clusters.filter(c => new Date(c.latestItem) >= cutoff)
  // If a narrow window returns too few results, show at least 20 stories by DIS
  if (filtered.length < 20 && hours <= 6) {
    const sorted = [...clusters].sort((a, b) => b.dis - a.dis)
    return sorted.slice(0, 20)
  }
  return filtered
}

function filterBySection(clusters: Cluster[], sectionKey: SectionKey): Cluster[] {
  const section = SECTIONS.find(s => s.key === sectionKey)
  if (!section || !section.eventTypes) return clusters
  return clusters.filter(c => section.eventTypes!.includes(c.eventType))
}

function filterByLeague(clusters: Cluster[], leagueFilter: string | null): Cluster[] {
  if (!leagueFilter) return clusters
  const clubsInLeague = LEAGUE_CLUB_MAP[leagueFilter] || []
  return clusters.filter(c => {
    const fl = leagueFilter.toLowerCase()
    if (c.entities.some(e => e.toLowerCase().includes(fl))) return true
    if (c.primaryEntity.toLowerCase().includes(fl)) return true
    const filterWords = fl.split(' ')
    if (c.entities.some(e => { const el = e.toLowerCase(); return filterWords.every(w => el.includes(w)) })) return true
    const aliases = CLUB_ALIASES[leagueFilter] || []
    if (aliases.length > 0 && c.entities.some(e => aliases.some(a => e.toLowerCase().includes(a.toLowerCase())))) return true
    if (clubsInLeague.length > 0) return c.entities.some(e => clubsInLeague.some(club => e.toLowerCase().includes(club.toLowerCase())))
    return false
  })
}

function getSectionCount(sectionKey: SectionKey, clusters: Cluster[], timeHours: number | null): number | null {
  const section = SECTIONS.find(s => s.key === sectionKey)
  if (!section || section.hasData !== true) return null
  let filtered = clusters.filter(c => section.eventTypes!.includes(c.eventType))
  filtered = filterByTime(filtered, timeHours)
  return filtered.length
}

function formatMatchTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// ─── Sub-components ──────────────────────────────────────

function ConfidenceDots({ confidence }: { confidence: string }) {
  if (confidence === 'HIGH') return <span style={{ color: '#22c55e', fontSize: 11, letterSpacing: 1 }} title="High confidence">●●●</span>
  if (confidence === 'MEDIUM') return <span style={{ letterSpacing: 1, fontSize: 11 }} title="Medium confidence"><span style={{ color: '#d97706' }}>●●</span><span style={{ color: '#9ca3af' }}>○</span></span>
  return <span style={{ letterSpacing: 1, fontSize: 11 }} title="Low confidence"><span style={{ color: '#dc2626' }}>●</span><span style={{ color: '#9ca3af' }}>○○</span></span>
}

function TrendBadge({ trend }: { trend: string }) {
  const color = TREND_COLORS[trend] || '#6b7280'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, color: '#fff', background: color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {trend === 'SPIKING' && '🔴'}{trend === 'RISING' && '🟠'}{trend === 'STABLE' && '⚪'}{trend === 'FADING' && '🟤'} {trend}
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

function StoryCard({ c, expanded, onToggle, onWrite }: { c: Cluster; expanded: boolean; onToggle: () => void; onWrite: () => void }) {
  const [showSources, setShowSources] = useState(false)
  const trendColor = TREND_COLORS[c.trend] || '#6b7280'

  return (
    <div onClick={onToggle} style={{
      background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb',
      borderLeft: `3px solid ${trendColor}`, padding: '12px 14px', cursor: 'pointer', transition: 'box-shadow 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <TrendBadge trend={c.trend} />
        {c.hasConflicts && <span style={{ fontSize: 10, color: '#d97706', fontWeight: 600 }}>⚠ conflict</span>}
        <span style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 800, color: '#9ca3af', fontFamily: 'monospace' }}>{c.dis}</span>
      </div>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 6px', fontFamily: 'Georgia, serif', lineHeight: 1.35 }}>{c.title}</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
        <span>{c.sourceCount} src</span>
        {c.tier1Count > 0 && <span style={{ color: '#22c55e', fontWeight: 600 }}>★{c.tier1Count}</span>}
        <ConfidenceDots confidence={c.summary?.confidence || 'LOW'} />
        <span style={{ fontFamily: 'monospace' }}>{timeAgo(c.latestItem)}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {c.entities.slice(0, 3).map((e, i) => (
          <span key={i} style={{ fontSize: 10, background: '#f1f5f9', color: '#475569', padding: '2px 7px', borderRadius: 10, fontWeight: 500 }}>{e}</span>
        ))}
        {c.entities.length > 3 && <span style={{ fontSize: 10, color: '#9ca3af' }}>+{c.entities.length - 3}</span>}
      </div>

      {/* Write button always visible on cards */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <button onClick={(e) => { e.stopPropagation(); onWrite() }} style={{
          background: '#f97316', color: '#fff', border: 'none', borderRadius: 6,
          padding: '5px 12px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
        }}>✨ Write</button>
      </div>

      {expanded && (
        <div onClick={e => e.stopPropagation()} style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e5e7eb' }}>
          {c.summary && <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, margin: '0 0 10px' }}>{c.summary.summaryText}</p>}
          <div style={{ display: 'flex', gap: 8, marginBottom: showSources ? 10 : 0 }}>
            <button onClick={() => setShowSources(!showSources)} style={{
              background: showSources ? '#1e293b' : '#f1f5f9', color: showSources ? '#fff' : '#475569',
              border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}>
              {showSources ? 'Hide Sources' : `View Sources (${c.sourceCount})`}
            </button>
          </div>
          {showSources && c.summary?.mainClaims && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {c.summary.mainClaims.map((claim, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11 }}>
                  <span style={{ fontFamily: 'monospace', flexShrink: 0, color: claim.tier === 1 ? '#16a34a' : claim.tier === 2 ? '#2563eb' : '#9ca3af' }}>T{claim.tier}</span>
                  <span style={{ color: '#4b5563' }}>{claim.claim}</span>
                  <span style={{ color: '#9ca3af', flexShrink: 0 }}>({claim.sources.join(', ')})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Breaking News Alert Bar ─────────────────────────────

function BreakingAlert({ cluster, onWrite, onDismiss }: { cluster: Cluster; onWrite: () => void; onDismiss: () => void }) {
  return (
    <div style={{
      background: 'linear-gradient(90deg, #dc2626, #b91c1c)', color: '#fff',
      padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12,
      animation: 'pulse-bg 2s infinite', fontSize: 13,
    }}>
      <span style={{ fontSize: 16, animation: 'blink 1s step-end infinite' }}>🔴</span>
      <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>BREAKING</span>
      <span style={{ flex: 1, fontWeight: 600 }}>{cluster.title}</span>
      <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14 }}>DIS: {cluster.dis}</span>
      <button onClick={onWrite} style={{
        background: '#fff', color: '#dc2626', border: 'none', borderRadius: 6,
        padding: '5px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
      }}>✨ Write Article</button>
      <button onClick={onDismiss} style={{
        background: 'transparent', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 6,
        color: '#fff', padding: '5px 10px', fontSize: 11, cursor: 'pointer',
      }}>Dismiss</button>
    </div>
  )
}

// ─── Matches Strip ───────────────────────────────────────

function MatchesStrip({ fixtures, live, onWriteMatch }: {
  fixtures: Fixture[]; live: Fixture[]
  onWriteMatch: (f: Fixture) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const all = [...live, ...fixtures].slice(0, 15)

  if (all.length === 0) return null

  return (
    <div style={{ background: '#0c0f1a', borderBottom: '1px solid #1e293b', padding: '8px 0', overflowX: 'auto' }}>
      <div ref={scrollRef} style={{ display: 'flex', gap: 8, padding: '0 16px', minWidth: 'min-content' }} className="matches-strip">
        <span style={{ color: '#f97316', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', flexShrink: 0 }}>
          ⚽ TODAY
        </span>
        {all.map(f => {
          const isLive = LIVE_STATUSES.includes(f.status)
          const isFT = f.status === 'FT' || f.status === 'AET' || f.status === 'PEN'
          return (
            <div key={f.id} style={{
              background: isLive ? '#1a0a0a' : '#111827', border: `1px solid ${isLive ? '#dc2626' : '#1e293b'}`,
              borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0, position: 'relative',
            }}>
              {isLive && <span style={{
                position: 'absolute', top: -3, left: -3, width: 8, height: 8, borderRadius: '50%',
                background: '#dc2626', animation: 'pulse-dot 1.5s infinite',
              }} />}
              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{f.homeTeam}</span>
              <span style={{ color: isLive ? '#dc2626' : isFT ? '#22c55e' : '#64748b', fontFamily: 'monospace', fontWeight: 800, fontSize: 13 }}>
                {f.homeGoals !== null ? `${f.homeGoals}:${f.awayGoals}` : formatMatchTime(f.date)}
              </span>
              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{f.awayTeam}</span>
              <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'monospace' }}>
                {isLive ? `${f.elapsed}'` : isFT ? 'FT' : f.league?.split(' ')[0]}
              </span>
              <button onClick={() => onWriteMatch(f)} style={{
                background: '#f97316', color: '#fff', border: 'none', borderRadius: 4,
                padding: '2px 8px', fontSize: 9, fontWeight: 700, cursor: 'pointer',
              }}>✨</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Google Trends Sidebar ───────────────────────────────

function TrendsPanel({ onWriteTrend }: { onWriteTrend: (title: string) => void }) {
  const [trends, setTrends] = useState<TrendItem[]>([])
  const [geo, setGeo] = useState('BA')
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/trends?geo=${geo}`)
      .then(r => r.json() as Promise<{ trends?: TrendItem[] }>)
      .then(data => { setTrends(data.trends || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [geo])

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 14, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: collapsed ? 0 : 10, cursor: 'pointer' }}
        onClick={() => setCollapsed(!collapsed)}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#111827', flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
          🔥 Google Trends
        </span>
        <select
          value={geo}
          onClick={e => e.stopPropagation()}
          onChange={e => setGeo(e.target.value)}
          style={{ fontSize: 10, padding: '2px 4px', border: '1px solid #e5e7eb', borderRadius: 4, background: '#f8fafc', color: '#374151' }}
        >
          {GEO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span style={{ color: '#9ca3af', fontSize: 11 }}>{collapsed ? '▸' : '▾'}</span>
      </div>
      {!collapsed && (
        loading ? (
          <div style={{ textAlign: 'center', padding: 16, fontSize: 11, color: '#9ca3af' }}>Loading trends...</div>
        ) : trends.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 16, fontSize: 11, color: '#9ca3af' }}>No trends available</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 320, overflowY: 'auto' }}>
            {trends.slice(0, 15).map((t, i) => (
              <div key={i}
                onClick={() => onWriteTrend(t.title)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', borderRadius: 6,
                  cursor: 'pointer', fontSize: 11, transition: 'background 0.1s',
                }}
                className="trend-row"
              >
                <span style={{ fontFamily: 'monospace', color: '#9ca3af', fontSize: 10, width: 20, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                <span style={{ flex: 1, color: '#111827', fontWeight: 500, lineHeight: 1.3 }}>{t.title}</span>
                {t.traffic && <span style={{ fontSize: 9, color: '#6b7280', fontFamily: 'monospace', flexShrink: 0 }}>{t.traffic}</span>}
                <span style={{ fontSize: 9, color: '#f97316', fontWeight: 700, flexShrink: 0 }}>✨</span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────

export default function NewsroomPage() {
  const router = useRouter()
  const searchRef = useRef<HTMLInputElement>(null)
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading, setLoading] = useState(true)
  const [clusterMeta, setClusterMeta] = useState({ count: 0 })
  const [activeSection, setActiveSection] = useState<SectionKey>('NEWS')
  const [timeFilter, setTimeFilter] = useState<string>('24h')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeLeague, setActiveLeague] = useState<string | null>(null)
  const [leagues, setLeagues] = useState<LeagueItem[]>(DEFAULT_LEAGUES)
  const [showLeagueSearch, setShowLeagueSearch] = useState(false)
  const [leagueSearch, setLeagueSearch] = useState('')
  const [leagueResults, setLeagueResults] = useState<{ name: string; type: string }[]>([])

  // Matches & breaking
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [liveMatches, setLiveMatches] = useState<Fixture[]>([])
  const [dismissedBreaking, setDismissedBreaking] = useState<Set<string>>(new Set())

  // ─── Fetch clusters ─────────────────────────────────────
  const fetchClusters = useCallback(async () => {
    try {
      const res = await fetch('/api/newsroom/clusters?limit=50')
      const data = await res.json() as { clusters?: Cluster[]; count?: number }
      setClusters(data.clusters || [])
      setClusterMeta({ count: data.count || 0 })
    } catch { setClusters([]) }
    finally { setLoading(false) }
  }, [])

  // ─── Fetch fixtures ─────────────────────────────────────
  const fetchFixtures = useCallback(async () => {
    try {
      const res = await fetch('/api/newsroom/fixtures')
      const data = await res.json() as { fixtures?: Fixture[]; live?: Fixture[] }
      setFixtures(data.fixtures || [])
      setLiveMatches(data.live || [])
    } catch {}
  }, [])

  useEffect(() => {
    fetchClusters()
    fetchFixtures()
    const clusterInterval = setInterval(fetchClusters, 60000)
    const fixtureInterval = setInterval(fetchFixtures, 120000)
    return () => { clearInterval(clusterInterval); clearInterval(fixtureInterval) }
  }, [fetchClusters, fetchFixtures])

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

  useEffect(() => {
    if (leagueSearch.length < 2) { setLeagueResults([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/entities/search?q=${encodeURIComponent(leagueSearch)}`)
        const data = await res.json() as { entities?: { name: string; type: string }[] }
        setLeagueResults(data.entities || [])
      } catch { setLeagueResults([]) }
    }, 300)
    return () => clearTimeout(timer)
  }, [leagueSearch])

  useEffect(() => {
    if (activeSection === 'VIDEO') {
      const existing = document.getElementById('scorebat-jssdk')
      if (!existing) {
        const script = document.createElement('script')
        script.id = 'scorebat-jssdk'
        script.src = 'https://www.scorebat.com/embed/embed.js?v=arrv'
        document.body.appendChild(script)
      }
    }
  }, [activeSection])

  const saveLeagues = useCallback((updated: LeagueItem[]) => { setLeagues(updated); localStorage.setItem(LS_KEY, JSON.stringify(updated)) }, [])
  const addLeagueFromSearch = useCallback((name: string) => {
    if (leagues.some(l => l.label.toLowerCase() === name.toLowerCase())) { setLeagueSearch(''); setShowLeagueSearch(false); return }
    saveLeagues([...leagues, { label: name, icon: '🏆' }])
    setLeagueSearch(''); setShowLeagueSearch(false)
  }, [leagues, saveLeagues])
  const removeLeague = useCallback((label: string) => {
    saveLeagues(leagues.filter(l => l.label !== label))
    if (activeLeague === label) setActiveLeague(null)
  }, [leagues, activeLeague, saveLeagues])

  const activeTimeHours = TIME_FILTERS.find(t => t.key === timeFilter)?.hours ?? null
  const searchLower = search.toLowerCase()
  const currentSection = SECTIONS.find(s => s.key === activeSection)

  const filtered = useMemo(() => {
    if (!currentSection || currentSection.hasData !== true) return []
    let result = filterBySection(clusters, activeSection)
    result = filterByTime(result, activeTimeHours)
    result = filterByLeague(result, activeLeague)
    if (search) {
      result = result.filter(c => c.title.toLowerCase().includes(searchLower) || c.entities.some(e => e.toLowerCase().includes(searchLower)))
    }
    return result.sort((a, b) => b.dis - a.dis)
  }, [clusters, activeSection, activeTimeHours, activeLeague, search, searchLower, currentSection])

  // Breaking news: DIS > 70 in last 30 minutes
  const breakingCluster = useMemo(() => {
    const cutoff30m = new Date(Date.now() - 30 * 60 * 1000)
    return clusters.find(c => c.dis > 70 && new Date(c.latestItem) >= cutoff30m && !dismissedBreaking.has(c.id)) || null
  }, [clusters, dismissedBreaking])

  const topStory = filtered[0] || null
  const restStories = filtered.slice(1)

  // ─── Navigation helpers ─────────────────────────────────

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

  function writeFromMatch(f: Fixture) {
    const isLive = LIVE_STATUSES.includes(f.status)
    const isFT = f.status === 'FT' || f.status === 'AET'
    let prompt = ''
    if (isLive) {
      prompt = `LIVE match update: ${f.homeTeam} ${f.homeGoals}-${f.awayGoals} ${f.awayTeam} (${f.elapsed}') — ${f.league}`
    } else if (isFT) {
      prompt = `Match report: ${f.homeTeam} ${f.homeGoals}-${f.awayGoals} ${f.awayTeam} — ${f.league}`
    } else {
      prompt = `Match preview: ${f.homeTeam} vs ${f.awayTeam} — ${f.league}`
    }
    router.push(`/editor?prompt=${encodeURIComponent(prompt)}`)
  }

  function writeFromTrend(title: string) {
    router.push(`/editor?prompt=${encodeURIComponent(`Write an article about the trending topic: ${title}`)}`)
  }

  const isDataSection = currentSection?.hasData === true
  const isVideoSection = currentSection?.hasData === 'scorebat'
  const isComingSoon = !isDataSection && !isVideoSection

  return (
    <div style={{ background: '#f5f6f8', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* BREAKING NEWS ALERT */}
      {breakingCluster && (
        <BreakingAlert
          cluster={breakingCluster}
          onWrite={() => writeArticle(breakingCluster)}
          onDismiss={() => setDismissedBreaking(prev => { const next = new Set(prev); next.add(breakingCluster.id); return next })}
        />
      )}

      {/* MATCHES STRIP */}
      <MatchesStrip fixtures={fixtures} live={liveMatches} onWriteMatch={writeFromMatch} />

      {/* HEADER */}
      <header style={{
        background: '#0c0f1a', borderBottom: '1px solid #1e293b', padding: '0 24px',
        height: 52, display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 50,
      }}>
        <span style={{ color: '#f97316', fontWeight: 800, fontSize: 15, fontFamily: 'monospace', letterSpacing: 1, flexShrink: 0 }}>DIURNA</span>

        <nav style={{ display: 'flex', gap: 2, overflowX: 'auto', flexShrink: 1 }} className="section-nav">
          {SECTIONS.map(s => {
            const active = activeSection === s.key
            const count = getSectionCount(s.key, clusters, activeTimeHours)
            return (
              <button key={s.key} onClick={() => setActiveSection(s.key)} style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 6,
                border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                background: active ? '#1e293b' : 'transparent', color: active ? '#fff' : '#64748b', transition: 'all 0.15s',
              }}>
                <span>{s.icon}</span><span>{s.label}</span>
                {count !== null && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 10, fontFamily: 'monospace', background: active ? '#f97316' : '#334155', color: active ? '#fff' : '#94a3b8' }}>{count}</span>
                )}
              </button>
            )
          })}
        </nav>

        <div style={{ flex: 1 }} />

        <div style={{ position: 'relative', flexShrink: 0 }}>
          <input ref={searchRef} type="text" placeholder="Search stories..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '6px 32px 6px 10px', color: '#e2e8f0', fontSize: 12, width: 180, outline: 'none' }}
          />
          {search ? (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>✕</button>
          ) : (
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#475569', fontSize: 10, fontFamily: 'monospace' }}>/</span>
          )}
        </div>

        <button onClick={() => { fetchClusters(); fetchFixtures() }} style={{
          background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
          padding: '5px 8px', cursor: 'pointer', color: '#94a3b8', fontSize: 14, flexShrink: 0,
        }} title="Refresh">↻</button>

        <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, whiteSpace: 'nowrap' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          {clusterMeta.count} clusters
        </span>
      </header>

      {/* MAIN */}
      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: '16px 16px 0', display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16, flex: 1 }} className="newsroom-grid">
        {/* LEFT COLUMN */}
        <div>
          {/* COMING SOON */}
          {isComingSoon && (() => {
            const info: Record<string, { title: string; description: string; icon: string }> = {
              MATCHES_TABLE: { title: 'Matches & Fixtures', description: 'Live scores, upcoming fixtures, and match results will appear here.', icon: '📊' },
              STATISTICS: { title: 'Statistics', description: 'Player and team statistics, league tables, and performance data coming soon.', icon: '📈' },
              PLAYERS: { title: 'Players', description: 'Player profiles, stats, transfer history, and performance tracking.', icon: '👤' },
              CLUBS: { title: 'Clubs', description: 'Club profiles, squad lists, fixtures, and historical data.', icon: '🏟️' },
              WATCH_LIVE: { title: 'Watch Live', description: 'Live match streams and real-time coverage will be available here.', icon: '📺' },
            }
            const data = info[activeSection] || { title: currentSection?.label || '', description: 'This section is coming soon.', icon: currentSection?.icon || '' }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '96px 0', textAlign: 'center' }}>
                <span style={{ fontSize: 48, marginBottom: 16 }}>{data.icon}</span>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#374151', margin: '0 0 8px' }}>{data.title}</h3>
                <p style={{ fontSize: 13, color: '#9ca3af', maxWidth: 400, margin: '0 0 16px', lineHeight: 1.5 }}>{data.description}</p>
                <span style={{ padding: '6px 16px', background: '#f3f4f6', color: '#6b7280', fontSize: 11, fontFamily: 'monospace', borderRadius: 9999, fontWeight: 600 }}>Coming Soon</span>
              </div>
            )
          })()}

          {/* VIDEO / SCOREBAT */}
          {isVideoSection && (
            <div>
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>📹 Video Highlights</span>
                <span style={{ fontSize: 9, background: '#22c55e', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>FREE</span>
              </div>
              <div style={{ overflow: 'hidden', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                <div style={{ marginTop: -60 }}>
                  <iframe src="https://www.scorebat.com/embed/" frameBorder="0" width="100%" height="820" allowFullScreen allow="autoplay; fullscreen" style={{ display: 'block', overflow: 'hidden' }} />
                </div>
              </div>
            </div>
          )}

          {/* DATA SECTIONS */}
          {isDataSection && (
            <>
              <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{currentSection?.icon} {currentSection?.label}</span>
                <span style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>{filtered.length} {filtered.length === 1 ? 'story' : 'stories'}</span>
                {activeLeague && (
                  <span style={{ fontSize: 11, background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                    {activeLeague}
                    <button onClick={() => setActiveLeague(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', marginLeft: 4, fontSize: 11 }}>✕</button>
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {TIME_FILTERS.map(tf => (
                  <button key={tf.key} onClick={() => setTimeFilter(tf.key)} style={{
                    padding: '4px 12px', fontSize: 11, fontFamily: 'monospace', borderRadius: 4, cursor: 'pointer',
                    border: timeFilter === tf.key ? 'none' : '1px solid #e5e7eb',
                    background: timeFilter === tf.key ? '#111827' : '#fff', color: timeFilter === tf.key ? '#fff' : '#6b7280', fontWeight: 600,
                  }}>{tf.label}</button>
                ))}
              </div>

              {loading && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="stories-grid">
                  {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              )}

              {!loading && clusters.length === 0 && (
                <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📰</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>No stories available.</div>
                  <div style={{ fontSize: 12 }}>Run the cluster engine to generate stories.</div>
                </div>
              )}

              {!loading && clusters.length > 0 && filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
                  {search ? <div style={{ fontSize: 14 }}>No stories matching &apos;{search}&apos;</div>
                    : <div style={{ fontSize: 14 }}>No stories in {currentSection?.label}</div>}
                </div>
              )}

              {/* TOP STORY HERO */}
              {!loading && topStory && (
                <div style={{ background: '#0c0f1a', borderRadius: 12, padding: 0, marginBottom: 16, overflow: 'hidden' }}>
                  <div style={{ height: 3, background: 'linear-gradient(90deg, #f97316, #dc2626)' }} />
                  <div style={{ padding: '16px 20px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 4, background: '#f97316', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.8 }}>TOP STORY</span>
                      <TrendBadge trend={topStory.trend} />
                      <span style={{ fontSize: 18, fontWeight: 800, color: '#f97316', fontFamily: 'monospace', marginLeft: 'auto' }}>{topStory.dis}</span>
                    </div>
                    <h2 style={{ fontSize: 21, fontWeight: 700, color: '#f1f5f9', margin: '0 0 10px', fontFamily: 'Georgia, serif', lineHeight: 1.3, maxWidth: '88%' }}>{topStory.title}</h2>
                    {topStory.summary && <p style={{ fontSize: 13, color: '#7c8aa0', lineHeight: 1.5, margin: '0 0 14px' }}>{topStory.summary.summaryText}</p>}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                        <span style={{ color: '#94a3b8' }}>{topStory.sourceCount} sources</span>
                        {topStory.tier1Count > 0 && <span style={{ color: '#22c55e', fontWeight: 600 }}>★{topStory.tier1Count} tier-1</span>}
                        <ConfidenceDots confidence={topStory.summary?.confidence || 'LOW'} />
                        {topStory.hasConflicts && <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 600 }}>⚠ Sources conflict</span>}
                        <span style={{ color: '#475569', fontFamily: 'monospace', fontSize: 11 }}>{timeAgo(topStory.latestItem)}</span>
                      </div>
                      <button onClick={() => writeArticle(topStory)} style={{
                        background: '#f97316', color: '#fff', border: 'none', borderRadius: 6,
                        padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                      }}>✨ Write Article</button>
                    </div>
                  </div>
                </div>
              )}

              {/* STORY CARDS GRID */}
              {!loading && restStories.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }} className="stories-grid">
                  {restStories.map(c => (
                    <StoryCard key={c.id} c={c} expanded={expandedId === c.id}
                      onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
                      onWrite={() => writeArticle(c)} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* SIDEBAR */}
        <aside className="newsroom-sidebar">
          {/* Google Trends */}
          <TrendsPanel onWriteTrend={writeFromTrend} />

          {/* My Leagues */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 10 }}>🏆 My Leagues</div>
            {leagues.map(l => {
              const isActive = activeLeague === l.label
              return (
                <div key={l.label} className="league-row" style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 6,
                  cursor: 'pointer', fontSize: 12, fontWeight: isActive ? 700 : 500,
                  background: isActive ? '#dbeafe' : 'transparent', color: isActive ? '#1d4ed8' : '#374151', transition: 'background 0.15s',
                }} onClick={() => setActiveLeague(isActive ? null : l.label)}>
                  <span>{l.icon}</span>
                  <span style={{ flex: 1 }}>{l.label}</span>
                  <button className="league-remove" onClick={e => { e.stopPropagation(); removeLeague(l.label) }} style={{
                    background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 11, padding: '0 2px', opacity: 0, transition: 'opacity 0.15s',
                  }}>✕</button>
                </div>
              )
            })}
            {showLeagueSearch ? (
              <div style={{ marginTop: 6, position: 'relative' }}>
                <input autoFocus type="text" placeholder="Search leagues, clubs..." value={leagueSearch}
                  onChange={e => setLeagueSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') { setShowLeagueSearch(false); setLeagueSearch('') } }}
                  style={{ width: '100%', fontSize: 11, padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 4, outline: 'none' }} />
                {leagueResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, marginTop: 2, zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto' }}>
                    {leagueResults.map((ent, i) => (
                      <button key={i} onClick={() => addLeagueFromSearch(ent.name)} style={{
                        display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 10px',
                        border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, textAlign: 'left',
                      }} className="league-result-row">
                        <span style={{ color: '#6b7280', fontSize: 9, fontFamily: 'monospace', flexShrink: 0, background: '#f1f5f9', padding: '1px 4px', borderRadius: 3 }}>{ent.type}</span>
                        <span style={{ color: '#111827', fontWeight: 500 }}>{ent.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {leagueSearch.length >= 2 && leagueResults.length === 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, marginTop: 2, padding: '8px 10px', fontSize: 11, color: '#9ca3af' }}>No matches found</div>
                )}
              </div>
            ) : (
              <button onClick={() => setShowLeagueSearch(true)} style={{
                marginTop: 6, fontSize: 11, color: '#f97316', background: 'none',
                border: '1px dashed #f97316', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', width: '100%', fontWeight: 600,
              }}>+ Add League or Club</button>
            )}
          </div>

          {/* Signal Guide */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Signal Guide</div>
            {Object.entries(TREND_LABELS).map(([trend, label]) => (
              <div key={trend} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 11 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: TREND_COLORS[trend], display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontWeight: 600, color: '#374151', width: 60 }}>{trend}</span>
                <span style={{ color: '#6b7280' }}>{label}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 8, paddingTop: 8, fontSize: 10, color: '#9ca3af', lineHeight: 1.6 }}>
              <span style={{ color: '#22c55e' }}>●●●</span> verified · <span style={{ color: '#d97706' }}>●●</span><span>○</span> partial · <span style={{ color: '#dc2626' }}>●</span><span>○○</span> conflicting
            </div>
          </div>
        </aside>
      </div>

      {/* FOOTER */}
      <footer style={{ background: '#0c0f1a', borderTop: '1px solid #1e293b', padding: '20px 24px', marginTop: 32 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ color: '#f97316', fontWeight: 800, fontSize: 14, fontFamily: 'monospace' }}>DIURNA</span>
            <span style={{ color: '#475569', fontSize: 12, marginLeft: 12 }}>AI-Powered Sports Newsroom</span>
          </div>
          <div style={{ color: '#475569', fontSize: 11 }}>Powered by Lupon Media · {new Date().getFullYear()}</div>
        </div>
      </footer>

      <style>{`
        .newsroom-grid { grid-template-columns: 1fr 260px; }
        .stories-grid { grid-template-columns: 1fr 1fr; }
        .league-row:hover { background: #f8fafc !important; }
        .league-row:hover .league-remove { opacity: 1 !important; }
        .league-result-row:hover { background: #f8fafc; }
        .trend-row:hover { background: #f8fafc; }
        .section-nav { scrollbar-width: none; -ms-overflow-style: none; }
        .section-nav::-webkit-scrollbar { display: none; }
        .matches-strip { scrollbar-width: none; -ms-overflow-style: none; }
        .matches-strip::-webkit-scrollbar { display: none; }
        @media (max-width: 768px) {
          .newsroom-grid { grid-template-columns: 1fr !important; }
          .newsroom-sidebar { order: 2; }
          .stories-grid { grid-template-columns: 1fr !important; }
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes pulse-bg { 0%, 100% { opacity: 1; } 50% { opacity: 0.9; } }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.3); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>
    </div>
  )
}
