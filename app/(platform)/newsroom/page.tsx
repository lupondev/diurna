'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { StoryGapDetector, VelocityTracker } from '@/components/newsroom/intelligence-sidebar'
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

interface TrendingTopic {
  id: string
  title: string
  score: number
  sources: string[]
  sourcesCount: number
  category: string
  suggestedType: string
  velocity: string
  estimatedViews: string
  traffic: string
  recency: number
}

type BreakingItem = { title: string; source: string; link: string; pubDate: string }
type FixtureItem = { id: number; date: string; status: string; elapsed: number | null; league: string; homeTeam: string; awayTeam: string; homeGoals: number | null; awayGoals: number | null }
type LiveMatch = FixtureItem & { events?: { minute: number; type: string; detail: string; team: string }[] }
type RedditPost = { title: string; score: number; comments: number; link: string; subreddit: string; pubDate: string }
type YouTubeVideo = { title: string; channel: string; videoId: string; link: string; thumbnail: string; pubDate: string }

function getTimeAgo(date: string) {
  if (!date) return ''
  const parsed = new Date(date)
  if (isNaN(parsed.getTime())) return ''
  const diff = Date.now() - parsed.getTime()
  if (diff < 0) return 'just now'
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

const SOURCE_COLORS: Record<string, { bg: string; color: string }> = {
  'ESPN': { bg: '#dc2626', color: '#fff' },
  'ESPN FC': { bg: '#dc2626', color: '#fff' },
  'BBC': { bg: '#1a1a1a', color: '#fff' },
  'BBC Sport': { bg: '#1a1a1a', color: '#fff' },
  'Sky Sports': { bg: '#0369a1', color: '#fff' },
  'The Athletic': { bg: '#ea580c', color: '#fff' },
  'The Guardian': { bg: '#172554', color: '#fff' },
  'Guardian': { bg: '#172554', color: '#fff' },
  'Reuters': { bg: '#f97316', color: '#fff' },
  'AP News': { bg: '#dc2626', color: '#fff' },
  'Goal': { bg: '#1e3a5f', color: '#fff' },
  'Marca': { bg: '#dc2626', color: '#fff' },
  'L\'Equipe': { bg: '#1d4ed8', color: '#fff' },
}

function getSourceStyle(source: string) {
  for (const [key, style] of Object.entries(SOURCE_COLORS)) {
    if (source.toLowerCase().includes(key.toLowerCase())) return style
  }
  return { bg: 'var(--g200)', color: 'var(--g700)' }
}

const categoryColors: Record<string, string> = {
  'Sport': 'cat-green', 'Sports': 'cat-green', 'Football': 'cat-green',
  'Politics': 'cat-purple', 'Tech': 'cat-blue', 'Technology': 'cat-blue',
  'Business': 'cat-gold', 'Entertainment': 'cat-coral', 'Show': 'cat-coral',
  'Breaking': 'cat-breaking', 'General': 'cat-default',
}

const categoryIcons: Record<string, string> = {
  'Sport': '⚽', 'Politics': '🏛️', 'Tech': '💻', 'Business': '📊', 'Entertainment': '🎬', 'General': '📰',
}

const typeLabels: Record<string, string> = {
  'breaking': '⚡ Breaking', 'report': '📝 Report', 'analysis': '🔬 Analysis', 'preview': '👁️ Preview',
}

const velocityIcons: Record<string, string> = {
  'rising': '📈', 'peaked': '🔥', 'falling': '📉',
}

const SMART_GEN_STEPS = [
  'Analyzing trending topic...',
  'Generating original content...',
  'Creating poll & quiz...',
  'Optimizing SEO...',
  'Finalizing article package...',
]

export default function NewsroomPage() {
  const router = useRouter()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([])
  const [trendingLoading, setTrendingLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'trending' | 'breaking' | 'fixtures' | 'youtube' | 'fanbuzz' | 'transfers' | 'stats'>('trending')
  const [generatingTopic, setGeneratingTopic] = useState<string | null>(null)
  const [genStep, setGenStep] = useState(0)
  const [genError, setGenError] = useState<string | null>(null)

  const [breakingNews, setBreakingNews] = useState<BreakingItem[]>([])
  const [breakingLoading, setBreakingLoading] = useState(false)
  const [fixtures, setFixtures] = useState<FixtureItem[]>([])
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([])
  const [fixturesLoading, setFixturesLoading] = useState(false)
  const [redditPosts, setRedditPosts] = useState<RedditPost[]>([])
  const [redditLoading, setRedditLoading] = useState(false)
  const [standings, setStandings] = useState<{ rank: number; team: string; points: number; played: number; won: number; drawn: number; lost: number; gf: number; ga: number; gd: number }[]>([])
  const [topScorers, setTopScorers] = useState<{ name: string; team: string; goals: number; appearances: number }[]>([])
  const [statsLoading, setStatsLoading] = useState(false)
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideo[]>([])
  const [youtubeLoading, setYoutubeLoading] = useState(false)
  const [transferNews, setTransferNews] = useState<BreakingItem[]>([])
  const [transfersLoading, setTransfersLoading] = useState(false)

  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    setTrendingLoading(true)
    fetch('/api/newsroom/smart')
      .then((r) => r.json())
      .then((data) => { setTrendingTopics(data.topics || []); setTrendingLoading(false) })
      .catch(() => setTrendingLoading(false))

    fetch('/api/articles?limit=50')
      .then((r) => r.json())
      .then((data) => { setArticles(data.articles || data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (activeTab === 'breaking' && breakingNews.length === 0 && !breakingLoading) {
      setBreakingLoading(true)
      fetch('/api/newsroom/google-news')
        .then((r) => r.json())
        .then((data) => setBreakingNews(data.items || []))
        .catch(() => {})
        .finally(() => setBreakingLoading(false))
    }
    if (activeTab === 'fixtures' && fixtures.length === 0 && !fixturesLoading) {
      setFixturesLoading(true)
      fetch('/api/newsroom/fixtures')
        .then((r) => r.json())
        .then((data) => { setFixtures(data.fixtures || []); setLiveMatches(data.live || []) })
        .catch(() => {})
        .finally(() => setFixturesLoading(false))
    }
    if (activeTab === 'fanbuzz' && redditPosts.length === 0 && !redditLoading) {
      setRedditLoading(true)
      fetch('/api/newsroom/reddit')
        .then((r) => r.json())
        .then((data) => setRedditPosts(data.posts || []))
        .catch(() => {})
        .finally(() => setRedditLoading(false))
    }
    if (activeTab === 'stats' && standings.length === 0 && !statsLoading) {
      setStatsLoading(true)
      fetch('/api/newsroom/stats')
        .then((r) => r.json())
        .then((data) => { setStandings(data.standings || []); setTopScorers(data.topScorers || []) })
        .catch(() => {})
        .finally(() => setStatsLoading(false))
    }
    if (activeTab === 'youtube' && youtubeVideos.length === 0 && !youtubeLoading) {
      setYoutubeLoading(true)
      fetch('/api/newsroom/youtube')
        .then((r) => r.json())
        .then((data) => setYoutubeVideos(data.videos || []))
        .catch(() => {})
        .finally(() => setYoutubeLoading(false))
    }
    if (activeTab === 'transfers' && transferNews.length === 0 && !transfersLoading) {
      setTransfersLoading(true)
      fetch('/api/newsroom/google-news?q=football+transfer+official+confirmed')
        .then((r) => r.json())
        .then((data) => setTransferNews(data.items || []))
        .catch(() => {})
        .finally(() => setTransfersLoading(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const generateFromTopic = useCallback(async (topic: TrendingTopic) => {
    setGeneratingTopic(topic.id)
    setGenStep(0)
    setGenError(null)
    const stepInterval = setInterval(() => {
      setGenStep((prev) => { if (prev >= SMART_GEN_STEPS.length - 1) { clearInterval(stepInterval); return prev }; return prev + 1 })
    }, 1500)
    try {
      const res = await fetch('/api/ai/smart-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.title, category: topic.category, articleType: topic.suggestedType }),
      })
      clearInterval(stepInterval)
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Generation failed') }
      const data = await res.json()
      setGenStep(SMART_GEN_STEPS.length)
      sessionStorage.setItem('smartArticle', JSON.stringify(data))
      const params = new URLSearchParams()
      params.set('smartGenerate', 'true')
      params.set('title', data.title || topic.title)
      if (data.excerpt) params.set('excerpt', data.excerpt)
      if (data.category) params.set('category', data.category)
      setTimeout(() => { router.push(`/editor?${params.toString()}`) }, 800)
    } catch (err) {
      clearInterval(stepInterval)
      setGenError(err instanceof Error ? err.message : 'Generation failed')
      setTimeout(() => { setGeneratingTopic(null); setGenError(null) }, 3000)
    }
  }, [router])

  function rewriteArticle(title: string) {
    sessionStorage.setItem('editorTopic', title)
    router.push(`/editor?prompt=${encodeURIComponent(`Rewrite this news story in our editorial voice: ${title}`)}`)
  }

  const searchLower = search.toLowerCase()
  const filteredBreaking = breakingNews.filter(i => !search || i.title.toLowerCase().includes(searchLower))
  const filteredFixtures = fixtures.filter(i => !search || i.homeTeam.toLowerCase().includes(searchLower) || i.awayTeam.toLowerCase().includes(searchLower) || i.league.toLowerCase().includes(searchLower))
  const filteredLive = liveMatches.filter(i => !search || i.homeTeam.toLowerCase().includes(searchLower) || i.awayTeam.toLowerCase().includes(searchLower))
  const filteredReddit = redditPosts.filter(i => !search || i.title.toLowerCase().includes(searchLower))
  const filteredYoutube = youtubeVideos.filter(i => !search || i.title.toLowerCase().includes(searchLower) || i.channel.toLowerCase().includes(searchLower))
  const filteredTransfers = transferNews.filter(i => !search || i.title.toLowerCase().includes(searchLower))
  const filteredTrending = trendingTopics.filter(i => !search || i.title.toLowerCase().includes(searchLower))

  const topTrending = trendingTopics.slice(0, 5)

  const tabs = [
    { key: 'trending' as const, icon: '🔥', label: 'TRENDING', count: trendingTopics.length },
    { key: 'breaking' as const, icon: '📰', label: 'BREAKING', count: breakingNews.length },
    { key: 'fixtures' as const, icon: '⚽', label: 'FIXTURES', count: fixtures.length + liveMatches.length },
    { key: 'youtube' as const, icon: '📺', label: 'YOUTUBE', count: youtubeVideos.length },
    { key: 'fanbuzz' as const, icon: '💬', label: 'FAN BUZZ', count: redditPosts.length },
    { key: 'transfers' as const, icon: '🔄', label: 'TRANSFERS', count: transferNews.length },
    { key: 'stats' as const, icon: '📊', label: 'STATS', count: standings.length },
  ]

  return (
    <div className="nr5">
      <div className="nr5-head">
        <div className="nr5-head-left">
          <h1 className="nr5-title">Smart Newsroom</h1>
          <span className="nr5-live">AI POWERED</span>
        </div>
        <div className="nr5-search-box">
          <span className="nr5-search-icon">🔍</span>
          <input
            ref={searchRef}
            type="text"
            className="nr5-search-input"
            placeholder="Search across all tabs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button className="nr5-search-clear" onClick={() => setSearch('')}>✕</button>}
          <span className="nr5-search-shortcut">/</span>
        </div>
        <div className="nr5-head-actions">
          <button className="nr5-btn nr5-btn-secondary" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '◨' : '◧'} Intel
          </button>
          <Link href="/editor" className="nr5-btn nr5-btn-primary">✨ New Article</Link>
        </div>
      </div>

      {topTrending.length > 0 && (
        <div className="smart-hotbar">
          <div className="smart-hotbar-label">🔥 TRENDING NOW</div>
          <div className="smart-hotbar-items">
            {topTrending.map((topic) => (
              <button key={topic.id} className="smart-hotbar-item" onClick={() => setActiveTab('trending')}>
                <span className={`smart-hotbar-score ${topic.score >= 80 ? 'hot' : topic.score >= 50 ? 'warm' : 'cool'}`}>{topic.score}</span>
                <span className="smart-hotbar-text">{topic.title}</span>
                <span className="smart-hotbar-cat">{categoryIcons[topic.category] || '📰'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="smart-tabs">
        {tabs.map((tab) => (
          <button key={tab.key} className={`smart-tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
            {tab.icon} {tab.label}
            {tab.count > 0 && <span className="smart-tab-count">{tab.count}</span>}
          </button>
        ))}
      </div>

      <div className={`nr5-main-layout ${sidebarOpen ? 'with-sidebar' : ''}`}>
        <div className="nr5-main-content">
          {activeTab === 'trending' && (
            <div className="smart-trending">
              {trendingLoading ? (
                <div className="smart-loading"><div className="smart-loading-spinner" /><div className="smart-loading-text">Scanning Google Trends, competitors, live matches...</div></div>
              ) : filteredTrending.length === 0 ? (
                <div className="smart-empty"><div className="smart-empty-icon">🧠</div><div className="smart-empty-title">{search ? 'No matching topics' : 'No trending topics found'}</div><div className="smart-empty-desc">{search ? 'Try a different search' : 'Add competitor RSS feeds in Settings to enhance intelligence'}</div></div>
              ) : (
                <div className="smart-grid">
                  {filteredTrending.map((topic) => {
                    const isGenerating = generatingTopic === topic.id
                    const scoreClass = topic.score >= 80 ? 'hot' : topic.score >= 50 ? 'warm' : 'cool'
                    return (
                      <div key={topic.id} className={`smart-card ${isGenerating ? 'generating' : ''}`}>
                        {isGenerating && (
                          <div className="smart-card-overlay">
                            <div className="smart-card-gen-steps">
                              {SMART_GEN_STEPS.map((step, i) => (
                                <div key={i} className={`smart-gen-step ${i < genStep ? 'done' : ''} ${i === genStep ? 'active' : ''}`}>
                                  <span className="smart-gen-dot">{i < genStep ? '✓' : i === genStep ? '●' : '○'}</span>
                                  {step}
                                </div>
                              ))}
                              {genError && <div className="smart-gen-error">{genError}</div>}
                            </div>
                          </div>
                        )}
                        <div className="smart-card-top">
                          <div className={`smart-score-circle ${scoreClass}`}><span className="smart-score-num">{topic.score}</span></div>
                          <div className="smart-card-meta">
                            <span className={`smart-cat-badge ${categoryColors[topic.category] || 'cat-default'}`}>{categoryIcons[topic.category] || '📰'} {topic.category}</span>
                            <span className="smart-velocity">{velocityIcons[topic.velocity] || ''} {topic.velocity}</span>
                          </div>
                        </div>
                        <h3 className="smart-card-title">{topic.title}</h3>
                        <div className="smart-card-info">
                          <span className="smart-card-sources">{topic.sourcesCount} source{topic.sourcesCount !== 1 ? 's' : ''}</span>
                          {topic.traffic && <span className="smart-card-traffic">{topic.traffic} searches</span>}
                          <span className="smart-card-type">{typeLabels[topic.suggestedType] || topic.suggestedType}</span>
                        </div>
                        <div className="smart-card-estimate">{topic.estimatedViews}</div>
                        <div className="smart-card-sources-list">
                          {topic.sources.slice(0, 3).map((s, i) => (<span key={i} className="smart-source-tag">{s}</span>))}
                          {topic.sources.length > 3 && <span className="smart-source-more">+{topic.sources.length - 3}</span>}
                        </div>
                        <div className="smart-card-actions">
                          <button className="smart-generate-btn" onClick={() => generateFromTopic(topic)} disabled={!!generatingTopic}>
                            {isGenerating ? 'Generating...' : '🤖 Generate Article'}
                          </button>
                          <button className="smart-manual-btn" onClick={() => router.push(`/editor?prompt=${encodeURIComponent(`Write a ${topic.suggestedType} about: ${topic.title}`)}`)} >
                            ✏️ Manual
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'breaking' && (
            <div className="smart-trending">
              {breakingLoading ? (
                <div className="smart-loading"><div className="smart-loading-spinner" /><div className="smart-loading-text">Fetching Google News...</div></div>
              ) : filteredBreaking.length === 0 ? (
                <div className="smart-empty"><div className="smart-empty-icon">📰</div><div className="smart-empty-title">{search ? 'No matching news' : 'No breaking news found'}</div></div>
              ) : (
                <div className="breaking-list">
                  {filteredBreaking.map((item, i) => {
                    const srcStyle = getSourceStyle(item.source)
                    return (
                      <div key={i} className="breaking-card">
                        <div className="breaking-thumb" style={{ background: `linear-gradient(135deg, #0f172a 0%, #1e293b 100%)` }}>
                          <span className="breaking-thumb-icon">📰</span>
                        </div>
                        <div className="breaking-body">
                          <div className="breaking-top">
                            <span className="breaking-source" style={{ background: srcStyle.bg, color: srcStyle.color }}>{item.source}</span>
                            <span className="breaking-time">{getTimeAgo(item.pubDate)}</span>
                          </div>
                          <h3 className="breaking-title">{item.title}</h3>
                          <div className="breaking-actions">
                            <button className="breaking-btn rewrite" onClick={() => rewriteArticle(item.title)}>✍️ Rewrite</button>
                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="breaking-btn source">🔗 Source</a>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'fixtures' && (
            <div className="smart-trending">
              {fixturesLoading ? (
                <div className="smart-loading"><div className="smart-loading-spinner" /><div className="smart-loading-text">Loading fixtures...</div></div>
              ) : (
                <>
                  {filteredLive.length > 0 && (
                    <>
                      <div className="section-label live">🔴 LIVE NOW</div>
                      <div className="smart-grid">
                        {filteredLive.map((m) => (
                          <div key={m.id} className="smart-card live-card">
                            <div className="live-header">
                              <span className="live-league">{m.league}</span>
                              <span className="live-minute">{m.elapsed}&apos;</span>
                            </div>
                            <div className="live-score-row">
                              <div className="live-team">{m.homeTeam}</div>
                              <div className="live-score">{m.homeGoals ?? 0} - {m.awayGoals ?? 0}</div>
                              <div className="live-team">{m.awayTeam}</div>
                            </div>
                            {m.events && m.events.length > 0 && (
                              <div className="live-events">
                                {m.events.map((ev, ei) => (
                                  <div key={ei} className={`live-event ${ev.type}`}>
                                    <span className="live-event-min">{ev.minute}&apos;</span>
                                    <span className="live-event-icon">{ev.type === 'goal' ? '⚽' : ev.type === 'red' ? '🟥' : ev.type === 'yellow' ? '🟨' : '📋'}</span>
                                    <span className="live-event-text">{ev.detail}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {m.events && m.events.some(e => e.type === 'red' || (m.homeGoals !== null && m.awayGoals !== null && Math.abs(m.homeGoals - m.awayGoals) >= 2)) && (
                              <div className="moment-alert">
                                ⚡ MOMENT ALERT — Unusual scoreline detected
                                <button className="moment-btn" onClick={() => generateFromTopic({ id: `moment-${m.id}`, title: `${m.homeTeam} ${m.homeGoals}-${m.awayGoals} ${m.awayTeam} — ${m.league} Live Report`, score: 95, sources: ['Live Match'], sourcesCount: 1, category: 'Sport', suggestedType: 'breaking', velocity: 'rising', estimatedViews: '', traffic: '', recency: 0 })} disabled={!!generatingTopic}>
                                  Quick Generate
                                </button>
                              </div>
                            )}
                            <div className="smart-card-actions">
                              <button className="smart-generate-btn" onClick={() => generateFromTopic({ id: `live-${m.id}`, title: `${m.homeTeam} ${m.homeGoals}-${m.awayGoals} ${m.awayTeam} - ${m.league} Live`, score: 90, sources: ['Live Match'], sourcesCount: 1, category: 'Sport', suggestedType: 'breaking', velocity: 'rising', estimatedViews: '', traffic: '', recency: 0 })} disabled={!!generatingTopic}>
                                ⚡ Live Report
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="section-label">📅 UPCOMING FIXTURES</div>
                  <div className="smart-grid">
                    {filteredFixtures.map((f) => {
                      const matchDate = new Date(f.date)
                      const diffMs = matchDate.getTime() - Date.now()
                      const diffH = Math.max(0, Math.floor(diffMs / 3600000))
                      const diffD = Math.floor(diffH / 24)
                      const countdown = diffD > 0 ? `${diffD}d ${diffH % 24}h` : diffH > 0 ? `${diffH}h` : 'Soon'
                      return (
                        <div key={f.id} className="smart-card">
                          <div className="fixture-header">
                            <span className="fixture-league">{f.league}</span>
                            <span className="fixture-countdown">⏱ {countdown}</span>
                          </div>
                          <div className="live-score-row" style={{ margin: '16px 0' }}>
                            <div className="live-team">{f.homeTeam}</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--g400)' }}>vs</div>
                            <div className="live-team">{f.awayTeam}</div>
                          </div>
                          <div className="fixture-date">
                            {matchDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} • {matchDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="smart-card-actions">
                            <button className="smart-generate-btn" onClick={() => generateFromTopic({ id: `fix-${f.id}`, title: `${f.homeTeam} vs ${f.awayTeam} - ${f.league} Preview`, score: 70, sources: ['API-Football'], sourcesCount: 1, category: 'Sport', suggestedType: 'preview', velocity: 'rising', estimatedViews: '', traffic: '', recency: 0 })} disabled={!!generatingTopic}>
                              📝 Generate Preview
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'youtube' && (
            <div className="smart-trending">
              {youtubeLoading ? (
                <div className="smart-loading"><div className="smart-loading-spinner" /><div className="smart-loading-text">Loading YouTube feeds...</div></div>
              ) : filteredYoutube.length === 0 ? (
                <div className="smart-empty"><div className="smart-empty-icon">📺</div><div className="smart-empty-title">{search ? 'No matching videos' : 'No videos found'}</div></div>
              ) : (
                <div className="smart-grid">
                  {filteredYoutube.map((vid, i) => (
                    <div key={i} className="smart-card youtube-card">
                      <div className="yt-thumb">
                        <img src={vid.thumbnail} alt={vid.title} className="yt-thumb-img" />
                        <span className="yt-play">▶</span>
                      </div>
                      <h3 className="smart-card-title" style={{ marginTop: 12 }}>{vid.title}</h3>
                      <div className="smart-card-info">
                        <span className="smart-card-sources">{vid.channel}</span>
                        <span className="smart-velocity">{getTimeAgo(vid.pubDate)}</span>
                      </div>
                      <div className="smart-card-actions">
                        <button className="breaking-btn rewrite" onClick={() => {
                          sessionStorage.setItem('editorTopic', vid.title)
                          router.push(`/editor?prompt=${encodeURIComponent(`Write an article inspired by this video: ${vid.title}`)}`)
                        }}>
                          ✍️ Article from Video
                        </button>
                        <button className="breaking-btn source" onClick={() => {
                          navigator.clipboard.writeText(`<iframe width="560" height="315" src="https://www.youtube.com/embed/${vid.videoId}" frameborder="0" allowfullscreen></iframe>`)
                          alert('Embed code copied!')
                        }}>
                          📺 Embed
                        </button>
                        <a href={vid.link} target="_blank" rel="noopener noreferrer" className="breaking-btn source">🔗 Watch</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'fanbuzz' && (
            <div className="smart-trending">
              {redditLoading ? (
                <div className="smart-loading"><div className="smart-loading-spinner" /><div className="smart-loading-text">Scanning Reddit football communities...</div></div>
              ) : filteredReddit.length === 0 ? (
                <div className="smart-empty"><div className="smart-empty-icon">💬</div><div className="smart-empty-title">{search ? 'No matching discussions' : 'No fan discussions found'}</div></div>
              ) : (
                <div className="smart-grid">
                  {filteredReddit.map((post, i) => {
                    const heat = post.score >= 5000 ? 'hot' : post.score >= 1000 ? 'warm' : 'cool'
                    return (
                      <div key={i} className="smart-card">
                        <div className="smart-card-top">
                          <div className={`smart-score-circle ${heat}`}>
                            <span className="smart-score-num" style={{ fontSize: post.score >= 10000 ? 10 : 12 }}>
                              {post.score >= 1000 ? `${(post.score / 1000).toFixed(1)}k` : post.score || '—'}
                            </span>
                          </div>
                          <div className="smart-card-meta">
                            <span className="smart-cat-badge cat-green">r/{post.subreddit}</span>
                            <span className="smart-velocity">{getTimeAgo(post.pubDate)}</span>
                          </div>
                        </div>
                        <h3 className="smart-card-title">{post.title}</h3>
                        <div className="smart-card-info">
                          <span className="smart-card-sources">💬 {post.comments || 0} comments</span>
                          <span className="smart-card-traffic">⬆ {post.score || 0} upvotes</span>
                        </div>
                        <div className="smart-card-actions">
                          <button className="smart-generate-btn" onClick={() => generateFromTopic({ id: `rd-${i}`, title: post.title, score: Math.min(99, Math.floor((post.score || 0) / 100)), sources: [`r/${post.subreddit}`], sourcesCount: 1, category: 'Sport', suggestedType: 'report', velocity: 'rising', estimatedViews: '', traffic: '', recency: 0 })} disabled={!!generatingTopic}>
                            🤖 Generate Article
                          </button>
                          <a href={post.link} target="_blank" rel="noopener noreferrer" className="smart-manual-btn">🔗 Reddit</a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'transfers' && (
            <div className="smart-trending">
              {transfersLoading ? (
                <div className="smart-loading"><div className="smart-loading-spinner" /><div className="smart-loading-text">Scanning transfer news...</div></div>
              ) : filteredTransfers.length === 0 ? (
                <div className="smart-empty"><div className="smart-empty-icon">🔄</div><div className="smart-empty-title">{search ? 'No matching transfers' : 'No transfer news found'}</div></div>
              ) : (
                <div className="breaking-list">
                  {filteredTransfers.map((item, i) => {
                    const srcStyle = getSourceStyle(item.source)
                    return (
                      <div key={i} className="breaking-card">
                        <div className="breaking-thumb transfer-thumb">
                          <span className="breaking-thumb-icon">🔄</span>
                        </div>
                        <div className="breaking-body">
                          <div className="breaking-top">
                            <span className="breaking-source" style={{ background: srcStyle.bg, color: srcStyle.color }}>{item.source}</span>
                            <span className="breaking-time">{getTimeAgo(item.pubDate)}</span>
                          </div>
                          <h3 className="breaking-title">{item.title}</h3>
                          <div className="breaking-actions">
                            <button className="breaking-btn rewrite" onClick={() => {
                              sessionStorage.setItem('editorTopic', item.title)
                              router.push(`/editor?prompt=${encodeURIComponent(`Write a transfer analysis: ${item.title}`)}`)
                            }}>✍️ Write Analysis</button>
                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="breaking-btn source">🔗 Source</a>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="smart-trending" style={{ padding: '0 24px 24px' }}>
              {statsLoading ? (
                <div className="smart-loading"><div className="smart-loading-spinner" /><div className="smart-loading-text">Loading Premier League stats...</div></div>
              ) : (
                <div className="stats-layout">
                  <div className="stats-table-wrap">
                    <div className="stats-table-head">🏆 Premier League Standings</div>
                    <table className="stats-table">
                      <thead>
                        <tr>
                          <th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th className="pts">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((t) => (
                          <tr key={t.rank}>
                            <td className={t.rank <= 4 ? 'top4' : ''}>{t.rank}</td>
                            <td className="team-name">{t.team}</td>
                            <td>{t.played}</td><td>{t.won}</td><td>{t.drawn}</td><td>{t.lost}</td>
                            <td className={t.gd > 0 ? 'pos' : 'neg'}>{t.gd > 0 ? '+' : ''}{t.gd}</td>
                            <td className="pts-val">{t.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="scorers-wrap">
                    <div className="stats-table-head">⚽ Top Scorers</div>
                    {topScorers.map((p, i) => (
                      <div key={i} className="scorer-row">
                        <div className={`scorer-rank ${i < 3 ? 'top3' : ''}`}>{i + 1}</div>
                        <div className="scorer-info">
                          <div className="scorer-name">{p.name}</div>
                          <div className="scorer-team">{p.team}</div>
                        </div>
                        <div className="scorer-stats">
                          <div className="scorer-goals">{p.goals}</div>
                          <div className="scorer-apps">{p.appearances} apps</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {sidebarOpen && (
          <aside className="intel-sidebar">
            <StoryGapDetector breakingNews={breakingNews} articles={articles} />
            <VelocityTracker breakingNews={breakingNews} articles={articles} />
            <div className="intel-panel">
              <div className="intel-panel-head">
                <span className="intel-panel-icon">📊</span>
                <span className="intel-panel-title">Quick Stats</span>
              </div>
              <div className="intel-panel-body">
                <div className="intel-stat-row"><span>Published</span><span className="intel-stat-val">{articles.filter(a => a.status === 'PUBLISHED').length}</span></div>
                <div className="intel-stat-row"><span>Drafts</span><span className="intel-stat-val">{articles.filter(a => a.status === 'DRAFT').length}</span></div>
                <div className="intel-stat-row"><span>AI Generated</span><span className="intel-stat-val">{articles.filter(a => a.aiGenerated).length}</span></div>
                <div className="intel-stat-row"><span>News Sources</span><span className="intel-stat-val">{breakingNews.length}</span></div>
              </div>
            </div>
          </aside>
        )}
      </div>

      <div className="nr5-shortcuts">
        <div className="nr5-sc"><kbd>/</kbd> Search</div>
        <div className="nr5-sc"><kbd>T</kbd> Toggle sidebar</div>
      </div>
    </div>
  )
}
