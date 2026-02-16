'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import './copilot.css'

type CopilotMode = 'full-auto' | 'hybrid' | 'manual'

type QueueItem = {
  id: string
  title: string
  category: string
  suggestedTime: string
  confidence: number
  status: 'pending' | 'approved' | 'rejected'
}

type ContentStrategy = {
  dailyTarget: number
  peakTimes: string[]
  articleLength: 'short' | 'medium' | 'long'
  tone: 'professional' | 'fan' | 'casual' | 'data-heavy'
  mixMatch: number
  mixTransfer: number
  mixAnalysis: number
  mixFan: number
}

type AutopilotRule = {
  id: string
  name: string
  teamFilter: 'top6' | 'all' | 'specific'
  specificTeams: string
  slots: { type: string; timing: string; template: string }[]
}

type FixtureData = {
  id: string
  home: string
  away: string
  league: string
  date: string
  time: string
  articles: { type: string; timing: string }[]
}

const DEFAULT_QUEUE: QueueItem[] = [
  { id: 'q1', title: 'Arsenal vs Chelsea: Complete Match Preview & Predictions', category: 'Premier League', suggestedTime: '14:00', confidence: 94, status: 'pending' },
  { id: 'q2', title: 'Transfer Roundup: January Window — Top 10 Deals to Watch', category: 'Transfer News', suggestedTime: '10:30', confidence: 87, status: 'pending' },
  { id: 'q3', title: 'Champions League QF Draw: Who Will Face Who?', category: 'Champions League', suggestedTime: '16:00', confidence: 91, status: 'pending' },
  { id: 'q4', title: 'Mbappé Real Madrid — First Season Statistical Deep Dive', category: 'La Liga', suggestedTime: '12:00', confidence: 78, status: 'pending' },
  { id: 'q5', title: 'Premier League Title Race: GW26 Analysis & Predictions', category: 'Premier League', suggestedTime: '08:00', confidence: 85, status: 'pending' },
]

const DEFAULT_STRATEGY: ContentStrategy = {
  dailyTarget: 5,
  peakTimes: ['08:00', '12:00', '18:00'],
  articleLength: 'medium',
  tone: 'professional',
  mixMatch: 40,
  mixTransfer: 20,
  mixAnalysis: 25,
  mixFan: 15,
}

const DEFAULT_RULES: AutopilotRule[] = [
  {
    id: 'rule-big',
    name: 'Big Match',
    teamFilter: 'top6',
    specificTeams: '',
    slots: [
      { type: 'Preview', timing: '-24h', template: 'Full preview with stats, form, H2H' },
      { type: 'Starting XI', timing: '-2h', template: 'Lineup analysis & tactical preview' },
      { type: 'Match Recap', timing: '+15min', template: 'Full match report with ratings' },
      { type: 'Player Ratings', timing: '+2h', template: 'Individual ratings & analysis' },
    ],
  },
  {
    id: 'rule-regular',
    name: 'Regular Match',
    teamFilter: 'all',
    specificTeams: '',
    slots: [
      { type: 'Preview', timing: '-4h', template: 'Standard preview with key stats' },
      { type: 'Match Recap', timing: '+30min', template: 'Results summary & key moments' },
    ],
  },
]

