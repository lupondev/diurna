'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import './calendar.css'

/* ── Types ── */
type AutopilotConfig = {
  id: string
  isActive: boolean
  dailyTarget: number
  defaultLength: number
  scheduleStart: string
  scheduleEnd: string
  is24h: boolean
  autoPublish: boolean
  matchAutoCoverage: boolean
  liveArticles: boolean
  breakingNews: boolean
  breakingThreshold: number
  gapDetection: boolean
  gapHours: number
  contentStyle: string
  translateLang: string
  translateLanguages: string[]
  alwaysCreditSources: boolean
  linkOriginal: boolean
  addSourceTag: boolean
  tone: string
  categories: CatConfig[]
  leagues: LeagueConfig[]
  topics: TopicConfig[]
  channels: ChannelConfig[]
}

type CatConfig = {
  id: string; name: string; slug: string; color: string; percentage: number; sortOrder: number
  widgetPoll: boolean; widgetQuiz: boolean; widgetStats: boolean; widgetPlayer: boolean; widgetVideo: boolean; widgetGallery: boolean
}
type LeagueConfig = { id: string; name: string; apiFootballId: number | null; flag: string | null; weight: number; isActive: boolean }
type TopicConfig = { id: string; name: string; icon: string | null; keywords: string[]; isActive: boolean }
type ChannelConfig = { id: string; platform: string; accountName: string; accountId: string | null; followers: string | null; filter: string; isActive: boolean }
type Stats = { today: number; published: number; scheduled: number; live: number; drafts: number }
type TlArticle = { id: string; title: string; category: string; categorySlug: string; status: string; time: string; hour: number; aiGenerated: boolean }
type TlMatch = { id: string; homeTeam: string; awayTeam: string; homeScore: number | null; awayScore: number | null; league: string | null; status: string | null; time: string; hour: number }
type FeedSource = { id: string; name: string; tier: number; active: boolean; category: string }

/* ── Helpers ── */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function fmtDate(d: Date) {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate() }
function toDateStr(d: Date) { return d.toISOString().split('T')[0] }
function getMonday(d: Date) { const r = new Date(d); const day = r.getDay(); r.setDate(r.getDate() - (day === 0 ? 6 : day - 1)); r.setHours(0, 0, 0, 0); return r }

/* ── Toggle component ── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="cfg-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="cfg-toggle-track" />
      <span className="cfg-toggle-knob" />
    </label>
  )
}

/* ── Config Tabs ── */
const TABS = [
  { key: 'output', icon: '📝', label: 'Output' },
  { key: 'categories', icon: '📊', label: 'Categories' },
  { key: 'leagues', icon: '⚽', label: 'Leagues & Topics' },
  { key: 'sources', icon: '📡', label: 'Sources' },
  { key: 'distribution', icon: '📤', label: 'Distribution' },
  { key: 'style', icon: '✍️', label: 'Style' },
]

const STYLE_OPTIONS = [
  { value: 'signal_only', name: 'Signal Only', desc: 'Sources as signals — AI writes fully original articles', badge: 'Recommended', badgeCls: '' },
  { value: 'paraphrase', name: 'Parafraza + Context', desc: '50/50 mix — paraphrase source content with added context', badge: null, badgeCls: '' },
  { value: 'full_original', name: 'Full Original', desc: 'Ignore source text entirely — AI writes from scratch', badge: null, badgeCls: '' },
  { value: 'translate_only', name: '🌐 Translate Only', desc: 'Keep original structure, just translate to target language', badge: 'Speed Mode', badgeCls: 'speed' },
]

const TONES = ['Neutralno', 'Senzacija', 'Analitički', 'Casual']
const TONE_MAP: Record<string, string> = { 'Neutralno': 'neutral', 'Senzacija': 'sensational', 'Analitički': 'analytical', 'Casual': 'casual' }
const TONE_REV: Record<string, string> = { 'neutral': 'Neutralno', 'sensational': 'Senzacija', 'analytical': 'Analitički', 'casual': 'Casual' }
const LANGS = [
  { code: 'bs', label: 'Bosanski' }, { code: 'hr', label: 'Hrvatski' }, { code: 'sr', label: 'Srpski' },
  { code: 'en', label: 'English' }, { code: 'de', label: 'Deutsch' }, { code: 'tr', label: 'Türkçe' },
]

const DIST_PLATFORMS = [
  { platform: 'twitter', icon: '𝕏', label: 'Twitter / X' },
  { platform: 'facebook', icon: '📘', label: 'Facebook' },
  { platform: 'telegram', icon: '✈️', label: 'Telegram' },
  { platform: 'newsletter', icon: '📧', label: 'Newsletter' },
]

/* ── Slot generation (seeded) ── */
function seededRandom(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff } }
type GenSlot = { id: string; time: string; hour: number; title: string; catSlug: string; status: string; ai: boolean; isMatch: boolean; isLive: boolean; isGap: boolean }

function generateSlots(date: Date, isToday: boolean, target: number): GenSlot[] {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
  const rng = seededRandom(seed)
  const isPast = date < new Date(new Date().toDateString())
  const dow = date.getDay()
  const slots: GenSlot[] = []
  let id = 0

  const mk = (hour: number, min: number, title: string, catSlug: string, isMatch = false, isLive = false): GenSlot => ({
    id: `g-${seed}-${id++}`, time: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
    hour, title, catSlug, ai: true, isMatch, isLive, isGap: false,
    status: isLive ? 'LIVE' : isPast ? 'PUBLISHED' : (isToday && hour <= new Date().getHours()) ? 'PUBLISHED' : 'SCHEDULED',
  })

  slots.push(mk(8, 0, 'Morning Briefing: Top Stories', 'vijesti'))
  if (dow >= 2 && dow <= 5) slots.push(mk(10, 30, 'Transfer Roundup: Latest Deals', 'transferi'))
  if (dow === 0 || dow === 6) {
    slots.push(mk(12, 0, `${['Arsenal vs Chelsea', 'Real Madrid vs Barcelona', 'Napoli vs Inter'][Math.floor(rng() * 3)]}: Match Preview`, 'utakmice', true))
    if (isToday) slots.push(mk(15, 0, 'PL 3pm Kickoffs: Live Coverage', 'utakmice', true, true))
    slots.push(mk(17, 30, 'Results Roundup & Ratings', 'utakmice', true))
  }
  if (dow >= 2 && dow <= 4) slots.push(mk(20, 0, `UCL/UEL: ${['Bayern vs Real Madrid', 'PSG vs Barcelona', 'Arsenal vs Inter'][Math.floor(rng() * 3)]} Preview`, 'utakmice', true))

  const fillers = ['Tactical Analysis: Why Formation Changes Matter', 'Injury Update: Latest Squad News', 'Top 10 Goals of the Week', 'Rising Stars: U21 Players to Watch', 'Power Rankings: This Week\'s Movers']
  const cats = ['analize', 'povrede', 'rankings', 'analize', 'rankings']
  let fi = 0
  while (slots.length < Math.min(target, 10) && fi < fillers.length) {
    const h = [9, 11, 13, 16, 19][fi] || 14
    slots.push(mk(h, 0, fillers[fi], cats[fi]))
    fi++
  }

  slots.sort((a, b) => a.hour - b.hour || a.time.localeCompare(b.time))

  // Gap detection
  if (slots.length >= 2) {
    for (let i = 1; i < slots.length; i++) {
      const gap = slots[i].hour - slots[i - 1].hour
      if (gap >= 3) {
        const gapHour = slots[i - 1].hour + Math.floor(gap / 2)
        slots.splice(i, 0, {
          id: `gap-${seed}-${gapHour}`, time: `${String(gapHour).padStart(2, '0')}:00`, hour: gapHour,
          title: `No content ${String(slots[i - 1].hour).padStart(2, '0')}:00–${String(slots[i].hour).padStart(2, '0')}:00. Generate trending article?`,
          catSlug: '', status: 'GAP', ai: false, isMatch: false, isLive: false, isGap: true,
        })
        break
      }
    }
  }

  return slots
}

