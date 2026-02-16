'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import './calendar.css'

type Slot = {
  id: string
  time: string
  title: string
  variant: string
  tags: { label: string; cls: string }[]
  status: string
}

type ScheduledArticle = {
  id: string
  title: string
  date: string
  time: string
  category: string
  type: 'ai-auto' | 'manual' | 'fixture'
}

type DayData = {
  day: string
  date: number
  fullDate: Date
  today: boolean
  slots: Slot[]
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const FULL_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const categories = [
  'Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1',
  'Champions League', 'Europa League', 'World Cup', 'Transfer News', 'General',
]

const strategies = [
  { icon: '📰', name: 'Daily Output', desc: 'Articles per day target', val: '5 articles/day', editable: true },
  { icon: '⚽', name: 'Match Coverage', desc: 'Auto pre + post match', val: 'Pre · Live · Post', editable: false },
  { icon: '🎯', name: 'Focus Leagues', desc: 'Priority competitions', val: 'PL · La Liga · UCL', editable: false },
  { icon: '🕐', name: 'Peak Times', desc: 'Optimal publish windows', val: '08:00 · 12:00 · 18:00', editable: false },
  { icon: '🔄', name: 'Autopilot Mode', desc: 'Human review or full auto', val: 'Full Auto ⚡', editable: false },
]

const fixtures = [
  { time: 'Today', match: 'Real Madrid vs Barcelona', league: 'La Liga', slots: '3 slots' },
  { time: 'Today', match: 'Arsenal vs Chelsea', league: 'PL', slots: '3 slots' },
  { time: 'Sun', match: 'Napoli vs Inter', league: 'Serie A', slots: '2 slots' },
  { time: 'Mon', match: 'PSG vs Marseille', league: 'Ligue 1', slots: null },
  { time: 'Tue', match: 'Bayern vs Real Madrid', league: 'UCL SF', slots: '3 slots' },
]

const contentMix = [
  { label: 'Pre-Match', pct: 35, color: 'var(--mint)' },
  { label: 'Post-Match', pct: 25, color: 'var(--elec)' },
  { label: 'Transfers', pct: 15, color: 'var(--gold)' },
  { label: 'Analysis', pct: 15, color: '#8B5CF6' },
  { label: 'Trending', pct: 10, color: 'var(--coral)' },
]

const PREMATCH_TEMPLATES = [
  '{home} vs {away}: Match Preview & Predictions',
  '{home} vs {away}: Key Stats & Tactical Breakdown',
  'GW{gw} Preview: {home} host {away}',
]
const POSTMATCH_TEMPLATES = [
  '{home} {hs}-{as} {away}: Ratings & Analysis',
  '{home} {hs}-{as} {away}: Match Report',
  '{home} edge past {away} {hs}-{as} — Key Takeaways',
]
const TRANSFER_TEMPLATES = [
  'Transfer Roundup: Latest Deals & Rumours',
  '{player}: {team} Close to Signing — Report',
  '{team} Eyeing {player} Move This Window',
]
const ANALYSIS_TEMPLATES = [
  'Title Race: Statistical Deep Dive GW{gw}',
  '{player}: Season Stats Breakdown',
  'Top 10 Goals of the Week — GW{gw}',
]
const BRIEFING_TEMPLATES = [
  'Morning Briefing: {day} Preview',
  'Daily Briefing: Weekend Fixtures Roundup',
  '{day} Sports Roundup: Everything You Need to Know',
]

const TEAMS = [
  ['Arsenal', 'Chelsea'], ['Liverpool', 'Man City'], ['Newcastle', 'Aston Villa'],
  ['Tottenham', 'Man United'], ['Real Madrid', 'Barcelona'], ['Bayern', 'Dortmund'],
  ['PSG', 'Marseille'], ['Napoli', 'Inter'], ['Juventus', 'AC Milan'], ['Atletico', 'Sevilla'],
]
const PLAYERS = [
  'Haaland', 'Salah', 'Mbappé', 'Saka', 'Palmer', 'Isak', 'Vinícius Jr', 'Bellingham',
  'Yamal', 'Wirtz', 'Osimhen', 'Kane',
]
const TEAM_NAMES = ['Arsenal', 'Liverpool', 'Man City', 'Chelsea', 'Real Madrid', 'Bayern', 'PSG', 'Barcelona', 'Napoli', 'Juventus']

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff
    return s / 0x7fffffff
  }
}

