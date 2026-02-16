'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import './newsroom.css'

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
  tags?: { tag: { id: string; name: string } }[]
  site?: { name: string } | null
}

type BreakingItem = { title: string; source: string; link: string; pubDate: string }
type FixtureItem = { id: number; date: string; status: string; elapsed: number | null; league: string; homeTeam: string; awayTeam: string; homeGoals: number | null; awayGoals: number | null }
type LiveMatch = FixtureItem & { events?: { minute: number; type: string; detail: string; team: string }[] }
type RedditPost = { title: string; score: number; comments: number; link: string; subreddit: string; pubDate: string }
type YouTubeVideo = { title: string; channel: string; videoId: string; link: string; thumbnail: string; pubDate: string }
type CartItem = { id: string; title: string; source: string; link: string; role: 'primary' | 'supporting' | 'media'; type: string }
type TimeFilter = '1h' | '3h' | '6h' | '12h' | '24h' | '48h' | 'all'
type IdeaCluster = { id: string; theme: string; stories: BreakingItem[]; entities: string[]; angles: string[]; sourceCount: number; avgDIS: number }
type TabKey = 'breaking' | 'transfers' | 'ideas' | 'live' | 'youtube' | 'fanbuzz'

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

const SOURCE_AUTHORITY: Record<string, number> = {
  'BBC Sport': 95, 'BBC': 95, 'Sky Sports': 90, 'ESPN': 88, 'ESPN FC': 88,
  'The Athletic': 85, 'The Guardian': 85, 'Guardian': 85, 'Reuters': 92, 'AP News': 92,
  'Marca': 80, 'L\'Equipe': 80, 'Goal': 70,
}

function getSourceAuthority(source: string): number {
  for (const [key, val] of Object.entries(SOURCE_AUTHORITY)) {
    if (source.toLowerCase().includes(key.toLowerCase())) return val
  }
  return 50
}

function calculateDIS(item: BreakingItem, allItems: BreakingItem[]): number {
  const hoursOld = Math.max(0, (Date.now() - new Date(item.pubDate).getTime()) / 3600000)
  const authority = getSourceAuthority(item.source) / 100
  const words = item.title.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  let coverage = 0
  for (const other of allItems) {
    if (other.title === item.title) continue
    const otherWords = other.title.toLowerCase().split(/\s+/)
    const shared = words.filter(w => otherWords.includes(w))
    if (shared.length >= 2) coverage++
  }
  const coverageScore = Math.min(1, coverage / 5)
  const baseScore = (authority * 0.4 + coverageScore * 0.4 + 0.2) * 100
  return Math.round(Math.max(1, baseScore * Math.pow(0.5, hoursOld / 6)))
}

function getDISLevel(dis: number): 'high' | 'medium' | 'low' {
  if (dis >= 70) return 'high'
  if (dis >= 40) return 'medium'
  return 'low'
}

function getDISColor(dis: number): string {
  if (dis >= 70) return 'var(--coral)'
  if (dis >= 40) return 'var(--gold)'
  return '#3B82F6'
}

const KNOWN_CLUBS = ['Arsenal', 'Chelsea', 'Liverpool', 'Manchester United', 'Man United', 'Man Utd', 'Manchester City', 'Man City', 'Tottenham', 'Spurs', 'Newcastle', 'Real Madrid', 'Barcelona', 'Bayern Munich', 'Bayern', 'PSG', 'Juventus', 'Inter Milan', 'AC Milan', 'Dortmund', 'Aston Villa', 'Brighton', 'West Ham', 'Everton', 'Wolves', 'Atletico Madrid', 'Napoli', 'Ajax', 'Marseille']
const KNOWN_PLAYERS = ['Haaland', 'Mbappe', 'Salah', 'Bellingham', 'Saka', 'Vinicius', 'Pedri', 'Lewandowski', 'Rashford', 'Rodri', 'Messi', 'Ronaldo', 'Yamal', 'Gavi', 'Rice', 'Savic']

function extractEntities(title: string): string[] {
  const entities: string[] = []
  const lower = title.toLowerCase()
  for (const club of KNOWN_CLUBS) {
    if (lower.includes(club.toLowerCase())) entities.push(club)
  }
  for (const player of KNOWN_PLAYERS) {
    if (lower.includes(player.toLowerCase())) entities.push(player)
  }
  return Array.from(new Set(entities))
}

