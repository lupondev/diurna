'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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

function getDomain(link: string) {
  try { return new URL(link).hostname.replace('www.', '') } catch { return '' }
}

const SPORT_KEYWORDS = [
  'football', 'soccer', 'match', 'league', 'cup', 'transfer', 'goal', 'score',
  'premier league', 'la liga', 'champions league', 'serie a', 'bundesliga', 'ligue 1',
  'arsenal', 'chelsea', 'liverpool', 'manchester', 'man city', 'man utd', 'tottenham', 'newcastle',
  'real madrid', 'barcelona', 'bayern', 'psg', 'juventus', 'inter milan', 'ac milan', 'dortmund',
  'player', 'coach', 'manager', 'stadium', 'referee', 'var', 'penalty', 'red card',
  'world cup', 'euro', 'uefa', 'fifa', 'fa cup', 'carabao',
  'haaland', 'mbappe', 'salah', 'messi', 'ronaldo', 'bellingham', 'saka', 'vinicius',
  'nfl', 'nba', 'tennis', 'f1', 'formula', 'olympics', 'cricket', 'rugby',
  'athletic', 'sport', 'game', 'team', 'season', 'fixture', 'derby', 'final',
  'injury', 'signing', 'contract', 'loan', 'relegation', 'promotion', 'champion',
]

function isSportsTopic(title: string): boolean {
  const lower = title.toLowerCase()
  return SPORT_KEYWORDS.some(kw => lower.includes(kw))
}

const categoryIcons: Record<string, string> = {
  'Sport': '⚽', 'Politics': '🏛️', 'Tech': '💻', 'Business': '📊', 'Entertainment': '🎬', 'General': '📰',
}

const SMART_GEN_STEPS = [
  'Analyzing trending topic...',
  'Generating original content...',
  'Creating poll & quiz...',
  'Optimizing SEO...',
  'Finalizing article package...',
]

function isTopicHot(title: string, allItems: BreakingItem[]) {
  const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000
  const words = title.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  const recentItems = allItems.filter(i => {
    const d = new Date(i.pubDate).getTime()
    return !isNaN(d) && d > threeHoursAgo
  })
  let matches = 0
  for (const item of recentItems) {
    if (item.title === title) continue
    const itemWords = item.title.toLowerCase().split(/\s+/)
    const shared = words.filter(w => itemWords.includes(w))
    if (shared.length >= 2) matches++
  }
  return matches >= 5
}

const MOCK_BREAKING: BreakingItem[] = [
  { title: 'Arsenal extend Premier League lead with dominant win over Wolves', source: 'BBC Sport', link: 'https://bbc.co.uk/sport/football', pubDate: new Date(Date.now() - 1800000).toISOString() },
  { title: 'Haaland scores hat-trick as Man City thrash Everton 5-0', source: 'Sky Sports', link: 'https://skysports.com/football', pubDate: new Date(Date.now() - 3600000).toISOString() },
  { title: 'Liverpool confirm Salah contract extension through 2027', source: 'ESPN', link: 'https://espn.com/soccer', pubDate: new Date(Date.now() - 5400000).toISOString() },
  { title: 'Real Madrid eye summer move for Premier League midfielder', source: 'The Guardian', link: 'https://theguardian.com/football', pubDate: new Date(Date.now() - 7200000).toISOString() },
  { title: 'Champions League draw: Barcelona face Bayern Munich in quarter-finals', source: 'ESPN FC', link: 'https://espn.com/soccer', pubDate: new Date(Date.now() - 9000000).toISOString() },
  { title: 'VAR controversy overshadows Manchester derby as City snatch late equalizer', source: 'BBC Sport', link: 'https://bbc.co.uk/sport/football', pubDate: new Date(Date.now() - 10800000).toISOString() },
  { title: 'Newcastle United announce record commercial deal worth £40m per year', source: 'Sky Sports', link: 'https://skysports.com/football', pubDate: new Date(Date.now() - 14400000).toISOString() },
  { title: 'Tottenham sack manager after five consecutive Premier League defeats', source: 'The Athletic', link: 'https://theathletic.com/football', pubDate: new Date(Date.now() - 18000000).toISOString() },
  { title: 'Mbappe suffers hamstring injury, could miss Champions League tie', source: 'Marca', link: 'https://marca.com', pubDate: new Date(Date.now() - 21600000).toISOString() },
  { title: 'Chelsea youngster breaks through with stunning debut goal against Aston Villa', source: 'ESPN', link: 'https://espn.com/soccer', pubDate: new Date(Date.now() - 25200000).toISOString() },
]