const DEFAULT_FIXTURES: FixtureData[] = [
  { id: 'f1', home: 'Arsenal', away: 'Chelsea', league: 'Premier League', date: 'Sat, Feb 21', time: '17:30', articles: [{ type: 'Preview', timing: '-24h' }, { type: 'Starting XI', timing: '-2h' }, { type: 'Recap', timing: '+15min' }, { type: 'Ratings', timing: '+2h' }] },
  { id: 'f2', home: 'Real Madrid', away: 'Barcelona', league: 'La Liga', date: 'Sun, Feb 22', time: '21:00', articles: [{ type: 'Preview', timing: '-24h' }, { type: 'Starting XI', timing: '-2h' }, { type: 'Recap', timing: '+15min' }, { type: 'Ratings', timing: '+2h' }] },
  { id: 'f3', home: 'Liverpool', away: 'Man City', league: 'Premier League', date: 'Sun, Feb 22', time: '16:30', articles: [{ type: 'Preview', timing: '-24h' }, { type: 'Starting XI', timing: '-2h' }, { type: 'Recap', timing: '+15min' }, { type: 'Ratings', timing: '+2h' }] },
  { id: 'f4', home: 'PSG', away: 'Marseille', league: 'Ligue 1', date: 'Mon, Feb 23', time: '21:00', articles: [{ type: 'Preview', timing: '-4h' }, { type: 'Recap', timing: '+30min' }] },
  { id: 'f5', home: 'Bayern', away: 'Dortmund', league: 'Bundesliga', date: 'Tue, Feb 24', time: '20:30', articles: [{ type: 'Preview', timing: '-24h' }, { type: 'Starting XI', timing: '-2h' }, { type: 'Recap', timing: '+15min' }, { type: 'Ratings', timing: '+2h' }] },
]

const PEAK_TIME_OPTIONS = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']
const MIX_COLORS = ['var(--mint)', 'var(--gold)', '#8B5CF6', 'var(--coral)']
const MIX_LABELS = ['Match Coverage', 'Transfer News', 'Analysis', 'Fan Content']

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

function saveJSON(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data))
}

function confColor(c: number): string {
  if (c >= 90) return 'var(--suc)'
  if (c >= 80) return 'var(--mint)'
  if (c >= 70) return 'var(--gold)'
  return 'var(--g400)'
}
function confBg(c: number): string {
  if (c >= 90) return 'var(--suc-l)'
  if (c >= 80) return 'var(--mint-l)'
  if (c >= 70) return 'var(--gold-l)'
  return 'var(--g100)'
}