/* ════════════════════════════════════════════════ */
/* ─── MAIN COMPONENT ─── */
/* ════════════════════════════════════════════════ */

export default function CalendarPage() {
  const router = useRouter()
  const [config, setConfig] = useState<AutopilotConfig | null>(null)
  const [stats, setStats] = useState<Stats>({ today: 0, published: 0, scheduled: 0, live: 0, drafts: 0 })
  const [sources, setSources] = useState<FeedSource[]>([])
  const [sourceSearch, setSourceSearch] = useState('')
  const [showAllSources, setShowAllSources] = useState(false)

  // Config panel
  const [configOpen, setConfigOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('output')
  const [addingCat, setAddingCat] = useState(false)
  const [newCat, setNewCat] = useState({ name: '', slug: '', color: '#3B82F6', percentage: 10 })
  const [addingLeague, setAddingLeague] = useState(false)
  const [newLeague, setNewLeague] = useState({ name: '', flag: '', weight: 10 })
  const [addingTopic, setAddingTopic] = useState(false)
  const [newTopic, setNewTopic] = useState({ name: '', icon: '', keywords: '' })
  const [addingChannel, setAddingChannel] = useState(false)
  const [newChannel, setNewChannel] = useState({ platform: 'twitter', accountName: '', filter: 'all' })
  const [addingSource, setAddingSource] = useState(false)
  const [newSource, setNewSource] = useState({ name: '', url: '', tier: 2 })
  const [addingLang, setAddingLang] = useState(false)
  const [newLangCode, setNewLangCode] = useState('')

  // Run Now
  const [runningNow, setRunningNow] = useState(false)
  const [runResult, setRunResult] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null)

  // Timeline
  const [tlDate, setTlDate] = useState(() => new Date())
  const [tlView, setTlView] = useState<'Day' | 'Week' | 'Month'>('Day')
  const [tlArticles, setTlArticles] = useState<TlArticle[]>([])
  const [tlMatches, setTlMatches] = useState<TlMatch[]>([])

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  /* ── Data fetching ── */
  useEffect(() => {
    fetch('/api/autopilot/config', { credentials: 'include' }).then(r => r.json()).then(setConfig).catch(() => {})
    fetch('/api/autopilot/stats', { credentials: 'include' }).then(r => r.json()).then(setStats).catch(() => {})
    fetch('/api/categories', { credentials: 'include' }).then(r => r.json()).catch(() => {})
  }, [])

  useEffect(() => {
    fetch(`/api/autopilot/timeline?date=${toDateStr(tlDate)}`, { credentials: 'include' })
      .then(r => r.json()).then(d => { setTlArticles(d.articles || []); setTlMatches(d.matches || []) }).catch(() => {})
  }, [tlDate])

  useEffect(() => {
    fetch('/api/admin/seed-feeds', { method: 'POST', credentials: 'include' }).catch(() => {})
    // Load sources — we'll query them via a simple prisma call (we can't directly, so use seed-feeds as a signal)
    // For now, generate mock sources from the FeedSource seed data
    const defaultSources: FeedSource[] = [
      { id: '1', name: 'BBC Sport', tier: 1, active: true, category: 'breaking' },
      { id: '2', name: 'Sky Sports', tier: 1, active: true, category: 'breaking' },
      { id: '3', name: 'ESPN FC', tier: 1, active: true, category: 'breaking' },
      { id: '4', name: 'The Guardian', tier: 1, active: true, category: 'breaking' },
      { id: '5', name: 'Goal.com', tier: 1, active: true, category: 'breaking' },
      { id: '6', name: 'Football365', tier: 1, active: true, category: 'breaking' },
      { id: '7', name: 'Marca', tier: 2, active: true, category: 'breaking' },
      { id: '8', name: 'AS English', tier: 2, active: true, category: 'breaking' },
      { id: '9', name: 'Gazzetta dello Sport', tier: 2, active: true, category: 'breaking' },
      { id: '10', name: 'L\'Equipe', tier: 2, active: true, category: 'breaking' },
      { id: '11', name: 'Foot Mercato', tier: 2, active: true, category: 'transfer' },
      { id: '12', name: 'Sky Sports Transfers', tier: 2, active: true, category: 'transfer' },
      { id: '13', name: 'FourFourTwo', tier: 2, active: true, category: 'analysis' },
      { id: '14', name: 'TeamTalk', tier: 3, active: true, category: 'transfer' },
      { id: '15', name: 'CaughtOffside', tier: 3, active: true, category: 'transfer' },
      { id: '16', name: 'Football Italia', tier: 3, active: true, category: 'breaking' },
      { id: '17', name: 'Kicker', tier: 2, active: true, category: 'breaking' },
      { id: '18', name: 'Sport Witness', tier: 3, active: false, category: 'transfer' },
      { id: '19', name: 'Inside Futbol', tier: 3, active: true, category: 'transfer' },
      { id: '20', name: 'Dnevni Avaz Sport', tier: 4, active: true, category: 'breaking' },
      { id: '21', name: 'Klix Sport', tier: 4, active: true, category: 'breaking' },
      { id: '22', name: 'Sportske.ba', tier: 4, active: true, category: 'breaking' },
    ]
    setSources(defaultSources)
  }, [])

  /* ── Config updates ── */
  const updateConfig = useCallback((partial: Partial<AutopilotConfig>) => {
    setConfig(prev => prev ? { ...prev, ...partial } : prev)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetch('/api/autopilot/config', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      }).catch(() => {})
    }, 500)
  }, [])

  const updateCategory = useCallback((id: string, data: Partial<CatConfig>) => {
    setConfig(prev => {
      if (!prev) return prev
      return { ...prev, categories: prev.categories.map(c => c.id === id ? { ...c, ...data } : c) }
    })
    fetch(`/api/autopilot/categories/${id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {})
  }, [])

  const deleteCategory = useCallback((id: string) => {
    setConfig(prev => prev ? { ...prev, categories: prev.categories.filter(c => c.id !== id) } : prev)
    fetch(`/api/autopilot/categories/${id}`, { method: 'DELETE', credentials: 'include' }).catch(() => {})
  }, [])

  const addCategory = useCallback(() => {
    if (!newCat.name || !newCat.slug) return
    fetch('/api/autopilot/categories', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCat),
    }).then(r => r.json()).then(cat => {
      setConfig(prev => prev ? { ...prev, categories: [...prev.categories, cat] } : prev)
      setNewCat({ name: '', slug: '', color: '#3B82F6', percentage: 10 })
      setAddingCat(false)
    }).catch(() => {})
  }, [newCat])

  const updateLeague = useCallback((id: string, data: Partial<LeagueConfig>) => {
    setConfig(prev => {
      if (!prev) return prev
      return { ...prev, leagues: prev.leagues.map(l => l.id === id ? { ...l, ...data } : l) }
    })
    fetch(`/api/autopilot/leagues/${id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {})
  }, [])

  const deleteLeague = useCallback((id: string) => {
    setConfig(prev => prev ? { ...prev, leagues: prev.leagues.filter(l => l.id !== id) } : prev)
    fetch(`/api/autopilot/leagues/${id}`, { method: 'DELETE', credentials: 'include' }).catch(() => {})
  }, [])

  const addLeague = useCallback(() => {
    if (!newLeague.name) return
    fetch('/api/autopilot/leagues', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLeague),
    }).then(r => r.json()).then(lg => {
      setConfig(prev => prev ? { ...prev, leagues: [...prev.leagues, lg] } : prev)
      setNewLeague({ name: '', flag: '', weight: 10 })
      setAddingLeague(false)
    }).catch(() => {})
  }, [newLeague])

  const deleteTopic = useCallback((id: string) => {
    setConfig(prev => prev ? { ...prev, topics: prev.topics.filter(t => t.id !== id) } : prev)
    fetch(`/api/autopilot/topics/${id}`, { method: 'DELETE', credentials: 'include' }).catch(() => {})
  }, [])

  const addTopic = useCallback(() => {
    if (!newTopic.name) return
    fetch('/api/autopilot/topics', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTopic.name, icon: newTopic.icon || null, keywords: newTopic.keywords.split(',').map(k => k.trim()).filter(Boolean) }),
    }).then(r => r.json()).then(tp => {
      setConfig(prev => prev ? { ...prev, topics: [...prev.topics, tp] } : prev)
      setNewTopic({ name: '', icon: '', keywords: '' })
      setAddingTopic(false)
    }).catch(() => {})
  }, [newTopic])

  const deleteChannel = useCallback((id: string) => {
    setConfig(prev => prev ? { ...prev, channels: prev.channels.filter(c => c.id !== id) } : prev)
    fetch(`/api/autopilot/channels/${id}`, { method: 'DELETE', credentials: 'include' }).catch(() => {})
  }, [])

  const addChannel = useCallback(() => {
    if (!newChannel.accountName) return
    fetch('/api/autopilot/channels', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newChannel),
    }).then(r => r.json()).then(ch => {
      setConfig(prev => prev ? { ...prev, channels: [...prev.channels, ch] } : prev)
      setNewChannel({ platform: 'twitter', accountName: '', filter: 'all' })
      setAddingChannel(false)
    }).catch(() => {})
  }, [newChannel])

  const toggleChannel = useCallback((id: string, isActive: boolean) => {
    setConfig(prev => prev ? { ...prev, channels: prev.channels.map(c => c.id === id ? { ...c, isActive } : c) } : prev)
    fetch(`/api/autopilot/channels/${id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    }).catch(() => {})
  }, [])

  const togglePlatformChannels = useCallback((platform: string, isActive: boolean) => {
    setConfig(prev => {
      if (!prev) return prev
      const updated = prev.channels.map(c => c.platform === platform ? { ...c, isActive } : c)
      // Fire API calls for each channel
      prev.channels.filter(c => c.platform === platform).forEach(c => {
        fetch(`/api/autopilot/channels/${c.id}`, {
          method: 'PUT', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive }),
        }).catch(() => {})
      })
      return { ...prev, channels: updated }
    })
  }, [])

  const addSource = useCallback(() => {
    if (!newSource.name || !newSource.url) return
    const id = `src-${Date.now()}`
    setSources(prev => [...prev, { id, name: newSource.name, tier: newSource.tier, active: true, category: 'breaking' }])
    setNewSource({ name: '', url: '', tier: 2 })
    setAddingSource(false)
  }, [newSource])

  const toggleLang = useCallback((code: string) => {
    setConfig(prev => {
      if (!prev) return prev
      const langs = prev.translateLanguages || ['bs']
      const next = langs.includes(code) ? langs.filter(l => l !== code) : [...langs, code]
      if (next.length === 0) return prev // must have at least one
      updateConfig({ translateLanguages: next })
      return { ...prev, translateLanguages: next }
    })
  }, [updateConfig])

  const addCustomLang = useCallback(() => {
    if (!newLangCode.trim()) return
    const code = newLangCode.trim().toLowerCase()
    if (LANGS.find(l => l.code === code)) { toggleLang(code); setNewLangCode(''); setAddingLang(false); return }
    // Add to translate languages
    setConfig(prev => {
      if (!prev) return prev
      const langs = prev.translateLanguages || ['bs']
      if (langs.includes(code)) return prev
      const next = [...langs, code]
      updateConfig({ translateLanguages: next })
      return { ...prev, translateLanguages: next }
    })
    setNewLangCode('')
    setAddingLang(false)
  }, [newLangCode, updateConfig, toggleLang])

  const refreshData = useCallback(() => {
    fetch('/api/autopilot/stats', { credentials: 'include' }).then(r => r.json()).then(setStats).catch(() => {})
    fetch(`/api/autopilot/timeline?date=${toDateStr(tlDate)}`, { credentials: 'include' })
      .then(r => r.json()).then(d => { setTlArticles(d.articles || []); setTlMatches(d.matches || []) }).catch(() => {})
  }, [tlDate])

  const runAutopilotNow = useCallback(async () => {
    setRunningNow(true)
    setRunResult(null)
    try {
      const res = await fetch('/api/cron/autopilot', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) {
        setRunResult({ type: 'error', message: data.reason || data.error || 'Request failed' })
      } else if (data.action === 'generated' && data.article) {
        setRunResult({ type: 'success', message: `Generated: ${data.article.title}` })
        refreshData()
      } else if (data.action === 'skipped') {
        setRunResult({ type: 'info', message: data.reason || 'Nothing to generate' })
      } else if (data.action === 'error') {
        setRunResult({ type: 'error', message: data.reason || 'Generation error' })
      } else {
        setRunResult({ type: 'info', message: data.reason || 'No action taken' })
      }
    } catch (err) {
      setRunResult({ type: 'error', message: err instanceof Error ? err.message : 'Network error' })
    } finally {
      setRunningNow(false)
    }
  }, [refreshData])

  /* ── Timeline data ── */
  const today = new Date()
  const isToday = isSameDay(tlDate, today)
  const nowHour = today.getHours()
  const nowMin = today.getMinutes()

  const genSlots = generateSlots(tlDate, isToday, config?.dailyTarget || 8)
  const hours = Array.from({ length: 17 }, (_, i) => i + 7) // 07:00 to 23:00

  // Merge real articles into timeline
  const slotsByHour: Record<number, GenSlot[]> = {}
  for (const s of genSlots) { (slotsByHour[s.hour] ||= []).push(s) }
  for (const a of tlArticles) { (slotsByHour[a.hour] ||= []).push({ id: a.id, time: new Date(a.time).toTimeString().slice(0, 5), hour: a.hour, title: a.title, catSlug: a.categorySlug, status: a.status, ai: a.aiGenerated, isMatch: false, isLive: false, isGap: false }) }
  for (const m of tlMatches) { (slotsByHour[m.hour] ||= []).push({ id: m.id, time: new Date(m.time).toTimeString().slice(0, 5), hour: m.hour, title: `⚽ ${m.homeTeam} vs ${m.awayTeam}`, catSlug: 'utakmice', status: m.status === 'LIVE' ? 'LIVE' : m.status === 'FT' ? 'PUBLISHED' : 'SCHEDULED', ai: false, isMatch: true, isLive: m.status === 'LIVE' || m.status === '1H' || m.status === '2H', isGap: false }) }

  // Week data
  const weekStart = getMonday(tlDate)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i)
    const slots = generateSlots(d, isSameDay(d, today), config?.dailyTarget || 8)
    return { date: d, isToday: isSameDay(d, today), slots }
  })

  // Month data
  const monthFirst = new Date(tlDate.getFullYear(), tlDate.getMonth(), 1)
  const monthLast = new Date(tlDate.getFullYear(), tlDate.getMonth() + 1, 0)
  const monthStartPad = monthFirst.getDay() === 0 ? 6 : monthFirst.getDay() - 1
  const monthCells: { date: Date | null; count: number; isToday: boolean }[] = []
  for (let i = 0; i < monthStartPad; i++) monthCells.push({ date: null, count: 0, isToday: false })
  for (let d = 1; d <= monthLast.getDate(); d++) {
    const dt = new Date(monthFirst.getFullYear(), monthFirst.getMonth(), d)
    monthCells.push({ date: dt, count: generateSlots(dt, false, config?.dailyTarget || 8).filter(s => !s.isGap).length, isToday: isSameDay(dt, today) })
  }

  // Source filtering
  const filteredSources = sources.filter(s => !sourceSearch || s.name.toLowerCase().includes(sourceSearch.toLowerCase()))
  const visibleSources = showAllSources ? filteredSources : filteredSources.slice(0, 12)
  const sourcesByTier = (tier: number) => visibleSources.filter(s => s.tier === tier)

  const catColorMap: Record<string, string> = {}
  config?.categories.forEach(c => { catColorMap[c.slug] = c.color })

  if (!config) return <div className="cal-page"><div style={{ padding: 40, textAlign: 'center', color: '#A1A1AA' }}>Loading configuration...</div></div>

  return (
    <div className="cal-page">
      {/* ═══ SECTION 1: Status Bar ═══ */}
      <div className={`cal-status cal-fadein${config.isActive ? '' : ' paused'}`}>
        <div className="cal-status-dot" />
        <span className="cal-status-label">{config.isActive ? 'AUTOPILOT ACTIVE' : 'PAUSED'}</span>
        <div className="cal-status-stats">
          <div className="cal-stat"><div className="cal-stat-val">{stats.today}</div><div className="cal-stat-lbl">Today</div></div>
          <div className="cal-stat"><div className="cal-stat-val">{stats.published}</div><div className="cal-stat-lbl">Published</div></div>
          <div className="cal-stat"><div className="cal-stat-val">{stats.scheduled}</div><div className="cal-stat-lbl">Scheduled</div></div>
          <div className="cal-stat"><div className="cal-stat-val">{stats.live}</div><div className="cal-stat-lbl">Live Now</div></div>
          <div className="cal-stat"><div className="cal-stat-val">{stats.drafts}</div><div className="cal-stat-lbl">Drafts</div></div>
        </div>
        <button
          className="cal-run-now"
          onClick={runAutopilotNow}
          disabled={runningNow}
          style={{
            marginLeft: 'auto',
            padding: '6px 16px',
            fontSize: 12,
            fontWeight: 700,
            border: 'none',
            borderRadius: 8,
            cursor: runningNow ? 'wait' : 'pointer',
            background: runningNow ? '#A1A1AA' : '#00D4AA',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          {runningNow ? (
            <><span className="cal-spinner" /> Generating...</>
          ) : (
            <><span style={{ fontSize: 14 }}>⚡</span> Run Now</>
          )}
        </button>
      </div>

      {/* Run Result Toast */}
      {runResult && (
        <div
          className="cal-fadein"
          onClick={() => setRunResult(null)}
          style={{
            padding: '10px 16px',
            margin: '0 0 12px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            background: runResult.type === 'success' ? '#DCFCE7' : runResult.type === 'error' ? '#FEE2E2' : '#F0F9FF',
            color: runResult.type === 'success' ? '#16A34A' : runResult.type === 'error' ? '#DC2626' : '#2563EB',
            border: `1px solid ${runResult.type === 'success' ? '#BBF7D0' : runResult.type === 'error' ? '#FECACA' : '#BAE6FD'}`,
          }}
        >
          {runResult.type === 'success' ? '✅' : runResult.type === 'error' ? '❌' : 'ℹ️'} {runResult.message}
        </div>
      )}

      {/* ═══ SECTION 2: Config Panel ═══ */}
      <div className="cal-config cal-fadein" style={{ animationDelay: '.05s' }}>
        <div className="cal-config-header" onClick={() => setConfigOpen(!configOpen)}>
          <div className="cal-config-title">⚙️ Autopilot Configuration</div>
          <span className={`cal-config-toggle${configOpen ? ' open' : ''}`}>▼</span>
        </div>

        {configOpen && (
          <>
            <div className="cal-tabs">
              {TABS.map(t => (
                <button key={t.key} className={`cal-tab${activeTab === t.key ? ' act' : ''}`} onClick={() => setActiveTab(t.key)}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            <div className="cal-tab-body">
              {/* ── Tab: Output ── */}
              {activeTab === 'output' && (
                <div>
                  <div className="cfg-row">
                    <div><div className="cfg-label">Daily Target</div><div className="cfg-desc">Articles per day</div></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input type="range" className="cfg-slider" min={10} max={500} value={config.dailyTarget} onChange={e => updateConfig({ dailyTarget: +e.target.value })} />
                      <span className="cfg-val">{config.dailyTarget}</span>
                    </div>
                  </div>
                  <div className="cfg-row">
                    <div><div className="cfg-label">Default Length</div><div className="cfg-desc">Words per article</div></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input type="range" className="cfg-slider" min={200} max={2500} step={50} value={config.defaultLength} onChange={e => updateConfig({ defaultLength: +e.target.value })} />
                      <span className="cfg-val">{config.defaultLength}w</span>
                    </div>
                  </div>
                  <div className="cfg-row">
                    <div><div className="cfg-label">Schedule</div><div className="cfg-desc">Active hours</div></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="time" className="cfg-input" style={{ width: 100 }} value={config.scheduleStart} onChange={e => updateConfig({ scheduleStart: e.target.value })} />
                      <span style={{ color: '#A1A1AA', fontSize: 12 }}>to</span>
                      <input type="time" className="cfg-input" style={{ width: 100 }} value={config.scheduleEnd} onChange={e => updateConfig({ scheduleEnd: e.target.value })} />
                      <Toggle checked={config.is24h} onChange={v => updateConfig({ is24h: v })} />
                      <span style={{ fontSize: 10, color: '#A1A1AA', fontWeight: 600 }}>24/7</span>
                    </div>
                  </div>
                  <div className="cfg-row"><div><div className="cfg-label">Auto-publish</div><div className="cfg-desc">Publish without manual review</div></div><Toggle checked={config.autoPublish} onChange={v => updateConfig({ autoPublish: v })} /></div>
                  <div className="cfg-row"><div><div className="cfg-label">Match Auto-coverage</div><div className="cfg-desc">Preview 6h before, live, post-match</div></div><Toggle checked={config.matchAutoCoverage} onChange={v => updateConfig({ matchAutoCoverage: v })} /></div>
                  <div className="cfg-row"><div><div className="cfg-label">LIVE Articles</div><div className="cfg-desc">Auto-update during matches</div></div><Toggle checked={config.liveArticles} onChange={v => updateConfig({ liveArticles: v })} /></div>
                  <div className="cfg-row">
                    <div><div className="cfg-label">Breaking News</div><div className="cfg-desc">Auto-generate when DIS &gt; threshold</div></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Toggle checked={config.breakingNews} onChange={v => updateConfig({ breakingNews: v })} />
                      {config.breakingNews && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input type="number" className="cfg-input cfg-input-sm" value={config.breakingThreshold} onChange={e => updateConfig({ breakingThreshold: +e.target.value })} />
                          <span style={{ fontSize: 10, color: '#A1A1AA' }}>DIS</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="cfg-row">
                    <div><div className="cfg-label">Gap Detection</div><div className="cfg-desc">Alert if no content for X hours</div></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Toggle checked={config.gapDetection} onChange={v => updateConfig({ gapDetection: v })} />
                      {config.gapDetection && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input type="number" className="cfg-input cfg-input-sm" value={config.gapHours} onChange={e => updateConfig({ gapHours: +e.target.value })} />
                          <span style={{ fontSize: 10, color: '#A1A1AA' }}>hrs</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Tab: Categories ── */}
              {activeTab === 'categories' && (
                <div>
                  {config.categories.map(cat => (
                    <div key={cat.id} className="cfg-cat-row">
                      <span className="cfg-cat-dot" style={{ background: cat.color }} />
                      <span className="cfg-cat-name">{cat.name}</span>
                      <div className="cfg-cat-bar"><div className="cfg-cat-fill" style={{ width: `${cat.percentage}%`, background: cat.color }} /></div>
                      <input type="range" min={0} max={100} value={cat.percentage} onChange={e => updateCategory(cat.id, { percentage: +e.target.value })} style={{ width: 80, accentColor: cat.color }} />
                      <span className="cfg-cat-pct">{cat.percentage}%</span>
                      <div className="cfg-chips">
                        {(['Poll', 'Quiz', 'Stats', 'Player', 'Video', 'Gallery'] as const).map(w => {
                          const key = `widget${w}` as keyof CatConfig
                          return <span key={w} className={`cfg-chip${cat[key] ? ' on' : ''}`} onClick={() => updateCategory(cat.id, { [key]: !cat[key] })}>{w}</span>
                        })}
                      </div>
                      <button className="cfg-cat-del" onClick={() => deleteCategory(cat.id)}>✕</button>
                    </div>
                  ))}
                  {addingCat ? (
                    <div className="cfg-inline-form">
                      <input className="cfg-input" placeholder="Name" value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} />
                      <input type="color" className="cfg-input-color" value={newCat.color} onChange={e => setNewCat({ ...newCat, color: e.target.value })} />
                      <input type="number" className="cfg-input cfg-input-sm" placeholder="%" value={newCat.percentage} onChange={e => setNewCat({ ...newCat, percentage: +e.target.value })} />
                      <button className="cfg-save-btn" onClick={addCategory}>Add</button>
                      <button className="cfg-cancel-btn" onClick={() => setAddingCat(false)}>Cancel</button>
                    </div>
                  ) : (
                    <button className="cfg-add-btn" onClick={() => setAddingCat(true)}>+ Add Category</button>
                  )}
                </div>
              )}

              {/* ── Tab: Leagues & Topics ── */}
              {activeTab === 'leagues' && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#18181B', marginBottom: 12 }}>Priority Leagues</div>
                  {config.leagues.map(lg => (
                    <div key={lg.id} className="cfg-league-row">
                      <span className="cfg-league-flag">{lg.flag || '🏟️'}</span>
                      <span className="cfg-league-name">{lg.name}</span>
                      <div className="cfg-league-bar"><div className="cfg-league-fill" style={{ width: `${lg.weight}%` }} /></div>
                      <input type="range" min={0} max={100} value={lg.weight} onChange={e => updateLeague(lg.id, { weight: +e.target.value })} style={{ width: 80, accentColor: '#00D4AA' }} />
                      <span className="cfg-league-wt">{lg.weight}%</span>
                      <button className="cfg-cat-del" onClick={() => deleteLeague(lg.id)}>✕</button>
                    </div>
                  ))}
                  {addingLeague ? (
                    <div className="cfg-inline-form">
                      <input className="cfg-input" placeholder="League name" value={newLeague.name} onChange={e => setNewLeague({ ...newLeague, name: e.target.value })} />
                      <input className="cfg-input" placeholder="Flag emoji" value={newLeague.flag} onChange={e => setNewLeague({ ...newLeague, flag: e.target.value })} style={{ width: 50 }} />
                      <input type="number" className="cfg-input cfg-input-sm" placeholder="%" value={newLeague.weight} onChange={e => setNewLeague({ ...newLeague, weight: +e.target.value })} />
                      <button className="cfg-save-btn" onClick={addLeague}>Add</button>
                      <button className="cfg-cancel-btn" onClick={() => setAddingLeague(false)}>Cancel</button>
                    </div>
                  ) : (
                    <button className="cfg-add-btn" onClick={() => setAddingLeague(true)}>+ Add League</button>
                  )}

                  <div style={{ height: 1, background: '#E8E8EC', margin: '20px 0' }} />

                  <div style={{ fontSize: 12, fontWeight: 700, color: '#18181B', marginBottom: 12 }}>Custom Topics</div>
                  {config.topics.map(tp => (
                    <div key={tp.id} className="cfg-league-row">
                      <span className="cfg-league-flag">{tp.icon || '📌'}</span>
                      <span className="cfg-league-name">{tp.name}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: tp.isActive ? '#DCFCE7' : '#F4F4F5', color: tp.isActive ? '#16A34A' : '#A1A1AA' }}>
                        {tp.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span style={{ flex: 1 }} />
                      <button className="cfg-cat-del" onClick={() => deleteTopic(tp.id)}>✕</button>
                    </div>
                  ))}
                  {config.topics.length === 0 && <div style={{ fontSize: 12, color: '#A1A1AA', padding: '8px 0' }}>No custom topics yet</div>}
                  {addingTopic ? (
                    <div className="cfg-inline-form">
                      <input className="cfg-input" placeholder="Topic name" value={newTopic.name} onChange={e => setNewTopic({ ...newTopic, name: e.target.value })} />
                      <input className="cfg-input" placeholder="Icon" value={newTopic.icon} onChange={e => setNewTopic({ ...newTopic, icon: e.target.value })} style={{ width: 50 }} />
                      <input className="cfg-input" placeholder="Keywords (comma separated)" value={newTopic.keywords} onChange={e => setNewTopic({ ...newTopic, keywords: e.target.value })} style={{ flex: 1 }} />
                      <button className="cfg-save-btn" onClick={addTopic}>Add</button>
                      <button className="cfg-cancel-btn" onClick={() => setAddingTopic(false)}>Cancel</button>
                    </div>
                  ) : (
                    <button className="cfg-add-btn" onClick={() => setAddingTopic(true)}>+ Add Topic</button>
                  )}
                </div>
              )}

              {/* ── Tab: Sources ── */}
              {activeTab === 'sources' && (
                <div>
                  <input className="cfg-input" placeholder="Search sources..." value={sourceSearch} onChange={e => setSourceSearch(e.target.value)} style={{ width: '100%', marginBottom: 16 }} />
                  {[1, 2, 3, 4].map(tier => {
                    const tierSrcs = sourcesByTier(tier)
                    if (tierSrcs.length === 0) return null
                    const tierLabel = ['', 'Tier 1 — High Credibility', 'Tier 2 — Reliable', 'Tier 3 — Aggregator', 'Local / Regional'][tier]
                    const tierCls = ['', 't1', 't2', 't3', 't4'][tier]
                    const barColor = ['', '#16A34A', '#2563EB', '#D97706', '#7C3AED'][tier]
                    return (
                      <div key={tier} className="cfg-src-group">
                        <span className={`cfg-src-tier ${tierCls}`}>{tierLabel}</span>
                        {tierSrcs.map(s => (
                          <div key={s.id} className="cfg-src-row">
                            <Toggle checked={s.active} onChange={v => setSources(prev => prev.map(x => x.id === s.id ? { ...x, active: v } : x))} />
                            <span className="cfg-src-name">{s.name}</span>
                            <div className="cfg-src-bar"><div className="cfg-src-fill" style={{ width: `${tier === 1 ? 95 : tier === 2 ? 75 : tier === 3 ? 55 : 40}%`, background: barColor }} /></div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: '#A1A1AA' }}>Showing {visibleSources.length} of {filteredSources.length} sources</span>
                    {!showAllSources && filteredSources.length > 12 && (
                      <button className="cfg-add-btn" style={{ marginTop: 0 }} onClick={() => setShowAllSources(true)}>Show all</button>
                    )}
                  </div>
                  {addingSource ? (
                    <div className="cfg-inline-form" style={{ marginTop: 12 }}>
                      <input className="cfg-input" placeholder="Source name" value={newSource.name} onChange={e => setNewSource({ ...newSource, name: e.target.value })} style={{ flex: 1 }} />
                      <input className="cfg-input" placeholder="RSS URL" value={newSource.url} onChange={e => setNewSource({ ...newSource, url: e.target.value })} style={{ flex: 2 }} />
                      <select className="cfg-input" value={newSource.tier} onChange={e => setNewSource({ ...newSource, tier: +e.target.value })}>
                        <option value={1}>Tier 1</option>
                        <option value={2}>Tier 2</option>
                        <option value={3}>Tier 3</option>
                        <option value={4}>Tier 4</option>
                      </select>
                      <button className="cfg-save-btn" onClick={addSource}>Save</button>
                      <button className="cfg-cancel-btn" onClick={() => setAddingSource(false)}>Cancel</button>
                    </div>
                  ) : (
                    <button className="cfg-add-btn" onClick={() => setAddingSource(true)}>+ Add Source</button>
                  )}
                </div>
              )}

              {/* ── Tab: Distribution ── */}
              {activeTab === 'distribution' && (
                <div>
                  {DIST_PLATFORMS.map(dp => {
                    const channels = config.channels.filter(c => c.platform === dp.platform)
                    const allActive = channels.length > 0 && channels.every(c => c.isActive)
                    const someActive = channels.some(c => c.isActive)
                    return (
                      <div key={dp.platform} className="cfg-dist-group" style={{ opacity: channels.length > 0 && !someActive ? 0.5 : 1 }}>
                        <div className="cfg-dist-head">
                          <span className="cfg-dist-icon">{dp.icon}</span>
                          <span className="cfg-dist-name">{dp.label}</span>
                          <span className="cfg-dist-count">{channels.length} account{channels.length !== 1 ? 's' : ''}</span>
                          {channels.length > 0 && (
                            <Toggle checked={allActive} onChange={v => togglePlatformChannels(dp.platform, v)} />
                          )}
                        </div>
                        {channels.map(ch => (
                          <div key={ch.id} className="cfg-dist-acct" style={{ opacity: ch.isActive ? 1 : 0.4 }}>
                            <Toggle checked={ch.isActive} onChange={v => toggleChannel(ch.id, v)} />
                            <span className="cfg-dist-acct-name">{ch.accountName}</span>
                            <span className="cfg-dist-acct-filter">{ch.filter}</span>
                            {ch.followers && <span className="cfg-dist-acct-followers">{ch.followers}</span>}
                            <button className="cfg-cat-del" onClick={() => deleteChannel(ch.id)}>✕</button>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                  {addingChannel ? (
                    <div className="cfg-inline-form">
                      <select className="cfg-input" value={newChannel.platform} onChange={e => setNewChannel({ ...newChannel, platform: e.target.value })}>
                        {DIST_PLATFORMS.map(dp => <option key={dp.platform} value={dp.platform}>{dp.label}</option>)}
                      </select>
                      <input className="cfg-input" placeholder="Account name" value={newChannel.accountName} onChange={e => setNewChannel({ ...newChannel, accountName: e.target.value })} style={{ flex: 1 }} />
                      <select className="cfg-input" value={newChannel.filter} onChange={e => setNewChannel({ ...newChannel, filter: e.target.value })}>
                        <option value="all">All</option>
                        <option value="vijesti">Vijesti</option>
                        <option value="transferi">Transferi</option>
                        <option value="utakmice">Utakmice</option>
                      </select>
                      <button className="cfg-save-btn" onClick={addChannel}>Add</button>
                      <button className="cfg-cancel-btn" onClick={() => setAddingChannel(false)}>Cancel</button>
                    </div>
                  ) : (
                    <button className="cfg-add-btn" onClick={() => setAddingChannel(true)}>+ Add Account</button>
                  )}
                </div>
              )}

              {/* ── Tab: Style ── */}
              {activeTab === 'style' && (
                <div>
                  {STYLE_OPTIONS.map(opt => (
                    <div key={opt.value} className={`cfg-style-card${config.contentStyle === opt.value ? ' act' : ''}`} onClick={() => updateConfig({ contentStyle: opt.value })}>
                      <div className="cfg-style-radio"><div className="cfg-style-radio-dot" /></div>
                      <div>
                        <div className="cfg-style-name">
                          {opt.name}
                          {opt.badge && <span className={`cfg-style-badge ${opt.badgeCls}`}>{opt.badge}</span>}
                        </div>
                        <div className="cfg-style-desc">{opt.desc}</div>
                        {opt.value === 'translate_only' && config.contentStyle === 'translate_only' && (
                          <div className="cfg-tone-chips" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                            {LANGS.map(l => (
                              <span key={l.code} className={`cfg-lang-chip${(config.translateLanguages || []).includes(l.code) ? ' act' : ''}`} onClick={e => { e.stopPropagation(); toggleLang(l.code) }}>
                                {l.label}
                              </span>
                            ))}
                            {(config.translateLanguages || []).filter(code => !LANGS.find(l => l.code === code)).map(code => (
                              <span key={code} className="cfg-lang-chip act" onClick={e => { e.stopPropagation(); toggleLang(code) }}>
                                {code.toUpperCase()} ✕
                              </span>
                            ))}
                            {addingLang ? (
                              <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                                <input className="cfg-input cfg-input-sm" placeholder="Code" value={newLangCode} onChange={e => setNewLangCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addCustomLang() }} style={{ width: 60, fontSize: 11 }} autoFocus />
                                <button className="cfg-save-btn" style={{ fontSize: 10, padding: '2px 6px' }} onClick={addCustomLang}>+</button>
                                <button className="cfg-cancel-btn" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => setAddingLang(false)}>✕</button>
                              </span>
                            ) : (
                              <span className="cfg-lang-chip" style={{ cursor: 'pointer', border: '1px dashed #A1A1AA' }} onClick={e => { e.stopPropagation(); setAddingLang(true) }}>
                                + Add
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <div style={{ height: 1, background: '#E8E8EC', margin: '20px 0' }} />

                  <div style={{ fontSize: 12, fontWeight: 700, color: '#18181B', marginBottom: 8 }}>Attribution</div>
                  <div className="cfg-row"><div className="cfg-label">Credit sources</div><Toggle checked={config.alwaysCreditSources} onChange={v => updateConfig({ alwaysCreditSources: v })} /></div>
                  <div className="cfg-row"><div className="cfg-label">Link original article</div><Toggle checked={config.linkOriginal} onChange={v => updateConfig({ linkOriginal: v })} /></div>
                  <div className="cfg-row"><div className="cfg-label">Add &quot;Izvor:&quot; tag</div><Toggle checked={config.addSourceTag} onChange={v => updateConfig({ addSourceTag: v })} /></div>

                  <div style={{ height: 1, background: '#E8E8EC', margin: '20px 0' }} />

                  <div style={{ fontSize: 12, fontWeight: 700, color: '#18181B', marginBottom: 8 }}>Tone</div>
                  <div className="cfg-tone-chips">
                    {TONES.map(t => (
                      <span key={t} className={`cfg-tone-chip${(TONE_REV[config.tone] || 'Neutralno') === t ? ' act' : ''}`} onClick={() => updateConfig({ tone: TONE_MAP[t] })}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ═══ SECTION 3: Calendar Timeline ═══ */}
      <div className="cal-tl-header cal-fadein" style={{ animationDelay: '.1s' }}>
        <div className="cal-tl-arrows">
          <button className="cal-tl-arrow" onClick={() => setTlDate(d => addDays(d, tlView === 'Month' ? -30 : tlView === 'Week' ? -7 : -1))}>◀</button>
          <button className="cal-tl-arrow" onClick={() => setTlDate(d => addDays(d, tlView === 'Month' ? 30 : tlView === 'Week' ? 7 : 1))}>▶</button>
        </div>
        <div className="cal-tl-date">
          {tlView === 'Month' ? `${MONTHS[tlDate.getMonth()]} ${tlDate.getFullYear()}` : fmtDate(tlDate)}
        </div>
        <button className="cal-tl-today" onClick={() => setTlDate(new Date())}>Today</button>
        <div className="cal-tl-views">
          {(['Day', 'Week', 'Month'] as const).map(v => (
            <button key={v} className={`cal-tl-view${tlView === v ? ' act' : ''}`} onClick={() => setTlView(v)}>{v}</button>
          ))}
        </div>
      </div>

      {/* Day View */}
      {tlView === 'Day' && (
        <div className="cal-tl cal-fadein" style={{ animationDelay: '.15s' }}>
          {isToday && (() => {
            const topPx = (nowHour - 7) * 64 + (nowMin / 60) * 64
            return topPx > 0 ? <div className="cal-tl-now" style={{ top: topPx }} /> : null
          })()}
          {hours.map(h => {
            const rowSlots = slotsByHour[h] || []
            return (
              <div key={h} className="cal-tl-row">
                <div className="cal-tl-time">{String(h).padStart(2, '0')}:00</div>
                <div className="cal-tl-content">
                  {rowSlots.map(slot => {
                    if (slot.isGap) {
                      return (
                        <div key={slot.id} className="cal-tl-gap">
                          <span style={{ fontSize: 14 }}>⚠️</span>
                          <span className="cal-tl-gap-text">{slot.title}</span>
                        </div>
                      )
                    }
                    const catClass = slot.catSlug ? `cat-${slot.catSlug}` : ''
                    const extraClass = slot.isMatch ? 'match' : slot.isLive ? 'live' : ''
                    return (
                      <div
                        key={slot.id}
                        className={`cal-tl-card ${catClass} ${extraClass}`}
                        onClick={() => { if (!slot.isMatch && !slot.id.startsWith('g-')) router.push(`/editor/${slot.id}`) }}
                      >
                        <div className="cal-tl-card-body">
                          <div className="cal-tl-card-title">{slot.title}</div>
                          <div className="cal-tl-card-meta">
                            <span className={`cal-tl-badge ${slot.status === 'PUBLISHED' ? 'published' : slot.status === 'LIVE' ? 'live' : slot.status === 'SCHEDULED' ? 'scheduled' : 'draft'}`}>
                              {slot.status === 'LIVE' ? '● Live' : slot.status}
                            </span>
                            {slot.ai && <span className="cal-tl-badge ai">AI</span>}
                            {slot.catSlug && <span className="cal-tl-badge cat">{slot.catSlug}</span>}
                            {slot.isMatch && <span className="cal-tl-badge cat">⚽ Match</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Week View */}
      {tlView === 'Week' && (
        <div className="cal-wk cal-fadein" style={{ animationDelay: '.15s' }}>
          {weekDays.map(wd => (
            <div key={toDateStr(wd.date)} className={`cal-wk-day${wd.isToday ? ' today' : ''}`} onClick={() => { setTlDate(wd.date); setTlView('Day') }}>
              <div className="cal-wk-head">
                <span className="cal-wk-name">{DAYS_SHORT[((wd.date.getDay() + 6) % 7)]}</span>
                <span className="cal-wk-num">{wd.date.getDate()}</span>
                <span className="cal-wk-count">{wd.slots.filter(s => !s.isGap).length}</span>
              </div>
              <div className="cal-wk-body">
                {wd.slots.filter(s => !s.isGap).slice(0, 3).map(slot => (
                  <div key={slot.id} className="cal-wk-mini" style={{ borderColor: catColorMap[slot.catSlug] || '#D4D4D8' }}>
                    <div className="cal-wk-mini-time">{slot.time}</div>
                    <div className="cal-wk-mini-title">{slot.title}</div>
                  </div>
                ))}
                {wd.slots.filter(s => !s.isGap).length > 3 && (
                  <div style={{ fontSize: 10, color: '#A1A1AA', textAlign: 'center', padding: 4, fontWeight: 600 }}>
                    +{wd.slots.filter(s => !s.isGap).length - 3} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Month View */}
      {tlView === 'Month' && (
        <div className="cal-fadein" style={{ marginBottom: 24, animationDelay: '.15s' }}>
          <div className="cal-mo">
            {DAYS_SHORT.map(d => <div key={d} className="cal-mo-head">{d}</div>)}
            {monthCells.map((cell, i) => (
              <div
                key={i}
                className={`cal-mo-cell${cell.date ? (cell.isToday ? ' today' : '') : ' empty'}`}
                onClick={() => { if (cell.date) { setTlDate(cell.date); setTlView('Day') } }}
              >
                {cell.date && (
                  <>
                    <div className="cal-mo-date">{cell.date.getDate()}</div>
                    {cell.count > 0 && <span className="cal-mo-bubble has">{cell.count} articles</span>}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Footer Stats ═══ */}
      <div className="cal-footer cal-fadein" style={{ animationDelay: '.2s' }}>
        <div className="cal-fstat">
          <div className="cal-fstat-label">Articles</div>
          <div className="cal-fstat-val">{stats.today}/{config.dailyTarget}</div>
          <div className="cal-fstat-bar"><div className="cal-fstat-fill" style={{ width: `${Math.min(100, (stats.today / config.dailyTarget) * 100)}%` }} /></div>
        </div>
        <div className="cal-fstat">
          <div className="cal-fstat-label">Total Views</div>
          <div className="cal-fstat-val">{(stats.published * 1240).toLocaleString()}</div>
          <div className="cal-fstat-bar"><div className="cal-fstat-fill" style={{ width: '65%' }} /></div>
        </div>
        <div className="cal-fstat">
          <div className="cal-fstat-label">Live Now</div>
          <div className="cal-fstat-val">{stats.live}</div>
          <div className="cal-fstat-bar"><div className="cal-fstat-fill" style={{ width: stats.live > 0 ? '100%' : '0%', background: stats.live > 0 ? '#EF4444' : '#00D4AA' }} /></div>
        </div>
        <div className="cal-fstat">
          <div className="cal-fstat-label">Social Posts</div>
          <div className="cal-fstat-val">{config.channels.filter(c => c.isActive).length * stats.published}</div>
          <div className="cal-fstat-bar"><div className="cal-fstat-fill" style={{ width: '40%' }} /></div>
        </div>
      </div>
    </div>
  )
}