const MOCK_TRANSFERS: BreakingItem[] = [
  { title: '[Fabrizio Romano] Arsenal complete signing of Spain international — here we go confirmed', source: 'The Guardian', link: 'https://theguardian.com/football', pubDate: new Date(Date.now() - 3600000).toISOString() },
  { title: 'Manchester United agree £65m fee for Bundesliga striker', source: 'Sky Sports', link: 'https://skysports.com/football', pubDate: new Date(Date.now() - 7200000).toISOString() },
  { title: 'Chelsea target Ajax defender as squad overhaul continues', source: 'ESPN', link: 'https://espn.com/soccer', pubDate: new Date(Date.now() - 10800000).toISOString() },
  { title: 'Liverpool identify La Liga winger as Salah long-term successor', source: 'The Athletic', link: 'https://theathletic.com/football', pubDate: new Date(Date.now() - 14400000).toISOString() },
  { title: 'Real Madrid to trigger €120m release clause for Premier League star', source: 'Marca', link: 'https://marca.com', pubDate: new Date(Date.now() - 18000000).toISOString() },
  { title: 'PSG offer Barcelona forward in swap deal for midfielder', source: 'ESPN FC', link: 'https://espn.com/soccer', pubDate: new Date(Date.now() - 21600000).toISOString() },
  { title: 'Tottenham close in on Serie A midfielder for £30m transfer', source: 'BBC Sport', link: 'https://bbc.co.uk/sport/football', pubDate: new Date(Date.now() - 25200000).toISOString() },
  { title: 'Newcastle enter race for Napoli winger rated at €80m', source: 'The Guardian', link: 'https://theguardian.com/football', pubDate: new Date(Date.now() - 36000000).toISOString() },
]

const MOCK_YOUTUBE: YouTubeVideo[] = [
  { title: 'HIGHLIGHTS | Real Madrid 3-1 Barcelona | El Clasico', channel: 'Real Madrid', videoId: '6stlCkUDG_s', link: 'https://www.youtube.com/watch?v=6stlCkUDG_s', thumbnail: 'https://i.ytimg.com/vi/6stlCkUDG_s/mqdefault.jpg', pubDate: new Date(Date.now() - 3600000).toISOString() },
  { title: 'Champions League BEST GOALS of the Week!', channel: 'UEFA Champions League', videoId: 'MFb3PCVyiGk', link: 'https://www.youtube.com/watch?v=MFb3PCVyiGk', thumbnail: 'https://i.ytimg.com/vi/MFb3PCVyiGk/mqdefault.jpg', pubDate: new Date(Date.now() - 7200000).toISOString() },
  { title: 'Transfer News LIVE: Latest Signings and Deals', channel: 'Sky Sports', videoId: 'Wz_DNrKVifQ', link: 'https://www.youtube.com/watch?v=Wz_DNrKVifQ', thumbnail: 'https://i.ytimg.com/vi/Wz_DNrKVifQ/mqdefault.jpg', pubDate: new Date(Date.now() - 14400000).toISOString() },
  { title: 'Premier League Preview: Matchday 28 Analysis', channel: 'ESPN FC', videoId: 'JHkA3te0dEY', link: 'https://www.youtube.com/watch?v=JHkA3te0dEY', thumbnail: 'https://i.ytimg.com/vi/JHkA3te0dEY/mqdefault.jpg', pubDate: new Date(Date.now() - 21600000).toISOString() },
  { title: 'Top 10 Goals | Premier League 2024/25', channel: 'Premier League', videoId: 'TkwF2dOGjY4', link: 'https://www.youtube.com/watch?v=TkwF2dOGjY4', thumbnail: 'https://i.ytimg.com/vi/TkwF2dOGjY4/mqdefault.jpg', pubDate: new Date(Date.now() - 54000000).toISOString() },
  { title: 'Tactical Breakdown: How Arsenal Dominated the League', channel: 'The Athletic FC', videoId: 'v0IjjKXGvLQ', link: 'https://www.youtube.com/watch?v=v0IjjKXGvLQ', thumbnail: 'https://i.ytimg.com/vi/v0IjjKXGvLQ/mqdefault.jpg', pubDate: new Date(Date.now() - 86400000).toISOString() },
]