function pickTemplate(templates: string[], rng: () => number): string {
  return templates[Math.floor(rng() * templates.length)]
}

function fillTemplate(template: string, rng: () => number, gw: number, dayName: string): string {
  const matchup = TEAMS[Math.floor(rng() * TEAMS.length)]
  const player = PLAYERS[Math.floor(rng() * PLAYERS.length)]
  const team = TEAM_NAMES[Math.floor(rng() * TEAM_NAMES.length)]
  return template
    .replace('{home}', matchup[0])
    .replace('{away}', matchup[1])
    .replace('{hs}', String(Math.floor(rng() * 4)))
    .replace('{as}', String(Math.floor(rng() * 3)))
    .replace('{player}', player)
    .replace('{team}', team)
    .replace('{gw}', String(gw))
    .replace('{day}', dayName)
}

function generateSlotsForDay(date: Date, today: boolean, dailyTarget: number): Slot[] {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
  const rng = seededRandom(seed)
  const dayOfWeek = date.getDay()
  const gw = Math.floor((date.getTime() / 86400000) % 38) + 1
  const dayName = DAY_NAMES[dayOfWeek]
  const isPast = date < new Date(new Date().toDateString())
  const slots: Slot[] = []
  let id = 0

  const makeSlot = (time: string, title: string, variant: string, tags: { label: string; cls: string }[], isFuture: boolean): Slot => ({
    id: `${seed}-${id++}`,
    time,
    title,
    variant,
    tags,
    status: isFuture ? (variant === 'ai-gen' ? 'draft' : 'scheduled') : 'published',
  })

  const briefing = fillTemplate(pickTemplate(BRIEFING_TEMPLATES, rng), rng, gw, dayName)
  slots.push(makeSlot('08:00', briefing, 'prematch', [{ label: 'AI', cls: 'ai' }], !isPast && !today))

  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    if (rng() > 0.5) {
      const t = fillTemplate(pickTemplate(TRANSFER_TEMPLATES, rng), rng, gw, dayName)
      slots.push(makeSlot('10:30', t, 'transfer', [{ label: 'AI', cls: 'ai' }], !isPast && !today))
    } else {
      const t = fillTemplate(pickTemplate(ANALYSIS_TEMPLATES, rng), rng, gw, dayName)
      slots.push(makeSlot('11:00', t, 'analysis', [{ label: 'AI', cls: 'ai' }], !isPast && !today))
    }
  }

  if (dayOfWeek >= 2 && dayOfWeek <= 6) {
    const t = fillTemplate(pickTemplate(PREMATCH_TEMPLATES, rng), rng, gw, dayName)
    slots.push(makeSlot('14:00', t, 'prematch', [{ label: 'FIXTURE', cls: 'fixture' }, { label: 'AI', cls: 'ai' }], !isPast && !today))
  }

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    const pre = fillTemplate(pickTemplate(PREMATCH_TEMPLATES, rng), rng, gw, dayName)
    slots.push(makeSlot('12:00', pre, 'prematch', [{ label: 'FIXTURE', cls: 'fixture' }, { label: 'AI', cls: 'ai' }], !isPast && !today))

    if (today) {
      slots.push(makeSlot('15:00', 'PL 3pm Kickoffs: Live Coverage Plan', 'prematch', [{ label: 'AI', cls: 'ai' }], true))
      slots.push(makeSlot('18:00', 'PL Results Roundup — generating after FT', 'ai-gen', [{ label: 'AI AUTO', cls: 'ai' }], true))
      slots.push(makeSlot('20:30', 'Evening Match Live Updates — auto on KO', 'ai-gen', [{ label: 'LIVE', cls: 'live' }, { label: 'AI AUTO', cls: 'ai' }], true))
    } else if (!isPast) {
      slots.push(makeSlot('15:00', 'Afternoon Matches — auto-generate', 'ai-gen', [{ label: 'AI AUTO', cls: 'ai' }], true))
      slots.push(makeSlot('18:00', 'Results Roundup — auto-generate', 'ai-gen', [{ label: 'AI AUTO', cls: 'ai' }], true))
    } else {
      const post1 = fillTemplate(pickTemplate(POSTMATCH_TEMPLATES, rng), rng, gw, dayName)
      slots.push(makeSlot('17:30', post1, 'postmatch', [{ label: 'FIXTURE', cls: 'fixture' }, { label: 'AI', cls: 'ai' }], false))
      const post2 = fillTemplate(pickTemplate(POSTMATCH_TEMPLATES, rng), rng, gw, dayName)
      slots.push(makeSlot('20:00', post2, 'postmatch', [{ label: 'FIXTURE', cls: 'fixture' }, { label: 'AI', cls: 'ai' }], false))
    }
  }

  if (dayOfWeek === 3 || dayOfWeek === 4) {
    const t = fillTemplate(pickTemplate(POSTMATCH_TEMPLATES, rng), rng, gw, dayName)
    slots.push(makeSlot('23:00', t, 'postmatch', [{ label: 'FIXTURE', cls: 'fixture' }, { label: 'AI', cls: 'ai' }], !isPast && !today))
  }

  const times = ['09:00', '13:00', '16:00', '19:00', '21:00']
  let ti = 0
  while (slots.length < Math.min(dailyTarget, 8) && ti < times.length) {
    const t = fillTemplate(pickTemplate([...ANALYSIS_TEMPLATES, ...TRANSFER_TEMPLATES], rng), rng, gw, dayName)
    const variant = rng() > 0.5 ? 'analysis' : 'transfer'
    slots.push(makeSlot(times[ti], t, variant, [{ label: 'AI', cls: 'ai' }], !isPast && !today))
    ti++
  }

  slots.sort((a, b) => a.time.localeCompare(b.time))
  return slots
}