function generateAngles(entities: string[], stories: BreakingItem[]): string[] {
  const angles: string[] = []
  const hasClub = entities.some(e => KNOWN_CLUBS.some(c => c.toLowerCase() === e.toLowerCase()))
  const hasPlayer = entities.some(e => KNOWN_PLAYERS.some(p => p.toLowerCase() === e.toLowerCase()))
  const isTransfer = stories.some(s => /transfer|sign|deal|fee|move|bid|offer/i.test(s.title))
  const isMatch = stories.some(s => /score|win|draw|defeat|goal|match|thrash/i.test(s.title))
  if (isTransfer) angles.push('Transfer analysis & impact assessment')
  if (isMatch) angles.push('Match report & tactical breakdown')
  if (hasPlayer && hasClub) angles.push('Player profile & season review')
  if (stories.length >= 3) angles.push('Comprehensive timeline of events')
  angles.push('Opinion: What this means going forward')
  return angles.slice(0, 3)
}

function clusterStories(items: BreakingItem[], allItems: BreakingItem[]): IdeaCluster[] {
  const itemsWithEntities = items.map(item => ({
    item,
    entities: extractEntities(item.title),
    dis: calculateDIS(item, allItems)
  }))
  const used = new Set<number>()
  const clusters: { stories: BreakingItem[]; entities: Set<string>; disScores: number[] }[] = []
  for (let i = 0; i < itemsWithEntities.length; i++) {
    if (used.has(i)) continue
    const { item, entities, dis } = itemsWithEntities[i]
    if (entities.length === 0) continue
    const cluster = { stories: [item], entities: new Set(entities), disScores: [dis] }
    used.add(i)
    for (let j = i + 1; j < itemsWithEntities.length; j++) {
      if (used.has(j)) continue
      const other = itemsWithEntities[j]
      const shared = entities.filter(e => other.entities.includes(e))
      if (shared.length >= 1) {
        cluster.stories.push(other.item)
        other.entities.forEach(e => cluster.entities.add(e))
        cluster.disScores.push(other.dis)
        used.add(j)
      }
    }
    if (cluster.stories.length >= 2) {
      clusters.push(cluster)
    }
  }
  return clusters.map((c, i) => ({
    id: `cluster-${i}`,
    theme: Array.from(c.entities).slice(0, 3).join(' + '),
    stories: c.stories,
    entities: Array.from(c.entities),
    angles: generateAngles(Array.from(c.entities), c.stories),
    sourceCount: new Set(c.stories.map(s => s.source)).size,
    avgDIS: Math.round(c.disScores.reduce((a, b) => a + b, 0) / c.disScores.length)
  })).sort((a, b) => b.avgDIS - a.avgDIS)
}

const TIME_FILTERS: { key: TimeFilter; label: string; ms: number }[] = [
  { key: '1h', label: '1H', ms: 3600000 },
  { key: '3h', label: '3H', ms: 10800000 },
  { key: '6h', label: '6H', ms: 21600000 },
  { key: '12h', label: '12H', ms: 43200000 },
  { key: '24h', label: '24H', ms: 86400000 },
  { key: '48h', label: '48H', ms: 172800000 },
  { key: 'all', label: 'ALL', ms: Infinity },
]

function filterByTime<T>(items: T[], filter: TimeFilter, getDate: (item: T) => string): T[] {
  if (filter === 'all') return items
  const tf = TIME_FILTERS.find(f => f.key === filter)
  if (!tf) return items
  const cutoff = Date.now() - tf.ms
  return items.filter(item => {
    const d = new Date(getDate(item)).getTime()
    return !isNaN(d) && d > cutoff
  })
}