const MOCK_REDDIT: RedditPost[] = [
  { title: 'Salah breaks Premier League assist record with stunning through ball', score: 12400, comments: 1823, link: 'https://reddit.com', subreddit: 'soccer', pubDate: new Date(Date.now() - 1800000).toISOString() },
  { title: '[Fabrizio Romano] Arsenal complete signing of midfielder — here we go confirmed', score: 9800, comments: 2105, link: 'https://reddit.com', subreddit: 'soccer', pubDate: new Date(Date.now() - 3600000).toISOString() },
  { title: 'Post Match Thread: Real Madrid 3-2 Barcelona [La Liga]', score: 8200, comments: 4521, link: 'https://reddit.com', subreddit: 'soccer', pubDate: new Date(Date.now() - 7200000).toISOString() },
  { title: 'VAR decision in City vs Liverpool sparks massive debate', score: 7600, comments: 3200, link: 'https://reddit.com', subreddit: 'PremierLeague', pubDate: new Date(Date.now() - 10800000).toISOString() },
  { title: 'Haaland scores hat-trick to go top of Golden Boot race', score: 6100, comments: 890, link: 'https://reddit.com', subreddit: 'PremierLeague', pubDate: new Date(Date.now() - 14400000).toISOString() },
  { title: 'Bayern Munich sack manager after Champions League exit', score: 5400, comments: 1450, link: 'https://reddit.com', subreddit: 'soccer', pubDate: new Date(Date.now() - 18000000).toISOString() },
]

