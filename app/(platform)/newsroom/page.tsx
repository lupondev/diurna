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
  const [statusFilter, setStatusFilter] = useState('All')
  const [tagFilter, setTagFilter] = useState('')
  const [allTags, setAllTags] = useState<{ id: string; name: string }[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewTab, setPreviewTab] = useState<'preview' | 'edit' | 'seo'>('preview')
  const [sortBy, setSortBy] = useState('latest')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalArticles, setTotalArticles] = useState(0)
  const feedRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Smart Newsroom state
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([])
  const [trendingLoading, setTrendingLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'trending' | 'breaking' | 'fixtures' | 'fanbuzz' | 'stats' | 'feed'>('trending')
  const [generatingTopic, setGeneratingTopic] = useState<string | null>(null)
  const [genStep, setGenStep] = useState(0)
  const [genError, setGenError] = useState<string | null>(null)

  // New intelligence tabs state
  const [breakingNews, setBreakingNews] = useState<{ title: string; source: string; link: string; pubDate: string }[]>([])
  const [breakingLoading, setBreakingLoading] = useState(false)
  const [fixtures, setFixtures] = useState<{ id: number; date: string; status: string; elapsed: number | null; league: string; homeTeam: string; awayTeam: string; homeGoals: number | null; awayGoals: number | null }[]>([])
  const [liveMatches, setLiveMatches] = useState<{ id: number; elapsed: number | null; league: string; homeTeam: string; awayTeam: string; homeGoals: number | null; awayGoals: number | null }[]>([])
  const [fixturesLoading, setFixturesLoading] = useState(false)
  const [redditPosts, setRedditPosts] = useState<{ title: string; score: number; comments: number; link: string; subreddit: string; pubDate: string }[]>([])
  const [redditLoading, setRedditLoading] = useState(false)
  const [standings, setStandings] = useState<{ rank: number; team: string; points: number; played: number; won: number; drawn: number; lost: number; gf: number; ga: number; gd: number }[]>([])
  const [topScorers, setTopScorers] = useState<{ name: string; team: string; goals: number; appearances: number }[]>([])
  const [statsLoading, setStatsLoading] = useState(false)

  // Fetch trending intelligence
  useEffect(() => {
    setTrendingLoading(true)
    fetch('/api/newsroom/smart')
      .then((r) => r.json())
      .then((data) => {
        setTrendingTopics(data.topics || [])
        setTrendingLoading(false)
      })
      .catch(() => setTrendingLoading(false))
  }, [])

  // Lazy-load tab data on tab switch
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
        .then((data) => {
          setFixtures(data.fixtures || [])
          setLiveMatches(data.live || [])
        })
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
        .then((data) => {
          setStandings(data.standings || [])
          setTopScorers(data.topScorers || [])
        })
        .catch(() => {})
        .finally(() => setStatsLoading(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const loadArticles = useCallback((pageNum: number) => {
    setLoading(true)
    fetch(`/api/articles?page=${pageNum}&limit=20`)
      .then((r) => r.json())
      .then((data) => {
        const items = data.articles || data
        setArticles(items)
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages)
          setTotalArticles(data.pagination.total)
        }
        if (items.length > 0 && !selectedId) setSelectedId(items[0].id)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [selectedId])

  useEffect(() => {
    loadArticles(page)
    fetch('/api/tags')
      .then((r) => r.json())
      .then((data) =>
        setAllTags(data.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })))
      )
      .catch(() => {})
  }, [page, loadArticles])

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // One-click generate article from trending topic
  async function generateFromTopic(topic: TrendingTopic) {
    console.log('[Newsroom] generateFromTopic called:', topic.title, '| category:', topic.category, '| type:', topic.suggestedType)
    setGeneratingTopic(topic.id)
    setGenStep(0)
    setGenError(null)

    // Animate steps
    const stepInterval = setInterval(() => {
      setGenStep((prev) => {
        if (prev >= SMART_GEN_STEPS.length - 1) {
          clearInterval(stepInterval)
          return prev
        }
        return prev + 1
      })
    }, 1500)

    try {
      console.log('[Newsroom] Calling /api/ai/smart-generate...')
      const res = await fetch('/api/ai/smart-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.title,
          category: topic.category,
          articleType: topic.suggestedType,
        }),
      })

      clearInterval(stepInterval)

      if (!res.ok) {
        const err = await res.json()
        console.error('[Newsroom] smart-generate failed:', res.status, err)
        throw new Error(err.error || 'Generation failed')
      }

      const data = await res.json()
      console.log('[Newsroom] smart-generate response - title:', data.title, '| content length:', data.content?.length || 0, '| tiptapContent blocks:', data.tiptapContent?.content?.length || 0)
      setGenStep(SMART_GEN_STEPS.length)

      // Redirect to editor with pre-filled data
      const params = new URLSearchParams()
      params.set('smartGenerate', 'true')
      params.set('title', data.title || topic.title)
      if (data.excerpt) params.set('excerpt', data.excerpt)
      if (data.category) params.set('category', data.category)
      if (data.seo?.metaTitle) params.set('metaTitle', data.seo.metaTitle)
      if (data.seo?.metaDescription) params.set('metaDescription', data.seo.metaDescription)
      if (data.imageQuery) params.set('imageQuery', data.imageQuery)

      // Store generated content in sessionStorage for the editor to pick up
      sessionStorage.setItem('smartArticle', JSON.stringify(data))
      console.log('[Newsroom] Stored smartArticle in sessionStorage, redirecting to /editor...')

      setTimeout(() => {
        router.push(`/editor?${params.toString()}`)
      }, 800)
    } catch (err) {
      clearInterval(stepInterval)
      console.error('[Newsroom] generateFromTopic error:', err)
      setGenError(err instanceof Error ? err.message : 'Generation failed')
      setTimeout(() => {
        setGeneratingTopic(null)
        setGenError(null)
      }, 3000)
    }
  }

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
        case 't': {
          e.preventDefault()
          setActiveTab(activeTab === 'trending' ? 'feed' : 'trending')
          break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [filteredArticles, selectedId, selectedArticle, publishArticle, router, activeTab])

  const chipFilters = [
    { key: 'All', label: 'All' },
    { key: 'Queue', label: '📥 Queue' },
    { key: 'Published', label: '✓ Published' },
    { key: 'Scheduled', label: '📅 Scheduled' },
    { key: 'AI', label: '🤖 AI' },
  ]

  // Top 5 trending for the hot bar
  const topTrending = trendingTopics.slice(0, 5)

  return (
    <div className="nr5">
      {/* Top Header */}
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
            placeholder="Search articles, topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="nr5-search-shortcut">/</span>
        </div>
        <div className="nr5-head-actions">
          <Link href="/editor" className="nr5-btn nr5-btn-primary">✨ New Article</Link>
        </div>
      </div>

      {/* Trending Hot Bar */}
      {topTrending.length > 0 && (
        <div className="smart-hotbar">
          <div className="smart-hotbar-label">🔥 TRENDING NOW</div>
          <div className="smart-hotbar-items">
            {topTrending.map((topic) => (
              <button
                key={topic.id}
                className="smart-hotbar-item"
                onClick={() => { setActiveTab('trending') }}
              >
                <span className={`smart-hotbar-score ${topic.score >= 80 ? 'hot' : topic.score >= 50 ? 'warm' : 'cool'}`}>
                  {topic.score}
                </span>
                <span className="smart-hotbar-text">{topic.title}</span>
                <span className="smart-hotbar-cat">{categoryIcons[topic.category] || '📰'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="smart-tabs">
        {([
          { key: 'trending', icon: '🔥', label: 'TRENDING', count: trendingTopics.length },
          { key: 'breaking', icon: '📰', label: 'BREAKING', count: breakingNews.length },
          { key: 'fixtures', icon: '⚽', label: 'FIXTURES', count: fixtures.length + liveMatches.length },
          { key: 'fanbuzz', icon: '💬', label: 'FAN BUZZ', count: redditPosts.length },
          { key: 'stats', icon: '📊', label: 'STATS', count: standings.length },
          { key: 'feed', icon: '📰', label: 'ARTICLES', count: totalArticles },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            className={`smart-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon} {tab.label}
            {tab.count > 0 && <span className="smart-tab-count">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* ═══ TRENDING INTELLIGENCE TAB ═══ */}
      {activeTab === 'trending' && (
        <div className="smart-trending">
          {trendingLoading ? (
            <div className="smart-loading">
              <div className="smart-loading-spinner" />
              <div className="smart-loading-text">Scanning Google Trends, competitors, live matches...</div>
            </div>
          ) : trendingTopics.length === 0 ? (
            <div className="smart-empty">
              <div className="smart-empty-icon">🧠</div>
              <div className="smart-empty-title">No trending topics found</div>
              <div className="smart-empty-desc">Add competitor RSS feeds in Settings to enhance intelligence</div>
            </div>
          ) : (
            <div className="smart-grid">
              {trendingTopics.map((topic) => {
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
                      <div className={`smart-score-circle ${scoreClass}`}>
                        <span className="smart-score-num">{topic.score}</span>
                      </div>
                      <div className="smart-card-meta">
                        <span className={`smart-cat-badge ${categoryColors[topic.category] || 'cat-default'}`}>
                          {categoryIcons[topic.category] || '📰'} {topic.category}
                        </span>
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
                      {topic.sources.slice(0, 3).map((s, i) => (
                        <span key={i} className="smart-source-tag">{s}</span>
                      ))}
                      {topic.sources.length > 3 && (
                        <span className="smart-source-more">+{topic.sources.length - 3}</span>
                      )}
                    </div>

                    <div className="smart-card-actions">
                      <button
                        className="smart-generate-btn"
                        onClick={() => generateFromTopic(topic)}
                        disabled={!!generatingTopic}
                      >
                        {isGenerating ? 'Generating...' : '🤖 Generate Article'}
                      </button>
                      <button
                        className="smart-manual-btn"
                        onClick={() => router.push(`/editor?prompt=${encodeURIComponent(`Write a ${topic.suggestedType} about: ${topic.title}`)}`)}
                      >
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

      {/* ═══ BREAKING NEWS TAB ═══ */}
      {activeTab === 'breaking' && (
        <div className="smart-trending">
          {breakingLoading ? (
            <div className="smart-loading">
              <div className="smart-loading-spinner" />
              <div className="smart-loading-text">Fetching Google News...</div>
            </div>
          ) : breakingNews.length === 0 ? (
            <div className="smart-empty">
              <div className="smart-empty-icon">📰</div>
              <div className="smart-empty-title">No breaking news found</div>
              <div className="smart-empty-desc">Try again later</div>
            </div>
          ) : (
            <div className="smart-grid">
              {breakingNews.map((item, i) => (
                <div key={i} className="smart-card">
                  <div className="smart-card-top">
                    <div className="smart-score-circle warm">
                      <span className="smart-score-num" style={{ fontSize: 11 }}>NEW</span>
                    </div>
                    <div className="smart-card-meta">
                      <span className="smart-cat-badge cat-breaking">⚡ Breaking</span>
                      <span className="smart-velocity">{getTimeAgo(item.pubDate)}</span>
                    </div>
                  </div>
                  <h3 className="smart-card-title">{item.title}</h3>
                  <div className="smart-card-info">
                    <span className="smart-card-sources">{item.source}</span>
                  </div>
                  <div className="smart-card-actions">
                    <button
                      className="smart-generate-btn"
                      onClick={() => generateFromTopic({ id: `bn-${i}`, title: item.title, score: 75, sources: [item.source], sourcesCount: 1, category: 'General', suggestedType: 'breaking', velocity: 'rising', estimatedViews: '', traffic: '', recency: 0 })}
                      disabled={!!generatingTopic}
                    >
                      🤖 Generate Article
                    </button>
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="smart-manual-btn">
                      🔗 Source
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ FIXTURES TAB ═══ */}
      {activeTab === 'fixtures' && (
        <div className="smart-trending">
          {fixturesLoading ? (
            <div className="smart-loading">
              <div className="smart-loading-spinner" />
              <div className="smart-loading-text">Loading fixtures...</div>
            </div>
          ) : (
            <>
              {liveMatches.length > 0 && (
                <>
                  <div style={{ padding: '12px 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--coral)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    🔴 LIVE NOW
                  </div>
                  <div className="smart-grid">
                    {liveMatches.map((m) => (
                      <div key={m.id} className="smart-card" style={{ borderLeft: '3px solid var(--coral)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--coral)', textTransform: 'uppercase' }}>{m.league}</span>
                          <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--coral)', fontWeight: 700 }}>{m.elapsed}&apos;</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 12 }}>
                          <div style={{ textAlign: 'center', flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--g900)' }}>{m.homeTeam}</div>
                          </div>
                          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--mono)', color: 'var(--g900)' }}>
                            {m.homeGoals ?? 0} - {m.awayGoals ?? 0}
                          </div>
                          <div style={{ textAlign: 'center', flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--g900)' }}>{m.awayTeam}</div>
                          </div>
                        </div>
                        <div className="smart-card-actions">
                          <button
                            className="smart-generate-btn"
                            onClick={() => generateFromTopic({ id: `live-${m.id}`, title: `${m.homeTeam} ${m.homeGoals}-${m.awayGoals} ${m.awayTeam} - ${m.league} Live`, score: 90, sources: ['Live Match'], sourcesCount: 1, category: 'Sport', suggestedType: 'breaking', velocity: 'rising', estimatedViews: '', traffic: '', recency: 0 })}
                            disabled={!!generatingTopic}
                          >
                            ⚡ Live Report
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div style={{ padding: '12px 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--g500)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                📅 UPCOMING FIXTURES
              </div>
              <div className="smart-grid">
                {fixtures.map((f) => {
                  const matchDate = new Date(f.date)
                  const now = new Date()
                  const diffMs = matchDate.getTime() - now.getTime()
                  const diffH = Math.max(0, Math.floor(diffMs / 3600000))
                  const diffD = Math.floor(diffH / 24)
                  const countdown = diffD > 0 ? `${diffD}d ${diffH % 24}h` : diffH > 0 ? `${diffH}h` : 'Soon'

                  return (
                    <div key={f.id} className="smart-card">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--mint-d)', textTransform: 'uppercase' }}>{f.league}</span>
                        <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--g400)', background: 'var(--g50)', padding: '2px 8px', borderRadius: 8 }}>⏱ {countdown}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, margin: '16px 0' }}>
                        <div style={{ textAlign: 'center', flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--g900)' }}>{f.homeTeam}</div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--g400)' }}>vs</div>
                        <div style={{ textAlign: 'center', flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--g900)' }}>{f.awayTeam}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--g400)', textAlign: 'center', fontFamily: 'var(--mono)', marginBottom: 12 }}>
                        {matchDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} • {matchDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="smart-card-actions">
                        <button
                          className="smart-generate-btn"
                          onClick={() => generateFromTopic({ id: `fix-${f.id}`, title: `${f.homeTeam} vs ${f.awayTeam} - ${f.league} Preview`, score: 70, sources: ['API-Football'], sourcesCount: 1, category: 'Sport', suggestedType: 'preview', velocity: 'rising', estimatedViews: '', traffic: '', recency: 0 })}
                          disabled={!!generatingTopic}
                        >
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

      {/* ═══ FAN BUZZ TAB ═══ */}
      {activeTab === 'fanbuzz' && (
        <div className="smart-trending">
          {redditLoading ? (
            <div className="smart-loading">
              <div className="smart-loading-spinner" />
              <div className="smart-loading-text">Scanning Reddit football communities...</div>
            </div>
          ) : redditPosts.length === 0 ? (
            <div className="smart-empty">
              <div className="smart-empty-icon">💬</div>
              <div className="smart-empty-title">No fan discussions found</div>
              <div className="smart-empty-desc">Reddit feeds may be temporarily unavailable</div>
            </div>
          ) : (
            <div className="smart-grid">
              {redditPosts.map((post, i) => {
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
                      <button
                        className="smart-generate-btn"
                        onClick={() => generateFromTopic({ id: `rd-${i}`, title: post.title, score: Math.min(99, Math.floor((post.score || 0) / 100)), sources: [`r/${post.subreddit}`], sourcesCount: 1, category: 'Sport', suggestedType: 'report', velocity: 'rising', estimatedViews: '', traffic: '', recency: 0 })}
                        disabled={!!generatingTopic}
                      >
                        🤖 Generate Article
                      </button>
                      <a href={post.link} target="_blank" rel="noopener noreferrer" className="smart-manual-btn">
                        🔗 Reddit
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ STATS TAB ═══ */}
      {activeTab === 'stats' && (
        <div className="smart-trending" style={{ padding: '0 24px 24px' }}>
          {statsLoading ? (
            <div className="smart-loading">
              <div className="smart-loading-spinner" />
              <div className="smart-loading-text">Loading Premier League stats...</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
              {/* Standings Table */}
              <div className="adm-table" style={{ background: 'var(--wh)', borderRadius: 'var(--rl)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', fontWeight: 800, fontSize: 13, color: 'var(--g900)', borderBottom: '1px solid var(--g100)' }}>
                  🏆 Premier League Standings
                </div>
                <table>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--g400)', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid var(--g100)', background: 'var(--g50)' }}>#</th>
                      <th style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--g400)', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid var(--g100)', background: 'var(--g50)' }}>Team</th>
                      <th style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--g400)', textTransform: 'uppercase', textAlign: 'center', borderBottom: '1px solid var(--g100)', background: 'var(--g50)' }}>P</th>
                      <th style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--g400)', textTransform: 'uppercase', textAlign: 'center', borderBottom: '1px solid var(--g100)', background: 'var(--g50)' }}>W</th>
                      <th style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--g400)', textTransform: 'uppercase', textAlign: 'center', borderBottom: '1px solid var(--g100)', background: 'var(--g50)' }}>D</th>
                      <th style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--g400)', textTransform: 'uppercase', textAlign: 'center', borderBottom: '1px solid var(--g100)', background: 'var(--g50)' }}>L</th>
                      <th style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--g400)', textTransform: 'uppercase', textAlign: 'center', borderBottom: '1px solid var(--g100)', background: 'var(--g50)' }}>GD</th>
                      <th style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--mint-d)', textTransform: 'uppercase', textAlign: 'center', borderBottom: '1px solid var(--g100)', background: 'var(--g50)' }}>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((t) => (
                      <tr key={t.rank} style={{ borderBottom: '1px solid var(--g50)' }}>
                        <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: t.rank <= 4 ? 'var(--mint-d)' : 'var(--g400)', fontFamily: 'var(--mono)' }}>{t.rank}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: 'var(--g900)' }}>{t.team}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--g500)', textAlign: 'center', fontFamily: 'var(--mono)' }}>{t.played}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--g500)', textAlign: 'center', fontFamily: 'var(--mono)' }}>{t.won}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--g500)', textAlign: 'center', fontFamily: 'var(--mono)' }}>{t.drawn}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--g500)', textAlign: 'center', fontFamily: 'var(--mono)' }}>{t.lost}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: t.gd > 0 ? 'var(--mint-d)' : 'var(--coral)', textAlign: 'center', fontFamily: 'var(--mono)', fontWeight: 700 }}>{t.gd > 0 ? '+' : ''}{t.gd}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 800, color: 'var(--g900)', textAlign: 'center', fontFamily: 'var(--mono)' }}>{t.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Top Scorers */}
              <div style={{ background: 'var(--wh)', borderRadius: 'var(--rl)', border: '1px solid var(--brd)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', fontWeight: 800, fontSize: 13, color: 'var(--g900)', borderBottom: '1px solid var(--g100)' }}>
                  ⚽ Top Scorers
                </div>
                {topScorers.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--g50)' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: i < 3 ? 'var(--gold-l)' : 'var(--g100)', color: i < 3 ? 'var(--gold)' : 'var(--g400)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, fontFamily: 'var(--mono)' }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g900)' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--g400)' }}>{p.team}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--mint-d)', fontFamily: 'var(--mono)' }}>{p.goals}</div>
                      <div style={{ fontSize: 10, color: 'var(--g400)' }}>{p.appearances} apps</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ ARTICLE FEED TAB ═══ */}
      {activeTab === 'feed' && (
        <>
          {/* Stats Bar */}
          <div className="nr5-stats">
            <div className={`nr5-stat${statusFilter === 'Queue' ? ' active' : ''}`} onClick={() => setStatusFilter('Queue')}>
              <div className="nr5-stat-val coral">{stats.queue}</div>
              <div className="nr5-stat-label">In Queue</div>
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
              <div className="nr5-stat-label">Total</div>
            </div>
          </div>

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
              <span className="nr5-count">{totalArticles} articles</span>
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="nr5-pagination">
                  <button
                    className="nr5-page-btn"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    ← Prev
                  </button>
                  <span className="nr5-page-info">Page {page} of {totalPages}</span>
                  <button
                    className="nr5-page-btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next →
                  </button>
                </div>
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
        </>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="nr5-shortcuts">
        <div className="nr5-sc"><kbd>J</kbd><kbd>K</kbd> Navigate</div>
        <div className="nr5-sc"><kbd>P</kbd> Publish</div>
        <div className="nr5-sc"><kbd>/</kbd> Search</div>
        <div className="nr5-sc"><kbd>E</kbd> Edit</div>
        <div className="nr5-sc"><kbd>T</kbd> Toggle view</div>
      </div>
    </div>
  )
}