function getMonday(d: Date): Date {
  const dt = new Date(d)
  const day = dt.getDay()
  const diff = day === 0 ? -6 : 1 - day
  dt.setDate(dt.getDate() + diff)
  dt.setHours(0, 0, 0, 0)
  return dt
}

function addDays(d: Date, n: number): Date {
  const dt = new Date(d)
  dt.setDate(dt.getDate() + n)
  return dt
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatDateRange(start: Date): string {
  const end = addDays(start, 6)
  if (start.getMonth() === end.getMonth()) {
    return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} — ${end.getDate()}, ${start.getFullYear()}`
  }
  return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} — ${MONTH_NAMES[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {children}
    </div>
  )
}

function ScheduleModal({ onClose, onSave, defaultDate }: {
  onClose: () => void
  onSave: (article: ScheduledArticle) => void
  defaultDate: string
}) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('12:00')
  const [category, setCategory] = useState(categories[0])
  const [type, setType] = useState<'ai-auto' | 'manual' | 'fixture'>('ai-auto')

  const handleSave = () => {
    if (!title.trim()) return
    onSave({
      id: `sched-${Date.now()}`,
      title: title.trim(),
      date,
      time,
      category,
      type,
    })
    onClose()
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{
        background: '#fff', borderRadius: typeof window !== 'undefined' && window.innerWidth <= 768 ? 0 : 16,
        width: '100%', maxWidth: typeof window !== 'undefined' && window.innerWidth <= 768 ? '100%' : 480,
        height: typeof window !== 'undefined' && window.innerWidth <= 768 ? '100%' : 'auto',
        padding: typeof window !== 'undefined' && window.innerWidth <= 768 ? '20px 16px' : 28,
        boxShadow: '0 24px 48px rgba(0,0,0,.15)',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#18181B' }}>Schedule Article</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#A1A1AA', cursor: 'pointer' }}>&times;</button>
        </div>

        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#52525B', display: 'block', marginBottom: 6 }}>Article Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Arsenal vs Chelsea: Match Preview"
            style={{
              width: '100%', padding: '10px 14px', fontSize: 14, fontWeight: 600,
              border: '2px solid #E4E4E7', borderRadius: 10, outline: 'none',
              fontFamily: 'inherit', transition: 'border-color .15s',
            }}
            onFocus={(e) => e.target.style.borderColor = '#00D4AA'}
            onBlur={(e) => e.target.style.borderColor = '#E4E4E7'}
            autoFocus
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <label>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#52525B', display: 'block', marginBottom: 6 }}>Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', fontSize: 13, fontWeight: 600,
                border: '2px solid #E4E4E7', borderRadius: 10, outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </label>
          <label>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#52525B', display: 'block', marginBottom: 6 }}>Time</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', fontSize: 13, fontWeight: 600,
                border: '2px solid #E4E4E7', borderRadius: 10, outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </label>
        </div>

        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#52525B', display: 'block', marginBottom: 6 }}>Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', fontSize: 13, fontWeight: 600,
              border: '2px solid #E4E4E7', borderRadius: 10, outline: 'none',
              fontFamily: 'inherit', background: '#fff', cursor: 'pointer',
            }}
          >
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <div style={{ marginBottom: 24 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#52525B', display: 'block', marginBottom: 8 }}>Type</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {([
              { value: 'ai-auto', label: '🤖 AI Auto', bg: '#00D4AA' },
              { value: 'manual', label: '✍️ Manual', bg: '#71717A' },
              { value: 'fixture', label: '⚽ Fixture', bg: '#EAB308' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setType(opt.value)}
                style={{
                  flex: 1, padding: '10px 12px', fontSize: 12, fontWeight: 700,
                  border: `2px solid ${type === opt.value ? opt.bg : '#E4E4E7'}`,
                  borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                  background: type === opt.value ? `${opt.bg}10` : '#fff',
                  color: type === opt.value ? opt.bg : '#71717A',
                  transition: 'all .15s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!title.trim()}
          style={{
            width: '100%', padding: '12px', fontSize: 14, fontWeight: 700, color: '#fff',
            border: 'none', borderRadius: 12, cursor: title.trim() ? 'pointer' : 'not-allowed',
            background: title.trim() ? 'linear-gradient(135deg, #00D4AA, #00A888)' : '#D4D4D8',
            fontFamily: 'inherit', transition: 'all .15s',
          }}
        >
          Schedule Article
        </button>
      </div>
    </Overlay>
  )
}

function DailyOutputModal({ onClose, value, onChange }: {
  onClose: () => void
  value: number
  onChange: (v: number) => void
}) {
  const [val, setVal] = useState(value)

  return (
    <Overlay onClose={onClose}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 380,
        padding: 28, boxShadow: '0 24px 48px rgba(0,0,0,.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#18181B' }}>📰 Daily Output</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#A1A1AA', cursor: 'pointer' }}>&times;</button>
        </div>

        <p style={{ fontSize: 13, color: '#71717A', marginBottom: 20 }}>Set the target number of articles per day.</p>

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 48, fontWeight: 800, fontFamily: 'var(--mono)', color: '#00D4AA' }}>{val}</span>
          <span style={{ fontSize: 16, color: '#71717A', marginLeft: 4 }}>articles/day</span>
        </div>

        <input
          type="range"
          min={1}
          max={10}
          value={val}
          onChange={(e) => setVal(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#00D4AA', marginBottom: 8 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#A1A1AA', marginBottom: 24 }}>
          <span>1</span><span>5</span><span>10</span>
        </div>

        <button
          onClick={() => { onChange(val); onClose() }}
          style={{
            width: '100%', padding: '12px', fontSize: 14, fontWeight: 700, color: '#fff',
            border: 'none', borderRadius: 12, cursor: 'pointer',
            background: 'linear-gradient(135deg, #00D4AA, #00A888)',
            fontFamily: 'inherit',
          }}
        >
          Save Target
        </button>
      </div>
    </Overlay>
  )
}

export default function CalendarPage() {
  const [activeStrat, setActiveStrat] = useState(0)
  const [activeView, setActiveView] = useState<'Week' | 'Month' | 'List'>('Week')
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()))
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showOutputModal, setShowOutputModal] = useState(false)
  const [scheduledArticles, setScheduledArticles] = useState<ScheduledArticle[]>([])
  const [dailyTarget, setDailyTarget] = useState(5)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (isMobile && activeView === 'Week') {
      setActiveView('List')
    }
  }, [isMobile]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cal-scheduled')
      if (saved) setScheduledArticles(JSON.parse(saved))
      const target = localStorage.getItem('cal-daily-target')
      if (target) setDailyTarget(Number(target))
    } catch {}
  }, [])

  const saveArticle = useCallback((article: ScheduledArticle) => {
    setScheduledArticles((prev) => {
      const next = [...prev, article]
      localStorage.setItem('cal-scheduled', JSON.stringify(next))
      return next
    })
  }, [])

  const saveDailyTarget = useCallback((v: number) => {
    setDailyTarget(v)
    localStorage.setItem('cal-daily-target', String(v))
  }, [])

  const goToPrevWeek = () => setCurrentWeekStart((d) => addDays(d, -7))
  const goToNextWeek = () => setCurrentWeekStart((d) => addDays(d, 7))
  const goToToday = () => setCurrentWeekStart(getMonday(new Date()))

  const today = useMemo(() => new Date(), [])

  const weekData: DayData[] = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const fullDate = addDays(currentWeekStart, i)
      const isToday = isSameDay(fullDate, today)
      const baseSlots = generateSlotsForDay(fullDate, isToday, dailyTarget)

      const dateStr = fullDate.toISOString().split('T')[0]
      const userSlots: Slot[] = scheduledArticles
        .filter((a) => a.date === dateStr)
        .map((a) => ({
          id: a.id,
          time: a.time,
          title: a.title,
          variant: a.type === 'ai-auto' ? 'ai-gen' : a.type === 'fixture' ? 'prematch' : 'transfer',
          tags: [
            ...(a.type === 'ai-auto' ? [{ label: 'AI AUTO', cls: 'ai' }] : []),
            ...(a.type === 'fixture' ? [{ label: 'FIXTURE', cls: 'fixture' }] : []),
            ...(a.type === 'manual' ? [{ label: 'MANUAL', cls: 'manual' }] : []),
          ],
          status: 'scheduled',
        }))

      const allSlots = [...baseSlots, ...userSlots].sort((a, b) => a.time.localeCompare(b.time))

      return {
        day: DAY_NAMES[fullDate.getDay()],
        date: fullDate.getDate(),
        fullDate,
        today: isToday,
        slots: allSlots,
      }
    })
  }, [currentWeekStart, today, dailyTarget, scheduledArticles])

  const weekTotal = weekData.reduce((sum, d) => sum + d.slots.length, 0)
  const publishedCount = weekData.reduce((sum, d) => sum + d.slots.filter((s) => s.status === 'published').length, 0)
  const onTimeRate = weekTotal > 0 ? Math.round((publishedCount / weekTotal) * 100) : 0

  const effectiveStrategies = strategies.map((s, i) =>
    i === 0 ? { ...s, val: `${dailyTarget} articles/day` } : s
  )

  const defaultScheduleDate = today.toISOString().split('T')[0]

  const monthData = useMemo(() => {
    const firstOfMonth = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), 1)
    const lastOfMonth = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth() + 1, 0)
    const startDay = firstOfMonth.getDay() === 0 ? 6 : firstOfMonth.getDay() - 1
    const days: { date: Date | null; count: number; isToday: boolean }[] = []

    for (let i = 0; i < startDay; i++) days.push({ date: null, count: 0, isToday: false })

    for (let d = 1; d <= lastOfMonth.getDate(); d++) {
      const dt = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth(), d)
      const slots = generateSlotsForDay(dt, false, dailyTarget)
      const dateStr = dt.toISOString().split('T')[0]
      const userCount = scheduledArticles.filter((a) => a.date === dateStr).length
      days.push({ date: dt, count: slots.length + userCount, isToday: isSameDay(dt, today) })
    }

    return { month: FULL_MONTH_NAMES[firstOfMonth.getMonth()], year: firstOfMonth.getFullYear(), days }
  }, [currentWeekStart, today, dailyTarget, scheduledArticles])

  const listData = useMemo(() => {
    return weekData.flatMap((d) =>
      d.slots.map((s) => ({ ...s, dayLabel: `${d.day}, ${MONTH_NAMES[d.fullDate.getMonth()]} ${d.date}`, fullDate: d.fullDate }))
    )
  }, [weekData])

  return (
    <div className="cal-page">
      <div className="cal-header">
        <div className="cal-header-left">
          <h1>Content Calendar</h1>
          <p>Plan and schedule your content pipeline</p>
        </div>
        <button className="cal-schedule-btn" onClick={() => setShowScheduleModal(true)}>✨ Schedule Article</button>
      </div>

      <div className="cal-autopilot">
        <div className="cal-ap-dot"></div>
        <div className="cal-ap-text">
          <div className="cal-ap-title">🚀 Autopilot Active <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--g500)', marginLeft: 4 }}>since {MONTH_NAMES[currentWeekStart.getMonth()]} {currentWeekStart.getDate()}</span></div>
          <div className="cal-ap-sub">AI is generating {dailyTarget} articles/day &middot; {weekTotal} articles this week</div>
        </div>
        <div className="cal-ap-stats">
          <div className="cal-ap-stat"><div className="cal-ap-stat-val">{weekTotal}</div><div className="cal-ap-stat-label">This Week</div></div>
          <div className="cal-ap-stat"><div className="cal-ap-stat-val">{onTimeRate}%</div><div className="cal-ap-stat-label">On Time</div></div>
          <div className="cal-ap-stat"><div className="cal-ap-stat-val">{Math.round(weekTotal * 8.3)}K</div><div className="cal-ap-stat-label">Reach</div></div>
        </div>
      </div>

      <div className="cal-strategy">
        {effectiveStrategies.map((s, i) => (
          <div
            key={s.name}
            className={`cal-strat${activeStrat === i ? ' active' : ''}`}
            onClick={() => {
              setActiveStrat(i)
              if (i === 0) setShowOutputModal(true)
            }}
          >
            <div className="cal-strat-icon">{s.icon}</div>
            <div className="cal-strat-name">{s.name}{i === 0 && <span style={{ fontSize: 9, marginLeft: 4, opacity: 0.5 }}>✎</span>}</div>
            <div className="cal-strat-desc">{s.desc}</div>
            <div className="cal-strat-val">{s.val}</div>
          </div>
        ))}
      </div>

      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={goToPrevWeek}>&laquo;</button>
        <button className="cal-nav-btn" onClick={goToNextWeek}>&raquo;</button>
        <div className="cal-period">
          {activeView === 'Month'
            ? `${monthData.month} ${monthData.year}`
            : formatDateRange(currentWeekStart)}
        </div>
        <button className="cal-today-btn" onClick={goToToday}>Today</button>
        <div className="cal-views">
          {(['Week', 'Month', 'List'] as const).map((v) => (
            <button
              key={v}
              className={`cal-view-btn${activeView === v ? ' act' : ''}`}
              onClick={() => setActiveView(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {activeView === 'Week' && (
        <div className="cal-week">
          {weekData.map((d) => (
            <div key={d.fullDate.toISOString()} className={`cal-day${d.today ? ' today' : ''}`}>
              <div className="cal-day-head">
                <span className="cal-day-name">{d.day}</span>
                <span className="cal-day-date">{d.date}</span>
                <span className="cal-day-count">{d.slots.length}</span>
              </div>
              <div className="cal-day-body">
                {d.slots.map((slot) => (
                  <div key={slot.id} className={`cal-slot ${slot.variant}`}>
                    <span className={`cal-slot-status ${slot.status}`}></span>
                    <div className="cal-slot-time">{slot.time}</div>
                    <div className="cal-slot-title">{slot.variant === 'ai-gen' ? '🤖 ' : ''}{slot.title}</div>
                    <div className="cal-slot-meta">
                      {slot.tags.map((t, ti) => (
                        <span key={ti} className={`cal-slot-tag ${t.cls}`}>{t.label}</span>
                      ))}
                    </div>
                  </div>
                ))}
                <button
                  className="cal-day-add"
                  onClick={() => {
                    const dateStr = d.fullDate.toISOString().split('T')[0]
                    setShowScheduleModal(true)
                    setTimeout(() => {
                      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
                      if (dateInput) dateInput.value = dateStr
                    }, 50)
                  }}
                >
                  + Add Slot
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeView === 'Month' && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--g400)', textTransform: 'uppercase', letterSpacing: '.08em', padding: '8px 0' }}>
                {d}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {monthData.days.map((cell, i) => (
              <div
                key={i}
                style={{
                  minHeight: 80, padding: '8px 10px',
                  background: cell.date ? (cell.isToday ? 'var(--mint-l)' : 'var(--wh)') : 'transparent',
                  border: cell.date ? `1px solid ${cell.isToday ? 'var(--mint)' : 'var(--brd)'}` : 'none',
                  borderRadius: 10, cursor: cell.date ? 'pointer' : 'default',
                  transition: 'all .15s',
                }}
              >
                {cell.date && (
                  <>
                    <div style={{
                      fontSize: 13, fontWeight: 800, fontFamily: 'var(--mono)',
                      color: cell.isToday ? 'var(--mint)' : 'var(--g900)', marginBottom: 6,
                    }}>
                      {cell.date.getDate()}
                    </div>
                    {cell.count > 0 && (
                      <div style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                        background: cell.count >= 5 ? 'var(--mint-l)' : 'var(--g100)',
                        color: cell.count >= 5 ? 'var(--mint-d)' : 'var(--g500)',
                        display: 'inline-block',
                      }}>
                        {cell.count} articles
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === 'List' && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            background: 'var(--wh)', border: '1px solid var(--brd)', borderRadius: 12,
            overflow: 'hidden',
          }}>
            {!isMobile && (
              <div style={{
                display: 'grid', gridTemplateColumns: '100px 80px 1fr 100px 80px',
                padding: '10px 16px', borderBottom: '1px solid var(--g100)',
                fontSize: 10, fontWeight: 700, color: 'var(--g400)', textTransform: 'uppercase', letterSpacing: '.06em',
              }}>
                <div>Date</div>
                <div>Time</div>
                <div>Title</div>
                <div>Type</div>
                <div>Status</div>
              </div>
            )}
            {listData.map((item) => (
              <div
                key={item.id}
                style={isMobile ? {
                  padding: '10px 14px', borderBottom: '1px solid var(--g50)',
                  cursor: 'pointer', transition: 'background .12s',
                } : {
                  display: 'grid', gridTemplateColumns: '100px 80px 1fr 100px 80px',
                  padding: '10px 16px', borderBottom: '1px solid var(--g50)',
                  fontSize: 12, alignItems: 'center', transition: 'background .12s', cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--g50)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {isMobile ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--g400)', fontSize: 10 }}>{item.time}</span>
                      <span style={{ fontWeight: 600, color: 'var(--g500)', fontSize: 10 }}>{item.dayLabel}</span>
                      <span style={{
                        marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3,
                        fontSize: 9, fontWeight: 700, textTransform: 'capitalize',
                        color: item.status === 'published' ? 'var(--suc)' : item.status === 'scheduled' ? 'var(--elec)' : item.status === 'generating' ? 'var(--gold)' : 'var(--g400)',
                      }}>
                        <span style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: item.status === 'published' ? 'var(--suc)' : item.status === 'scheduled' ? 'var(--elec)' : item.status === 'generating' ? 'var(--gold)' : 'var(--g300)',
                        }} />
                        {item.status}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--g800)', fontSize: 12, marginBottom: 4, lineHeight: 1.3 }}>
                      {item.title}
                    </div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {item.tags.map((t, ti) => (
                        <span key={ti} className={`cal-slot-tag ${t.cls}`}>{t.label}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 600, color: 'var(--g500)', fontSize: 11 }}>{item.dayLabel}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--g400)', fontSize: 11 }}>{item.time}</div>
                    <div style={{ fontWeight: 600, color: 'var(--g800)', paddingRight: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </div>
                    <div>
                      {item.tags.map((t, ti) => (
                        <span key={ti} className={`cal-slot-tag ${t.cls}`} style={{ marginRight: 3 }}>{t.label}</span>
                      ))}
                    </div>
                    <div>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 10, fontWeight: 700, textTransform: 'capitalize',
                        color: item.status === 'published' ? 'var(--suc)' : item.status === 'scheduled' ? 'var(--elec)' : item.status === 'generating' ? 'var(--gold)' : 'var(--g400)',
                      }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: item.status === 'published' ? 'var(--suc)' : item.status === 'scheduled' ? 'var(--elec)' : item.status === 'generating' ? 'var(--gold)' : 'var(--g300)',
                        }} />
                        {item.status}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))}
            {listData.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--g400)', fontSize: 13 }}>
                No articles scheduled for this week.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="cal-bottom">
        <div className="cal-bp-card">
          <div className="cal-bp-head">
            <div className="cal-bp-title">⚽ Upcoming Fixtures (Auto-Coverage)</div>
          </div>
          {fixtures.map((f) => (
            <div key={f.match} className="cal-fixture">
              <span className="cal-fix-time">{f.time}</span>
              <span className="cal-fix-match">{f.match}</span>
              <span className="cal-fix-league">{f.league}</span>
              {f.slots ? (
                <span className="cal-fix-slots">{f.slots}</span>
              ) : (
                <span style={{ fontSize: 9, color: 'var(--g400)', fontFamily: 'var(--mono)', fontWeight: 700 }}>Not scheduled</span>
              )}
            </div>
          ))}
        </div>

        <div className="cal-bp-card">
          <div className="cal-bp-head">
            <div className="cal-bp-title">📊 Content Mix This Week</div>
          </div>
          {contentMix.map((m) => (
            <div key={m.label} className="cal-mix-row">
              <span className="cal-mix-label">{m.label}</span>
              <div className="cal-mix-bar">
                <div className="cal-mix-fill" style={{ width: `${m.pct}%`, background: m.color }}></div>
              </div>
              <span className="cal-mix-val">{m.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {showScheduleModal && (
        <ScheduleModal
          onClose={() => setShowScheduleModal(false)}
          onSave={saveArticle}
          defaultDate={defaultScheduleDate}
        />
      )}
      {showOutputModal && (
        <DailyOutputModal
          onClose={() => setShowOutputModal(false)}
          value={dailyTarget}
          onChange={saveDailyTarget}
        />
      )}
    </div>
  )
}