export default function NewsroomPage() {
  const router = useRouter()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([])
  const [trendingLoading, setTrendingLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'breaking' | 'transfers' | 'live' | 'youtube' | 'fanbuzz'>('breaking')
  const [generatingTopic, setGeneratingTopic] = useState<string | null>(null)
  const [genStep, setGenStep] = useState(0)
  const [genError, setGenError] = useState<string | null>(null)

  const [activeTrend, setActiveTrend] = useState<string | null>(null)
  const [opportunitiesOpen, setOpportunitiesOpen] = useState(true)

  const [breakingNews, setBreakingNews] = useState<BreakingItem[]>([])
  const [breakingLoading, setBreakingLoading] = useState(false)
  const [fixtures, setFixtures] = useState<FixtureItem[]>([])
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([])
  const [fixturesLoading, setFixturesLoading] = useState(false)
  const [redditPosts, setRedditPosts] = useState<RedditPost[]>([])
  const [redditLoading, setRedditLoading] = useState(false)
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideo[]>([])
  const [youtubeLoading, setYoutubeLoading] = useState(false)
  const [transferNews, setTransferNews] = useState<BreakingItem[]>([])
  const [transfersLoading, setTransfersLoading] = useState(false)

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

    setBreakingLoading(true)
    fetch('/api/newsroom/google-news')
      .then((r) => r.json())
      .then((data) => {
        const items = data.items || []
        setBreakingNews(items.length > 0 ? items : MOCK_BREAKING)
      })
      .catch(() => setBreakingNews(MOCK_BREAKING))
      .finally(() => setBreakingLoading(false))
  }, [])

  useEffect(() => {
    if (activeTab === 'live' && fixtures.length === 0 && !fixturesLoading) {
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
        .then((data) => {
          const posts = data.posts || []
          setRedditPosts(posts.length > 0 ? posts : MOCK_REDDIT)
        })
        .catch(() => setRedditPosts(MOCK_REDDIT))
        .finally(() => setRedditLoading(false))
    }
    if (activeTab === 'youtube' && youtubeVideos.length === 0 && !youtubeLoading) {
      setYoutubeLoading(true)
      fetch('/api/newsroom/youtube')
        .then((r) => r.json())
        .then((data) => {
          const vids = data.videos || []
          setYoutubeVideos(vids.length > 0 ? vids : MOCK_YOUTUBE)
        })
        .catch(() => setYoutubeVideos(MOCK_YOUTUBE))
        .finally(() => setYoutubeLoading(false))
    }
    if (activeTab === 'transfers' && transferNews.length === 0 && !transfersLoading) {
      setTransfersLoading(true)
      fetch('/api/newsroom/google-news?q=football+transfer+official+confirmed')
        .then((r) => r.json())
        .then((data) => {
          const items = data.items || []
          setTransferNews(items.length > 0 ? items : MOCK_TRANSFERS)
        })
        .catch(() => setTransferNews(MOCK_TRANSFERS))
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
  const trendLower = activeTrend?.toLowerCase() || ''

  function matchesTrend(text: string) {
    if (!trendLower) return true
    return text.toLowerCase().includes(trendLower)
  }

  const filteredBreaking = breakingNews.filter(i => (!search || i.title.toLowerCase().includes(searchLower)) && matchesTrend(i.title))
  const filteredLive = liveMatches.filter(i => (!search || i.homeTeam.toLowerCase().includes(searchLower) || i.awayTeam.toLowerCase().includes(searchLower)) && (matchesTrend(i.homeTeam) || matchesTrend(i.awayTeam) || matchesTrend(i.league)))
  const filteredFixtures = fixtures.filter(i => (!search || i.homeTeam.toLowerCase().includes(searchLower) || i.awayTeam.toLowerCase().includes(searchLower) || i.league.toLowerCase().includes(searchLower)) && (matchesTrend(i.homeTeam) || matchesTrend(i.awayTeam) || matchesTrend(i.league)))
  const filteredReddit = redditPosts.filter(i => (!search || i.title.toLowerCase().includes(searchLower)) && matchesTrend(i.title))
  const filteredYoutube = youtubeVideos.filter(i => (!search || i.title.toLowerCase().includes(searchLower) || i.channel.toLowerCase().includes(searchLower)) && matchesTrend(i.title))
  const filteredTransfers = transferNews.filter(i => (!search || i.title.toLowerCase().includes(searchLower)) && matchesTrend(i.title))

  const sportsTrending = useMemo(() => {
    return trendingTopics.filter(t => t.category === 'Sport' || isSportsTopic(t.title))
  }, [trendingTopics])

  const topTrending = sportsTrending.slice(0, 5)

  const tabs = [
    { key: 'breaking' as const, icon: '📰', label: 'BREAKING', count: breakingNews.length },
    { key: 'transfers' as const, icon: '🔄', label: 'TRANSFERS', count: transferNews.length },
    { key: 'live' as const, icon: '⚽', label: 'LIVE', count: liveMatches.length },
    { key: 'youtube' as const, icon: '📺', label: 'YOUTUBE', count: youtubeVideos.length },
    { key: 'fanbuzz' as const, icon: '💬', label: 'FAN BUZZ', count: redditPosts.length },
  ]

  const opportunities = useMemo(() => {
    if (sportsTrending.length === 0 || loading) return []
    const articleTitlesLower = articles.map(a => a.title.toLowerCase()).join(' ')
    const gaps: { topic: string; sources: number }[] = []
    for (const trend of sportsTrending) {
      const tLower = trend.title.toLowerCase()
      if (!articleTitlesLower.includes(tLower) && !articles.some(a => {
        const aWords = a.title.toLowerCase().split(/\s+/).filter(w => w.length > 3)
        const tWords = tLower.split(/\s+/).filter(w => w.length > 3)
        const overlap = tWords.filter(w => aWords.includes(w)).length
        return overlap >= 2
      })) {
        gaps.push({ topic: trend.title, sources: trend.sourcesCount })
      }
    }
    return gaps.slice(0, 3)
  }, [sportsTrending, articles, loading])

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
      </div>

      {topTrending.length > 0 && (
        <div className="smart-hotbar">
          <div className="smart-hotbar-label">🔥 TRENDING NOW</div>
          <div className="smart-hotbar-items">
            {topTrending.map((topic) => (
              <button
                key={topic.id}
                className={`smart-hotbar-item ${activeTrend === topic.title ? 'active' : ''}`}
                onClick={() => setActiveTrend(activeTrend === topic.title ? null : topic.title)}
              >
                <span className={`smart-hotbar-score ${topic.score >= 80 ? 'hot' : topic.score >= 50 ? 'warm' : 'cool'}`}>{topic.score}</span>
                <span className="smart-hotbar-text">{topic.title}</span>
                <span className="smart-hotbar-cat">{categoryIcons[topic.category] || '⚽'}</span>
              </button>
            ))}
            {activeTrend && (
              <button className="smart-hotbar-clear" onClick={() => setActiveTrend(null)}>✕ Clear</button>
            )}
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

      <div className="nr5-main-layout">
        <div className="nr5-main-content">
          {activeTab === 'breaking' && (
            <div className="smart-trending">
              {breakingLoading ? (
                <div className="smart-loading"><div className="smart-loading-spinner" /><div className="smart-loading-text">Fetching Google News...</div></div>
              ) : filteredBreaking.length === 0 ? (
                <div className="smart-empty"><div className="smart-empty-icon">📰</div><div className="smart-empty-title">{search || activeTrend ? 'No matching news' : 'No breaking news found'}</div></div>
              ) : (
                <div className="breaking-list">
                  {filteredBreaking.map((item, i) => {
                    const srcStyle = getSourceStyle(item.source)
                    const hot = isTopicHot(item.title, breakingNews)
                    const domain = getDomain(item.link)
                    return (
                      <div key={i} className="breaking-card-v3">
                        <div className="breaking-v3-top">
                          <span className="breaking-source" style={{ background: srcStyle.bg, color: srcStyle.color }}>{item.source}</span>
                          {hot && <span className="velocity-badge-hot">HOT</span>}
                          <span className="breaking-time">{getTimeAgo(item.pubDate)}</span>
                        </div>
                        <h3 className="breaking-title">{item.title}</h3>
                        <div className="breaking-v3-bottom">
                          <button className="breaking-btn rewrite" onClick={() => rewriteArticle(item.title)}>✍️ Rewrite</button>
                          {domain && <a href={item.link} target="_blank" rel="noopener noreferrer" className="breaking-btn source">{domain} →</a>}
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
                <div className="smart-empty"><div className="smart-empty-icon">🔄</div><div className="smart-empty-title">{search || activeTrend ? 'No matching transfers' : 'No transfer news found'}</div></div>
              ) : (
                <div className="breaking-list">
                  {filteredTransfers.map((item, i) => {
                    const srcStyle = getSourceStyle(item.source)
                    const hot = isTopicHot(item.title, transferNews)
                    const domain = getDomain(item.link)
                    return (
                      <div key={i} className="breaking-card-v3">
                        <div className="breaking-v3-top">
                          <span className="breaking-source" style={{ background: srcStyle.bg, color: srcStyle.color }}>{item.source}</span>
                          {hot && <span className="velocity-badge-hot">HOT</span>}
                          <span className="breaking-time">{getTimeAgo(item.pubDate)}</span>
                        </div>
                        <h3 className="breaking-title">{item.title}</h3>
                        <div className="breaking-v3-bottom">
                          <button className="breaking-btn rewrite" onClick={() => {
                            sessionStorage.setItem('editorTopic', item.title)
                            router.push(`/editor?prompt=${encodeURIComponent(`Write a transfer analysis: ${item.title}`)}`)
                          }}>✍️ Rewrite</button>
                          {domain && <a href={item.link} target="_blank" rel="noopener noreferrer" className="breaking-btn source">{domain} →</a>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'live' && (
            <div className="smart-trending">
              {fixturesLoading ? (
                <div className="smart-loading"><div className="smart-loading-spinner" /><div className="smart-loading-text">Loading fixtures...</div></div>
              ) : (
                <>
                  {filteredLive.length > 0 ? (
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
                            <div className="smart-card-actions">
                              <button className="smart-generate-btn" onClick={() => generateFromTopic({ id: `live-${m.id}`, title: `${m.homeTeam} ${m.homeGoals}-${m.awayGoals} ${m.awayTeam} - ${m.league} Live`, score: 90, sources: ['Live Match'], sourcesCount: 1, category: 'Sport', suggestedType: 'breaking', velocity: 'rising', estimatedViews: '', traffic: '', recency: 0 })} disabled={!!generatingTopic}>
                                ⚡ Live Report
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="smart-empty">
                      <div className="smart-empty-icon">⚽</div>
                      <div className="smart-empty-title">No live matches right now</div>
                      {fixtures.length > 0 && (
                        <div className="smart-empty-desc">
                          Next: {fixtures[0].homeTeam} vs {fixtures[0].awayTeam} in {(() => {
                            const d = new Date(fixtures[0].date).getTime() - Date.now()
                            const h = Math.max(0, Math.floor(d / 3600000))
                            return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h`
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                  {filteredFixtures.length > 0 && (
                    <>
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
                </>
              )}
            </div>
          )}

          {activeTab === 'youtube' && (
            <div className="smart-trending">
              {youtubeLoading ? (
                <div className="smart-loading"><div className="smart-loading-spinner" /><div className="smart-loading-text">Loading YouTube feeds...</div></div>
              ) : filteredYoutube.length === 0 ? (
                <div className="smart-empty"><div className="smart-empty-icon">📺</div><div className="smart-empty-title">{search || activeTrend ? 'No matching videos' : 'No videos found'}</div></div>
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
                        <a href={vid.link} target="_blank" rel="noopener noreferrer" className="breaking-btn source">▶ Watch</a>
                        <button className="breaking-btn rewrite" onClick={() => {
                          sessionStorage.setItem('editorTopic', vid.title)
                          router.push(`/editor?prompt=${encodeURIComponent(`Write an article inspired by this video: ${vid.title}`)}`)
                        }}>
                          ✍️ Article from Video
                        </button>
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
                <div className="smart-empty"><div className="smart-empty-icon">💬</div><div className="smart-empty-title">{search || activeTrend ? 'No matching discussions' : 'No fan discussions found'}</div></div>
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
                            ✍️ Write About This
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
        </div>
      </div>

      {opportunitiesOpen && opportunities.length > 0 && (
        <div className="opportunities-bar">
          <div className="opportunities-label">💡 GAPS</div>
          <div className="opportunities-items">
            {opportunities.map((gap, i) => (
              <div key={i} className="opportunity-card">
                <div className="opportunity-topic">{gap.topic}</div>
                <div className="opportunity-meta">trending in {gap.sources} sources · you have 0 articles</div>
                <button className="opportunity-btn" onClick={() => {
                  sessionStorage.setItem('editorTopic', gap.topic)
                  router.push(`/editor?prompt=${encodeURIComponent(`Write an article about: ${gap.topic}`)}`)
                }}>Fill Gap</button>
              </div>
            ))}
          </div>
          <button className="opportunities-close" onClick={() => setOpportunitiesOpen(false)}>✕</button>
        </div>
      )}

      <div className="nr5-shortcuts">
        <div className="nr5-sc"><kbd>/</kbd> Search</div>
      </div>
    </div>
  )
}