const SMART_GEN_STEPS = [
  'Analyzing trending topic...',
  'Generating original content...',
  'Creating poll & quiz...',
  'Optimizing SEO...',
  'Finalizing article package...',
]

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
  const [, setArticles] = useState<Article[]>([])
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('breaking')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [cart, setCart] = useState<CartItem[]>([])
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
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideo[]>([])
  const [youtubeLoading, setYoutubeLoading] = useState(false)
  const [transferNews, setTransferNews] = useState<BreakingItem[]>([])
  const [transfersLoading, setTransfersLoading] = useState(false)

  useEffect(() => {
    fetch('/api/articles?limit=50')
      .then(r => r.json())
      .then(data => setArticles(data.articles || data || []))
      .catch(() => {})

    setBreakingLoading(true)
    fetch('/api/newsroom/google-news')
      .then(r => r.json())
      .then(data => {
        const items = data.items || []
        setBreakingNews(items.length > 0 ? items : MOCK_BREAKING)
      })
      .catch(() => setBreakingNews(MOCK_BREAKING))
      .finally(() => setBreakingLoading(false))

    setTransfersLoading(true)
    fetch('/api/newsroom/google-news?q=football+transfer+official+confirmed')
      .then(r => r.json())
      .then(data => {
        const items = data.items || []
        setTransferNews(items.length > 0 ? items : MOCK_TRANSFERS)
      })
      .catch(() => setTransferNews(MOCK_TRANSFERS))
      .finally(() => setTransfersLoading(false))
  }, [])

  useEffect(() => {
    if (activeTab === 'live' && fixtures.length === 0 && !fixturesLoading) {
      setFixturesLoading(true)
      fetch('/api/newsroom/fixtures')
        .then(r => r.json())
        .then(data => { setFixtures(data.fixtures || []); setLiveMatches(data.live || []) })
        .catch(() => {})
        .finally(() => setFixturesLoading(false))
    }
    if (activeTab === 'fanbuzz' && redditPosts.length === 0 && !redditLoading) {
      setRedditLoading(true)
      fetch('/api/newsroom/reddit')
        .then(r => r.json())
        .then(data => {
          const posts = data.posts || []
          setRedditPosts(posts.length > 0 ? posts : MOCK_REDDIT)
        })
        .catch(() => setRedditPosts(MOCK_REDDIT))
        .finally(() => setRedditLoading(false))
    }
    if (activeTab === 'youtube' && youtubeVideos.length === 0 && !youtubeLoading) {
      setYoutubeLoading(true)
      fetch('/api/newsroom/youtube')
        .then(r => r.json())
        .then(data => {
          const vids = data.videos || []
          setYoutubeVideos(vids.length > 0 ? vids : MOCK_YOUTUBE)
        })
        .catch(() => setYoutubeVideos(MOCK_YOUTUBE))
        .finally(() => setYoutubeLoading(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const allNewsItems = useMemo(() => [...breakingNews, ...transferNews], [breakingNews, transferNews])

  const top5 = useMemo(() => {
    if (allNewsItems.length === 0) return []
    return [...allNewsItems]
      .map(item => ({ ...item, dis: calculateDIS(item, allNewsItems) }))
      .sort((a, b) => b.dis - a.dis)
      .slice(0, 5)
  }, [allNewsItems])

  const ideaClusters = useMemo(() => {
    if (allNewsItems.length === 0) return []
    return clusterStories(allNewsItems, allNewsItems)
  }, [allNewsItems])

  const searchLower = search.toLowerCase()

  const filteredBreaking = useMemo(() => {
    let items = breakingNews
    items = filterByTime(items, timeFilter, i => i.pubDate)
    if (search) items = items.filter(i => i.title.toLowerCase().includes(searchLower))
    return items
  }, [breakingNews, timeFilter, search, searchLower])

  const filteredTransfers = useMemo(() => {
    let items = transferNews
    items = filterByTime(items, timeFilter, i => i.pubDate)
    if (search) items = items.filter(i => i.title.toLowerCase().includes(searchLower))
    return items
  }, [transferNews, timeFilter, search, searchLower])

  const filteredYoutube = useMemo(() => {
    let items = youtubeVideos
    items = filterByTime(items, timeFilter, i => i.pubDate)
    if (search) items = items.filter(i => i.title.toLowerCase().includes(searchLower) || i.channel.toLowerCase().includes(searchLower))
    return items
  }, [youtubeVideos, timeFilter, search, searchLower])

  const filteredReddit = useMemo(() => {
    let items = redditPosts
    items = filterByTime(items, timeFilter, i => i.pubDate)
    if (search) items = items.filter(i => i.title.toLowerCase().includes(searchLower))
    return items
  }, [redditPosts, timeFilter, search, searchLower])

  const filteredLive = liveMatches.filter(i => !search || i.homeTeam.toLowerCase().includes(searchLower) || i.awayTeam.toLowerCase().includes(searchLower) || i.league.toLowerCase().includes(searchLower))
  const filteredFixtures = fixtures.filter(i => !search || i.homeTeam.toLowerCase().includes(searchLower) || i.awayTeam.toLowerCase().includes(searchLower) || i.league.toLowerCase().includes(searchLower))

  const filteredIdeas = useMemo(() => {
    if (!search) return ideaClusters
    return ideaClusters.filter(c => c.theme.toLowerCase().includes(searchLower) || c.stories.some(s => s.title.toLowerCase().includes(searchLower)))
  }, [ideaClusters, search, searchLower])

  const addToCart = useCallback((title: string, source: string, link: string, type: string) => {
    setCart(prev => {
      if (prev.some(c => c.title === title)) return prev
      const role: CartItem['role'] = type === 'youtube' ? 'media' : prev.length === 0 ? 'primary' : 'supporting'
      return [...prev, { id: `cart-${Date.now()}`, title, source, link, role, type }]
    })
  }, [])

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => prev.filter(c => c.id !== id))
  }, [])

  const generateFromCart = useCallback(() => {
    const primary = cart.find(c => c.role === 'primary')
    const supporting = cart.filter(c => c.role === 'supporting')
    const media = cart.filter(c => c.role === 'media')
    const prompt = [
      primary ? `Primary story: ${primary.title}` : '',
      supporting.length > 0 ? `Supporting context: ${supporting.map(s => s.title).join('; ')}` : '',
      media.length > 0 ? `Related media: ${media.map(m => m.title).join('; ')}` : '',
    ].filter(Boolean).join('\n')
    sessionStorage.setItem('editorTopic', primary?.title || cart[0]?.title || '')
    router.push(`/editor?prompt=${encodeURIComponent(`Write a comprehensive article combining these sources:\n${prompt}`)}`)
  }, [cart, router])

  const generateFromTopic = useCallback(async (topic: { id: string; title: string; category: string; suggestedType: string }) => {
    setGeneratingTopic(topic.id)
    setGenStep(0)
    setGenError(null)
    const stepInterval = setInterval(() => {
      setGenStep(prev => { if (prev >= SMART_GEN_STEPS.length - 1) { clearInterval(stepInterval); return prev }; return prev + 1 })
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

  function rewriteArticle(title: string, prompt?: string) {
    sessionStorage.setItem('editorTopic', title)
    router.push(`/editor?prompt=${encodeURIComponent(prompt || `Rewrite this news story in our editorial voice: ${title}`)}`)
  }

  const isInCart = useCallback((title: string) => cart.some(c => c.title === title), [cart])

  const tabs: { key: TabKey; icon: string; label: string; count: number }[] = [
    { key: 'breaking', icon: '📰', label: 'BREAKING', count: filteredBreaking.length },
    { key: 'transfers', icon: '🔄', label: 'TRANSFERS', count: filteredTransfers.length },
    { key: 'ideas', icon: '💡', label: 'IDEAS', count: ideaClusters.length },
    { key: 'live', icon: '⚽', label: 'LIVE', count: liveMatches.length },
    { key: 'youtube', icon: '📺', label: 'YOUTUBE', count: filteredYoutube.length },
    { key: 'fanbuzz', icon: '💬', label: 'FAN BUZZ', count: filteredReddit.length },
  ]

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

  function getEngagement(item: BreakingItem): number {
    const words = item.title.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    let count = 1
    for (const other of allNewsItems) {
      if (other.title === item.title) continue
      const otherWords = other.title.toLowerCase().split(/\s+/)
      if (words.filter(w => otherWords.includes(w)).length >= 2) count++
    }
    return count
  }

  function renderNewsCard(item: BreakingItem, index: number, type: 'breaking' | 'transfer') {
    const dis = calculateDIS(item, allNewsItems)
    const level = getDISLevel(dis)
    const srcStyle = getSourceStyle(item.source)
    const domain = getDomain(item.link)
    const inCart = isInCart(item.title)
    const engagement = getEngagement(item)

    return (
      <div key={index} className={`news-card-v4 ${inCart ? 'in-cart' : ''}`} style={{ animationDelay: `${index * 50}ms` }}>
        <div className="v4-dis-bar" style={{ background: getDISColor(dis) }} />
        <div className="v4-card-header">
          <span className="v4-source-badge" style={{ background: srcStyle.bg, color: srcStyle.color }}>{item.source}</span>
          <div className="v4-card-meta-right">
            {engagement > 1 && <span className="v4-engagement">{engagement} sources</span>}
            <span className="v4-time">{getTimeAgo(item.pubDate)}</span>
          </div>
        </div>
        <h3 className="v4-card-title">{item.title}</h3>
        <div className="v4-card-footer">
          <div className="v4-dis-score">
            <span className={`v4-dis-num ${level}`}>{dis}</span>
            <span className="v4-dis-label">DIS</span>
          </div>
          {domain && <span className="v4-domain">{domain}</span>}
          <div className="v4-card-actions">
            <button className="v4-btn-rewrite" onClick={() => rewriteArticle(item.title, type === 'transfer' ? `Write a transfer analysis: ${item.title}` : undefined)}>Rewrite</button>
            <button className={`v4-btn-cart ${inCart ? 'added' : ''}`} onClick={() => { if (!inCart) addToCart(item.title, item.source, item.link, type) }} disabled={inCart}>
              {inCart ? '✓' : '+'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="nr5">
      <div className="nr5-head">
        <div className="nr5-head-left">
          <h1 className="nr5-title">Newsroom</h1>
          <span className="nr5-live">V4</span>
        </div>
        <div className="nr5-search-box">
          <span className="nr5-search-icon">🔍</span>
          <input ref={searchRef} type="text" className="nr5-search-input" placeholder="Search across all tabs..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="nr5-search-clear" onClick={() => setSearch('')}>✕</button>}
          <span className="nr5-search-shortcut">/</span>
        </div>
        {cart.length > 0 && (
          <button className="nr5-cart-badge" onClick={() => document.getElementById('cart-bar')?.scrollIntoView({ behavior: 'smooth' })}>
            🛒 {cart.length}
          </button>
        )}
      </div>

      <div className="time-filter-bar">
        <span className="time-filter-label">TIME</span>
        {TIME_FILTERS.map(tf => (
          <button key={tf.key} className={`time-filter-btn ${timeFilter === tf.key ? 'active' : ''}`} onClick={() => setTimeFilter(tf.key)}>
            {tf.label}
          </button>
        ))}
      </div>

      {top5.length > 0 && !breakingLoading && (
        <div className="top5-section">
          <div className="top5-label">⚡ TOP STORIES</div>
          <div className="top5-scroll">
            {top5.map((item, i) => {
              const level = getDISLevel(item.dis)
              return (
                <button key={i} className={`top5-card ${level}`} onClick={() => addToCart(item.title, item.source, item.link, 'breaking')}>
                  <div className="top5-rank">#{i + 1}</div>
                  <div className="top5-content">
                    <div className="top5-title">{item.title}</div>
                    <div className="top5-meta">
                      <span className={`top5-dis ${level}`}>{item.dis}</span>
                      <span className="top5-source">{item.source}</span>
                      <span className="top5-time">{getTimeAgo(item.pubDate)}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="smart-tabs">
        {tabs.map(tab => (
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
                <div className="smart-loading"><div className="smart-loading-spinner" /><div className="smart-loading-text">Fetching breaking news...</div></div>
              ) : filteredBreaking.length === 0 ? (
                <div className="smart-empty"><div className="smart-empty-icon">📰</div><div className="smart-empty-title">{search || timeFilter !== 'all' ? 'No matching news for this filter' : 'No breaking news found'}</div></div>
              ) : (
                <div className="v4-grid">
                  {filteredBreaking.map((item, i) => renderNewsCard(item, i, 'breaking'))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'transfers' && (
            <div className="smart-trending">
              {transfersLoading ? (
                <div className="smart-loading"><div className="smart-loading-spinner" /><div className="smart-loading-text">Scanning transfer news...</div></div>
              ) : filteredTransfers.length === 0 ? (
                <div className="smart-empty"><div className="smart-empty-icon">🔄</div><div className="smart-empty-title">{search || timeFilter !== 'all' ? 'No matching transfers' : 'No transfer news found'}</div></div>
              ) : (
                <div className="v4-grid">
                  {filteredTransfers.map((item, i) => renderNewsCard(item, i, 'transfer'))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'ideas' && (
            <div className="smart-trending">
              {(breakingLoading || transfersLoading) ? (
                <div className="smart-loading"><div className="smart-loading-spinner" /><div className="smart-loading-text">Clustering stories into ideas...</div></div>
              ) : filteredIdeas.length === 0 ? (
                <div className="smart-empty"><div className="smart-empty-icon">💡</div><div className="smart-empty-title">{search ? 'No matching ideas' : 'No story clusters found'}</div></div>
              ) : (
                <div className="ideas-grid">
                  {filteredIdeas.map(cluster => (
                    <div key={cluster.id} className="idea-card">
                      <div className="idea-header">
                        <div className="idea-theme">{cluster.theme}</div>
                        <span className={`v4-dis-num ${getDISLevel(cluster.avgDIS)}`}>{cluster.avgDIS}</span>
                      </div>
                      <div className="idea-entities">
                        {cluster.entities.map((e, i) => (
                          <span key={i} className="idea-entity">{e}</span>
                        ))}
                      </div>
                      <div className="idea-stories">
                        {cluster.stories.map((s, i) => (
                          <div key={i} className="idea-story-row">
                            <span className="idea-story-source" style={{ background: getSourceStyle(s.source).bg, color: getSourceStyle(s.source).color }}>{s.source}</span>
                            <span className="idea-story-title">{s.title}</span>
                          </div>
                        ))}
                      </div>
                      <div className="idea-angles">
                        <div className="idea-angles-label">Suggested angles:</div>
                        {cluster.angles.map((a, i) => (
                          <div key={i} className="idea-angle">{a}</div>
                        ))}
                      </div>
                      <div className="idea-footer">
                        <span className="idea-source-count">{cluster.sourceCount} sources</span>
                        <button className="v4-btn-rewrite" onClick={() => {
                          const prompt = `Write a comprehensive article about ${cluster.theme}. Key stories: ${cluster.stories.map(s => s.title).join('; ')}. Suggested angle: ${cluster.angles[0]}`
                          rewriteArticle(cluster.theme, prompt)
                        }}>Write Article</button>
                        <button className={`v4-btn-cart ${isInCart(cluster.theme) ? 'added' : ''}`} onClick={() => { if (!isInCart(cluster.theme)) addToCart(cluster.theme, `${cluster.sourceCount} sources`, '', 'idea') }} disabled={isInCart(cluster.theme)}>
                          {isInCart(cluster.theme) ? '✓' : '+'}
                        </button>
                      </div>
                    </div>
                  ))}
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
                        {filteredLive.map(m => (
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
                              <button className="smart-generate-btn" onClick={() => generateFromTopic({ id: `live-${m.id}`, title: `${m.homeTeam} ${m.homeGoals}-${m.awayGoals} ${m.awayTeam} - ${m.league} Live`, category: 'Sport', suggestedType: 'breaking' })} disabled={!!generatingTopic}>
                                ⚡ Live Report
                              </button>
                              <button className={`v4-btn-cart ${isInCart(`${m.homeTeam} vs ${m.awayTeam}`) ? 'added' : ''}`} onClick={() => addToCart(`${m.homeTeam} vs ${m.awayTeam}`, m.league, '', 'breaking')} disabled={isInCart(`${m.homeTeam} vs ${m.awayTeam}`)}>
                                {isInCart(`${m.homeTeam} vs ${m.awayTeam}`) ? '✓' : '+'}
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
                      <div className="section-label">📅 UPCOMING</div>
                      <div className="smart-grid">
                        {filteredFixtures.map(f => {
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
                                <button className="smart-generate-btn" onClick={() => generateFromTopic({ id: `fix-${f.id}`, title: `${f.homeTeam} vs ${f.awayTeam} - ${f.league} Preview`, category: 'Sport', suggestedType: 'preview' })} disabled={!!generatingTopic}>
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
                <div className="smart-empty"><div className="smart-empty-icon">📺</div><div className="smart-empty-title">{search || timeFilter !== 'all' ? 'No matching videos' : 'No videos found'}</div></div>
              ) : (
                <div className="yt-grid">
                  {filteredYoutube.map((vid, i) => (
                    <div key={i} className="yt-card-v4">
                      <div className="yt-thumb">
                        <img src={vid.thumbnail} alt={vid.title} className="yt-thumb-img" />
                        <a href={vid.link} target="_blank" rel="noopener noreferrer" className="yt-play">▶</a>
                      </div>
                      <div className="yt-card-body">
                        <h3 className="yt-card-title">{vid.title}</h3>
                        <div className="yt-card-meta">
                          <span className="yt-channel">{vid.channel}</span>
                          <span className="yt-date">{getTimeAgo(vid.pubDate)}</span>
                        </div>
                        <div className="yt-card-actions">
                          <a href={vid.link} target="_blank" rel="noopener noreferrer" className="v4-btn-rewrite">Watch</a>
                          <button className="v4-btn-rewrite" onClick={() => rewriteArticle(vid.title, `Write an article inspired by this video: ${vid.title}`)}>Article</button>
                          <button className={`v4-btn-cart ${isInCart(vid.title) ? 'added' : ''}`} onClick={() => { if (!isInCart(vid.title)) addToCart(vid.title, vid.channel, vid.link, 'youtube') }} disabled={isInCart(vid.title)}>
                            {isInCart(vid.title) ? '✓' : '+'}
                          </button>
                        </div>
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
                <div className="smart-loading"><div className="smart-loading-spinner" /><div className="smart-loading-text">Scanning Reddit communities...</div></div>
              ) : filteredReddit.length === 0 ? (
                <div className="smart-empty"><div className="smart-empty-icon">💬</div><div className="smart-empty-title">{search || timeFilter !== 'all' ? 'No matching discussions' : 'No fan discussions found'}</div></div>
              ) : (
                <div className="reddit-grid">
                  {filteredReddit.map((post, i) => {
                    const heat = post.score >= 5000 ? 'hot' : post.score >= 1000 ? 'warm' : 'cool'
                    return (
                      <div key={i} className="reddit-card-v4">
                        <div className="reddit-card-header">
                          <div className={`reddit-score ${heat}`}>
                            {post.score >= 1000 ? `${(post.score / 1000).toFixed(1)}k` : post.score}
                          </div>
                          <span className="reddit-sub">r/{post.subreddit}</span>
                          <span className="reddit-time">{getTimeAgo(post.pubDate)}</span>
                        </div>
                        <h3 className="reddit-title">{post.title}</h3>
                        <div className="reddit-stats">
                          <span>💬 {post.comments} comments</span>
                          <span>⬆ {post.score} upvotes</span>
                        </div>
                        <div className="reddit-actions">
                          <button className="v4-btn-rewrite" onClick={() => rewriteArticle(post.title)}>Write About This</button>
                          <a href={post.link} target="_blank" rel="noopener noreferrer" className="v4-btn-link">Reddit</a>
                          <button className={`v4-btn-cart ${isInCart(post.title) ? 'added' : ''}`} onClick={() => { if (!isInCart(post.title)) addToCart(post.title, `r/${post.subreddit}`, post.link, 'reddit') }} disabled={isInCart(post.title)}>
                            {isInCart(post.title) ? '✓' : '+'}
                          </button>
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

      {cart.length > 0 && (
        <div className="cart-bar" id="cart-bar">
          <div className="cart-label">🛒 ARTICLE CART ({cart.length})</div>
          <div className="cart-items">
            {cart.map(item => (
              <div key={item.id} className="cart-item">
                <span className={`cart-role ${item.role}`}>{item.role === 'primary' ? 'P' : item.role === 'supporting' ? 'S' : 'M'}</span>
                <span className="cart-item-title">{item.title}</span>
                <button className="cart-remove" onClick={() => removeFromCart(item.id)}>✕</button>
              </div>
            ))}
          </div>
          <button className="cart-generate" onClick={generateFromCart}>Generate Combined Article</button>
        </div>
      )}

      <div className="nr5-shortcuts">
        <div className="nr5-sc"><kbd>/</kbd> Search</div>
      </div>
    </div>
  )
}