export default function CopilotPage() {
  const [mode, setMode] = useState<CopilotMode>('hybrid')
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [strategy, setStrategy] = useState<ContentStrategy>(DEFAULT_STRATEGY)
  const [rules, setRules] = useState<AutopilotRule[]>(DEFAULT_RULES)
  const [fixtures] = useState<FixtureData[]>(DEFAULT_FIXTURES)
  const [expandedFixture, setExpandedFixture] = useState<string | null>(null)
  const [showAddRule, setShowAddRule] = useState(false)
  const [saveFlash, setSaveFlash] = useState(false)

  // New rule form
  const [newRuleName, setNewRuleName] = useState('')
  const [newRuleFilter, setNewRuleFilter] = useState<'top6' | 'all' | 'specific'>('all')
  const [newRuleTeams, setNewRuleTeams] = useState('')
  const [newRuleSlots, setNewRuleSlots] = useState([{ type: 'Preview', timing: '-4h', template: 'Standard preview' }])

  useEffect(() => {
    setMode(loadJSON('copilot-mode', 'hybrid') as CopilotMode)
    setQueue(loadJSON('copilot-queue', DEFAULT_QUEUE))
    setStrategy(loadJSON('copilot-strategy', DEFAULT_STRATEGY))
    setRules(loadJSON('copilot-rules', DEFAULT_RULES))
  }, [])

  const changeMode = useCallback((m: CopilotMode) => {
    setMode(m)
    saveJSON('copilot-mode', m)
  }, [])

  const approveItem = useCallback((id: string) => {
    setQueue(prev => {
      const next = prev.map(q => q.id === id ? { ...q, status: 'approved' as const } : q)
      saveJSON('copilot-queue', next)
      return next
    })
  }, [])

  const rejectItem = useCallback((id: string) => {
    setQueue(prev => {
      const next = prev.map(q => q.id === id ? { ...q, status: 'rejected' as const } : q)
      saveJSON('copilot-queue', next)
      return next
    })
  }, [])

  const approveAll = useCallback(() => {
    setQueue(prev => {
      const next = prev.map(q => q.status === 'pending' ? { ...q, status: 'approved' as const } : q)
      saveJSON('copilot-queue', next)
      return next
    })
  }, [])

  const updateStrategy = useCallback((partial: Partial<ContentStrategy>) => {
    setStrategy(prev => ({ ...prev, ...partial }))
  }, [])

  const togglePeakTime = useCallback((time: string) => {
    setStrategy(prev => ({
      ...prev,
      peakTimes: prev.peakTimes.includes(time)
        ? prev.peakTimes.filter(t => t !== time)
        : [...prev.peakTimes, time].sort(),
    }))
  }, [])

  const updateMix = useCallback((key: 'mixMatch' | 'mixTransfer' | 'mixAnalysis' | 'mixFan', value: number) => {
    setStrategy(prev => {
      const keys: ('mixMatch' | 'mixTransfer' | 'mixAnalysis' | 'mixFan')[] = ['mixMatch', 'mixTransfer', 'mixAnalysis', 'mixFan']
      const others = keys.filter(k => k !== key)
      const oldTotal = others.reduce((s, k) => s + prev[k], 0)
      const remaining = 100 - value

      if (oldTotal === 0) {
        const each = Math.floor(remaining / 3)
        const extra = remaining - each * 3
        return { ...prev, [key]: value, [others[0]]: each + extra, [others[1]]: each, [others[2]]: each }
      }

      const next = { ...prev, [key]: value }
      others.forEach(k => {
        next[k] = Math.max(0, Math.round((prev[k] / oldTotal) * remaining))
      })
      // Fix rounding
      const total = next.mixMatch + next.mixTransfer + next.mixAnalysis + next.mixFan
      if (total !== 100) {
        next[others[0]] += 100 - total
      }
      return next
    })
  }, [])

  const saveStrategy = useCallback(() => {
    saveJSON('copilot-strategy', strategy)
    saveJSON('copilot-rules', rules)
    // Also sync daily target to calendar's localStorage
    localStorage.setItem('cal-daily-target', String(strategy.dailyTarget))
    setSaveFlash(true)
    setTimeout(() => setSaveFlash(false), 1500)
  }, [strategy, rules])

  const addRule = useCallback(() => {
    if (!newRuleName.trim()) return
    const rule: AutopilotRule = {
      id: `rule-${Date.now()}`,
      name: newRuleName.trim(),
      teamFilter: newRuleFilter,
      specificTeams: newRuleTeams,
      slots: newRuleSlots,
    }
    setRules(prev => {
      const next = [...prev, rule]
      saveJSON('copilot-rules', next)
      return next
    })
    setNewRuleName('')
    setNewRuleFilter('all')
    setNewRuleTeams('')
    setNewRuleSlots([{ type: 'Preview', timing: '-4h', template: 'Standard preview' }])
    setShowAddRule(false)
  }, [newRuleName, newRuleFilter, newRuleTeams, newRuleSlots])

  const addSlotToNewRule = useCallback(() => {
    setNewRuleSlots(prev => [...prev, { type: 'Recap', timing: '+30min', template: 'Match report' }])
  }, [])

  const removeSlotFromNewRule = useCallback((idx: number) => {
    setNewRuleSlots(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const updateNewRuleSlot = useCallback((idx: number, field: string, value: string) => {
    setNewRuleSlots(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }, [])

  const pendingQueue = queue.filter(q => q.status === 'pending')
  const approvedCount = queue.filter(q => q.status === 'approved').length
  const scheduledCount = (() => {
    try {
      const saved = localStorage.getItem('cal-scheduled')
      return saved ? JSON.parse(saved).length : 0
    } catch { return 0 }
  })()
  const planned = strategy.dailyTarget
  const published = approvedCount + Math.floor(Math.random() * 0.001) // stable
  const inReview = pendingQueue.length
  const drafts = Math.max(0, planned - published - inReview)
  const completed = Math.min(published, planned)

  return (
    <div className="cop">
      {/* ═══ HEADER ═══ */}
      <div className="cop-hd">
        <div>
          <h1>🤖 AI Co-Pilot</h1>
          <p>Your AI-powered editorial brain — configure, queue, and automate content</p>
        </div>
      </div>

      {/* ═══ SECTION 1: MODE SELECTOR ═══ */}
      <div className="cop-modes">
        {([
          { id: 'full-auto' as const, icon: '🤖', name: 'Full Auto', desc: 'AI generates + publishes automatically. No human review needed.' },
          { id: 'hybrid' as const, icon: '🔄', name: 'Hybrid', desc: 'AI generates articles, you review + approve before publishing.' },
          { id: 'manual' as const, icon: '✏️', name: 'Manual', desc: 'You write everything. AI only suggests trending topics.' },
        ]).map(m => (
          <div
            key={m.id}
            className={`cop-mode${mode === m.id ? ' active' : ''}`}
            onClick={() => changeMode(m.id)}
          >
            <div className="cop-mode-icon">{m.icon}</div>
            <div className="cop-mode-name">{m.name}</div>
            <div className="cop-mode-desc">{m.desc}</div>
          </div>
        ))}
      </div>

      {/* ═══ SECTION 2: TODAY'S STATUS ═══ */}
      <div className="cop-sec">📊 Today&apos;s Status</div>
      <div className="cop-stats">
        {([
          { label: 'Planned', val: planned, color: 'var(--elec)', bg: 'var(--elec-l)' },
          { label: 'Published', val: published, color: 'var(--suc)', bg: 'var(--suc-l)' },
          { label: 'In Review', val: inReview, color: 'var(--gold)', bg: 'var(--gold-l)' },
          { label: 'Drafts', val: drafts + scheduledCount, color: 'var(--g400)', bg: 'var(--g100)' },
        ]).map(s => (
          <div key={s.label} className="cop-stat">
            <div className="cop-stat-label">{s.label}</div>
            <div className="cop-stat-val" style={{ color: s.color }}>{s.val}</div>
            <div className="cop-stat-bar">
              <div className="cop-stat-fill" style={{ width: `${Math.min(100, (s.val / Math.max(planned, 1)) * 100)}%`, background: s.color }} />
            </div>
          </div>
        ))}
      </div>

      <div className="cop-progress">
        <div className="cop-prog-text">{completed} of {planned} daily target</div>
        <div className="cop-prog-bar">
          <div className="cop-prog-fill" style={{ width: `${Math.min(100, (completed / Math.max(planned, 1)) * 100)}%` }} />
        </div>
        <div className="cop-prog-text" style={{ color: completed >= planned ? 'var(--suc)' : 'var(--g400)' }}>
          {completed >= planned ? '✅ Complete!' : `${planned - completed} remaining`}
        </div>
      </div>

      {/* ═══ SECTION 3: SMART QUEUE (Hybrid mode) ═══ */}
      {mode === 'hybrid' && (
        <>
          <div className="cop-sec">📋 Smart Queue <span className="cop-sec-sub">{pendingQueue.length} awaiting review</span></div>
          <div className="cop-queue">
            <div className="cop-q-head">
              <div className="cop-q-title">AI-Generated Articles</div>
              {pendingQueue.length > 0 && (
                <button className="cop-q-btn" onClick={approveAll}>✅ Approve All ({pendingQueue.length})</button>
              )}
            </div>

            {queue.map(item => (
              <div key={item.id} className="cop-q-item" style={{ opacity: item.status === 'rejected' ? 0.4 : 1 }}>
                <div className="cop-q-conf" style={{ background: confBg(item.confidence), color: confColor(item.confidence) }}>
                  {item.confidence}%
                </div>
                <div className="cop-q-info">
                  <div className="cop-q-info-title" style={{ textDecoration: item.status === 'rejected' ? 'line-through' : 'none' }}>
                    {item.title}
                  </div>
                  <div className="cop-q-info-meta">
                    <span className="cop-q-cat">{item.category}</span>
                    <span>🕐 {item.suggestedTime}</span>
                    {item.status !== 'pending' && (
                      <span style={{
                        fontWeight: 700, fontSize: 10,
                        color: item.status === 'approved' ? 'var(--suc)' : 'var(--coral)',
                      }}>
                        {item.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                      </span>
                    )}
                  </div>
                </div>
                {item.status === 'pending' && (
                  <div className="cop-q-actions">
                    <button className="cop-q-act approve" title="Approve" onClick={() => approveItem(item.id)}>✅</button>
                    <Link href="/editor" className="cop-q-act" title="Edit" style={{ textDecoration: 'none' }}>✏️</Link>
                    <button className="cop-q-act reject" title="Reject" onClick={() => rejectItem(item.id)}>🗑️</button>
                  </div>
                )}
              </div>
            ))}

            {queue.length === 0 && (
              <div className="cop-q-empty">No articles in queue. AI will generate content based on your strategy settings.</div>
            )}
          </div>
        </>
      )}

      {/* ═══ SECTION 4: CONTENT STRATEGY ═══ */}
      <div className="cop-sec">⚙️ Content Strategy</div>
      <div className="cop-strat">
        <div className="cop-strat-grid">
          {/* Left column */}
          <div>
            {/* Daily target */}
            <div className="cop-field">
              <label className="cop-lbl">Articles per Day</label>
              <div className="cop-slider-row">
                <input
                  type="range" min={1} max={10} value={strategy.dailyTarget}
                  onChange={e => updateStrategy({ dailyTarget: Number(e.target.value) })}
                  className="cop-slider-input"
                />
                <span className="cop-slider-val">{strategy.dailyTarget}</span>
              </div>
            </div>

            {/* Peak times */}
            <div className="cop-field">
              <label className="cop-lbl">Peak Publish Times</label>
              <div className="cop-chips">
                {PEAK_TIME_OPTIONS.map(t => (
                  <button
                    key={t}
                    className={`cop-chip${strategy.peakTimes.includes(t) ? ' sel' : ''}`}
                    onClick={() => togglePeakTime(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Article length */}
            <div className="cop-field">
              <label className="cop-lbl">Default Article Length</label>
              <div className="cop-radios">
                {([
                  { value: 'short' as const, label: 'Short (300w)' },
                  { value: 'medium' as const, label: 'Medium (600w)' },
                  { value: 'long' as const, label: 'Long (1200w)' },
                ]).map(opt => (
                  <button
                    key={opt.value}
                    className={`cop-radio${strategy.articleLength === opt.value ? ' sel' : ''}`}
                    onClick={() => updateStrategy({ articleLength: opt.value })}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div className="cop-field">
              <label className="cop-lbl">Default Tone</label>
              <div className="cop-radios">
                {([
                  { value: 'professional' as const, label: 'Professional' },
                  { value: 'fan' as const, label: 'Fan' },
                  { value: 'casual' as const, label: 'Casual' },
                  { value: 'data-heavy' as const, label: 'Data-Heavy' },
                ]).map(opt => (
                  <button
                    key={opt.value}
                    className={`cop-radio${strategy.tone === opt.value ? ' sel' : ''}`}
                    onClick={() => updateStrategy({ tone: opt.value })}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right column — Content Mix */}
          <div>
            <label className="cop-lbl">Content Mix</label>

            {/* Stacked bar */}
            <div className="cop-mix-bar">
              {([
                { key: 'mixMatch' as const, color: MIX_COLORS[0] },
                { key: 'mixTransfer' as const, color: MIX_COLORS[1] },
                { key: 'mixAnalysis' as const, color: MIX_COLORS[2] },
                { key: 'mixFan' as const, color: MIX_COLORS[3] },
              ]).map(m => (
                <div key={m.key} className="cop-mix-seg" style={{ width: `${strategy[m.key]}%`, background: m.color }}>
                  {strategy[m.key] >= 10 ? `${strategy[m.key]}%` : ''}
                </div>
              ))}
            </div>

            <div className="cop-mix-legend" style={{ marginBottom: 16 }}>
              {MIX_LABELS.map((label, i) => (
                <div key={label} className="cop-mix-leg-item">
                  <div className="cop-mix-dot" style={{ background: MIX_COLORS[i] }} />
                  {label}
                </div>
              ))}
            </div>

            {/* Sliders */}
            {([
              { key: 'mixMatch' as const, label: 'Match Coverage' },
              { key: 'mixTransfer' as const, label: 'Transfer News' },
              { key: 'mixAnalysis' as const, label: 'Analysis' },
              { key: 'mixFan' as const, label: 'Fan Content' },
            ]).map((m, i) => (
              <div key={m.key} className="cop-slider-row">
                <span className="cop-slider-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="cop-mix-dot" style={{ background: MIX_COLORS[i] }} />
                  {m.label}
                </span>
                <input
                  type="range" min={0} max={100} value={strategy[m.key]}
                  onChange={e => updateMix(m.key, Number(e.target.value))}
                  className="cop-slider-input"
                />
                <span className="cop-slider-val">{strategy[m.key]}%</span>
              </div>
            ))}
          </div>
        </div>

        <button className={`cop-save${saveFlash ? ' saved' : ''}`} onClick={saveStrategy}>
          {saveFlash ? '✅ Saved!' : '💾 Save Strategy'}
        </button>
      </div>

      {/* ═══ SECTION 5: FIXTURE AUTOPILOT RULES ═══ */}
      <div className="cop-sec">📐 Fixture Autopilot Rules</div>
      <div className="cop-rules">
        {rules.map(rule => (
          <div key={rule.id} className="cop-rule">
            <div className="cop-rule-name">
              {rule.name}
              <span className="cop-rule-badge" style={{
                background: rule.teamFilter === 'top6' ? 'var(--gold-l)' : 'var(--g100)',
                color: rule.teamFilter === 'top6' ? 'var(--gold)' : 'var(--g500)',
              }}>
                {rule.teamFilter === 'top6' ? 'TOP 6' : rule.teamFilter === 'all' ? 'ALL TEAMS' : 'SPECIFIC'}
              </span>
            </div>
            <div className="cop-rule-desc">
              {rule.slots.length} article{rule.slots.length !== 1 ? 's' : ''} per match
              {rule.teamFilter === 'specific' && rule.specificTeams ? ` · ${rule.specificTeams}` : ''}
            </div>
            <div className="cop-rule-slots">
              {rule.slots.map((slot, si) => (
                <div key={si} className="cop-rule-slot">
                  <span className="cop-rule-slot-type">{slot.type}</span>
                  <span className="cop-rule-slot-time">{slot.timing}</span>
                  <span style={{ flex: 1, fontSize: 10, color: 'var(--g400)', textAlign: 'right' }}>{slot.template}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Rule */}
      {!showAddRule ? (
        <button className="cop-add-rule-btn" onClick={() => setShowAddRule(true)}>+ Add Rule</button>
      ) : (
        <div className="cop-add-rule">
          <div className="cop-sec" style={{ marginBottom: 16 }}>New Autopilot Rule</div>

          <div className="cop-form-row">
            <div>
              <label className="cop-lbl">Rule Name</label>
              <input
                className="cop-input"
                value={newRuleName}
                onChange={e => setNewRuleName(e.target.value)}
                placeholder="e.g. Derby Match"
              />
            </div>
            <div>
              <label className="cop-lbl">Team Filter</label>
              <select
                className="cop-select"
                value={newRuleFilter}
                onChange={e => setNewRuleFilter(e.target.value as 'top6' | 'all' | 'specific')}
              >
                <option value="top6">Top 6 Teams</option>
                <option value="all">All Teams</option>
                <option value="specific">Specific Teams</option>
              </select>
            </div>
          </div>

          {newRuleFilter === 'specific' && (
            <div style={{ marginBottom: 12 }}>
              <label className="cop-lbl">Teams (comma-separated)</label>
              <input
                className="cop-input"
                value={newRuleTeams}
                onChange={e => setNewRuleTeams(e.target.value)}
                placeholder="e.g. Arsenal, Chelsea, Liverpool"
              />
            </div>
          )}

          <label className="cop-lbl">Article Slots</label>
          {newRuleSlots.map((slot, i) => (
            <div key={i} className="cop-slot-row" style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                className="cop-select" style={{ flex: 1, minWidth: 120 }}
                value={slot.type}
                onChange={e => updateNewRuleSlot(i, 'type', e.target.value)}
              >
                {['Preview', 'Starting XI', 'Live Updates', 'Match Recap', 'Player Ratings', 'Analysis', 'Fan Reaction'].map(t =>
                  <option key={t} value={t}>{t}</option>
                )}
              </select>
              <select
                className="cop-select" style={{ width: 120 }}
                value={slot.timing}
                onChange={e => updateNewRuleSlot(i, 'timing', e.target.value)}
              >
                {['-24h', '-12h', '-4h', '-2h', '-1h', '-30min', 'KO', '+15min', '+30min', '+1h', '+2h', '+4h'].map(t =>
                  <option key={t} value={t}>{t}</option>
                )}
              </select>
              <input
                className="cop-input" style={{ flex: 2, minWidth: 150 }}
                value={slot.template}
                onChange={e => updateNewRuleSlot(i, 'template', e.target.value)}
                placeholder="Template description"
              />
              {newRuleSlots.length > 1 && (
                <button
                  onClick={() => removeSlotFromNewRule(i)}
                  style={{ background: 'var(--coral-l)', border: 'none', borderRadius: 'var(--r)', padding: '6px 10px', cursor: 'pointer', fontSize: 12, color: 'var(--coral)', fontWeight: 700 }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="cop-add-rule-btn" onClick={addSlotToNewRule}>+ Add Slot</button>
            <button
              className="cop-save"
              onClick={addRule}
              style={{ opacity: newRuleName.trim() ? 1 : 0.5, cursor: newRuleName.trim() ? 'pointer' : 'not-allowed' }}
            >
              Save Rule
            </button>
            <button
              onClick={() => setShowAddRule(false)}
              style={{ padding: '10px 20px', fontSize: 12, fontWeight: 600, background: 'var(--g100)', border: 'none', borderRadius: 'var(--rm)', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--g500)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ═══ SECTION 6: UPCOMING FIXTURES ═══ */}
      <div className="cop-sec" style={{ marginTop: 28 }}>⚽ Upcoming Fixtures</div>
      <div className="cop-fixtures">
        {fixtures.map(fix => (
          <div key={fix.id} className="cop-fix">
            <div className="cop-fix-row" onClick={() => setExpandedFixture(expandedFixture === fix.id ? null : fix.id)}>
              <span className={`cop-fix-arrow${expandedFixture === fix.id ? ' open' : ''}`}>▶</span>
              <span className="cop-fix-teams">{fix.home} vs {fix.away}</span>
              <span className="cop-fix-league">{fix.league}</span>
              <span className="cop-fix-date">{fix.date} · {fix.time}</span>
              <span className="cop-fix-count">{fix.articles.length} articles</span>
            </div>
            {expandedFixture === fix.id && (
              <div className="cop-fix-detail">
                {fix.articles.map((a, i) => (
                  <div key={i} className="cop-fix-slot">
                    <span className="cop-fix-slot-type">{a.type}</span>
                    <span style={{ flex: 1, fontSize: 10, color: 'var(--g400)' }}>
                      {a.type === 'Preview' ? 'Full preview with stats & predictions' :
                       a.type === 'Starting XI' ? 'Lineup analysis & tactical preview' :
                       a.type === 'Recap' ? 'Full match report with key moments' :
                       'Individual player ratings & analysis'}
                    </span>
                    <span className="cop-fix-slot-time">{a.timing}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
