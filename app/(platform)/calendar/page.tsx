'use client'

import { useState } from 'react'
import './calendar.css'

type Slot = {
  time: string
  title: string
  variant: string
  tags: { label: string; cls: string }[]
  status: string
}

const weekData: { day: string; date: number; today?: boolean; slots: Slot[] }[] = [
  { day: 'Mon', date: 10, slots: [
    { time: '08:00', title: 'Daily Briefing: Week 24 Preview', variant: 'prematch', tags: [{ label: 'AI', cls: 'ai' }], status: 'published' },
    { time: '10:30', title: 'Transfer Roundup: January Window Analysis', variant: 'transfer', tags: [{ label: 'AI', cls: 'ai' }], status: 'published' },
    { time: '14:00', title: 'Man City vs Liverpool: Pre-Match Preview', variant: 'prematch', tags: [{ label: 'FIXTURE', cls: 'fixture' }, { label: 'AI', cls: 'ai' }], status: 'published' },
    { time: '17:30', title: 'LIVE: Man City 2-1 Liverpool — Updates', variant: 'live', tags: [{ label: 'LIVE', cls: 'live' }], status: 'published' },
    { time: '20:00', title: 'Man City 2-1 Liverpool: Ratings & Analysis', variant: 'postmatch', tags: [{ label: 'FIXTURE', cls: 'fixture' }, { label: 'AI', cls: 'ai' }], status: 'published' },
  ]},
  { day: 'Tue', date: 11, slots: [
    { time: '08:00', title: 'Morning Briefing + UCL Preview', variant: 'prematch', tags: [{ label: 'AI', cls: 'ai' }], status: 'published' },
    { time: '12:00', title: 'PL Title Race: Statistical Deep Dive', variant: 'analysis', tags: [{ label: 'AI', cls: 'ai' }], status: 'published' },
    { time: '16:00', title: 'Bayern vs Arsenal: UCL QF Preview', variant: 'prematch', tags: [{ label: 'FIXTURE', cls: 'fixture' }, { label: 'AI', cls: 'ai' }], status: 'published' },
    { time: '23:00', title: 'Bayern 2-1 Arsenal: Match Report', variant: 'postmatch', tags: [{ label: 'FIXTURE', cls: 'fixture' }, { label: 'AI', cls: 'ai' }], status: 'published' },
  ]},
  { day: 'Wed', date: 12, slots: [
    { time: '08:00', title: 'Morning Briefing: UCL Night 2', variant: 'prematch', tags: [{ label: 'AI', cls: 'ai' }], status: 'published' },
    { time: '11:00', title: 'Mbapp\u00e9: Real Madrid Deal Close', variant: 'transfer', tags: [{ label: 'MANUAL', cls: 'manual' }], status: 'published' },
    { time: '15:00', title: 'Real Madrid vs PSG: UCL QF Preview', variant: 'prematch', tags: [{ label: 'FIXTURE', cls: 'fixture' }, { label: 'AI', cls: 'ai' }], status: 'published' },
    { time: '18:00', title: 'Top 10 UCL Goals This Season', variant: 'analysis', tags: [{ label: 'AI', cls: 'ai' }], status: 'published' },
    { time: '23:30', title: 'Real Madrid 3-2 PSG: Epic Night!', variant: 'postmatch', tags: [{ label: 'FIXTURE', cls: 'fixture' }, { label: 'AI', cls: 'ai' }], status: 'published' },
  ]},
  { day: 'Thu', date: 13, slots: [
    { time: '08:00', title: 'Daily Briefing + UCL Recap', variant: 'prematch', tags: [{ label: 'AI', cls: 'ai' }], status: 'published' },
    { time: '12:00', title: 'UCL QF: Who Goes Through? Predictions', variant: 'analysis', tags: [{ label: 'AI', cls: 'ai' }], status: 'published' },
    { time: '15:00', title: 'Transfer Targets: Summer Window Preview', variant: 'transfer', tags: [{ label: 'AI', cls: 'ai' }], status: 'published' },
    { time: '18:00', title: 'Lamine Yamal: Statistical Breakdown', variant: 'analysis', tags: [{ label: 'AI', cls: 'ai' }], status: 'published' },
  ]},
  { day: 'Fri', date: 14, slots: [
    { time: '08:00', title: 'Friday Briefing: Weekend Preview', variant: 'prematch', tags: [{ label: 'AI', cls: 'ai' }], status: 'published' },
    { time: '14:00', title: 'Premier League GW24: All Match Previews', variant: 'prematch', tags: [{ label: 'AI', cls: 'ai' }], status: 'published' },
    { time: '18:00', title: 'Serie A Round 24: Preview & Predictions', variant: 'prematch', tags: [{ label: 'AI', cls: 'ai' }], status: 'published' },
  ]},
  { day: 'Sat', date: 15, today: true, slots: [
    { time: '08:00', title: 'Matchday Briefing: 8 Games Today', variant: 'prematch', tags: [{ label: 'AI', cls: 'ai' }], status: 'published' },
    { time: '12:00', title: 'El Cl\u00e1sico Preview: Vin\u00edcius Jr Factor', variant: 'prematch', tags: [{ label: 'FIXTURE', cls: 'fixture' }, { label: 'AI', cls: 'ai' }], status: 'published' },
    { time: '15:00', title: 'PL 3pm Kickoffs: Live Coverage Plan', variant: 'prematch', tags: [{ label: 'AI', cls: 'ai' }], status: 'scheduled' },
    { time: '18:00', title: 'PL Results Roundup — generating after FT', variant: 'ai-gen', tags: [{ label: 'AI AUTO', cls: 'ai' }], status: 'generating' },
    { time: '20:30', title: 'El Cl\u00e1sico Live Updates — auto on KO', variant: 'ai-gen', tags: [{ label: 'LIVE', cls: 'live' }, { label: 'AI AUTO', cls: 'ai' }], status: 'generating' },
    { time: '23:00', title: 'El Cl\u00e1sico Post-Match — auto after FT', variant: 'ai-gen', tags: [{ label: 'FIXTURE', cls: 'fixture' }, { label: 'AI AUTO', cls: 'ai' }], status: 'draft' },
  ]},
  { day: 'Sun', date: 16, slots: [
    { time: '08:00', title: 'Sunday Briefing — auto-generate', variant: 'ai-gen', tags: [{ label: 'AI AUTO', cls: 'ai' }], status: 'draft' },
    { time: '12:00', title: 'Weekend Results Roundup', variant: 'ai-gen', tags: [{ label: 'AI AUTO', cls: 'ai' }], status: 'draft' },
    { time: '15:00', title: 'La Liga Round 28: All Match Previews', variant: 'ai-gen', tags: [{ label: 'FIXTURE', cls: 'fixture' }, { label: 'AI AUTO', cls: 'ai' }], status: 'draft' },
    { time: '18:00', title: 'Week Ahead: GW25 Preview', variant: 'ai-gen', tags: [{ label: 'AI AUTO', cls: 'ai' }], status: 'draft' },
  ]},
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

const strategies = [
  { icon: '📰', name: 'Daily Output', desc: 'Articles per day target', val: '5 articles/day' },
  { icon: '⚽', name: 'Match Coverage', desc: 'Auto pre + post match', val: 'Pre · Live · Post' },
  { icon: '🎯', name: 'Focus Leagues', desc: 'Priority competitions', val: 'PL · La Liga · UCL' },
  { icon: '🕐', name: 'Peak Times', desc: 'Optimal publish windows', val: '08:00 · 12:00 · 18:00' },
  { icon: '🔄', name: 'Autopilot Mode', desc: 'Human review or full auto', val: 'Full Auto ⚡' },
]

export default function CalendarPage() {
  const [activeStrat, setActiveStrat] = useState(0)
  const [activeView, setActiveView] = useState('Week')

  return (
    <div className="cal-page">
      {/* Header */}
      <div className="cal-header">
        <div className="cal-header-left">
          <h1>Content Calendar</h1>
          <p>Plan and schedule your content pipeline</p>
        </div>
        <button className="cal-schedule-btn">✨ Schedule Article</button>
      </div>

      {/* Autopilot Bar */}
      <div className="cal-autopilot">
        <div className="cal-ap-dot"></div>
        <div className="cal-ap-text">
          <div className="cal-ap-title">🚀 Autopilot Active <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--g500)', marginLeft: 4 }}>since Feb 10</span></div>
          <div className="cal-ap-sub">AI is generating 5 articles/day &middot; Next: El Cl&aacute;sico pre-match in 2h 14m</div>
        </div>
        <div className="cal-ap-stats">
          <div className="cal-ap-stat"><div className="cal-ap-stat-val">34</div><div className="cal-ap-stat-label">This Week</div></div>
          <div className="cal-ap-stat"><div className="cal-ap-stat-val">92%</div><div className="cal-ap-stat-label">On Time</div></div>
          <div className="cal-ap-stat"><div className="cal-ap-stat-val">284K</div><div className="cal-ap-stat-label">Reach</div></div>
        </div>
      </div>

      {/* Strategy Cards */}
      <div className="cal-strategy">
        {strategies.map((s, i) => (
          <div key={s.name} className={`cal-strat${activeStrat === i ? ' active' : ''}`} onClick={() => setActiveStrat(i)}>
            <div className="cal-strat-icon">{s.icon}</div>
            <div className="cal-strat-name">{s.name}</div>
            <div className="cal-strat-desc">{s.desc}</div>
            <div className="cal-strat-val">{s.val}</div>
          </div>
        ))}
      </div>

      {/* Calendar Nav */}
      <div className="cal-nav">
        <button className="cal-nav-btn">&laquo;</button>
        <button className="cal-nav-btn">&raquo;</button>
        <div className="cal-period">Feb 10 — 16, 2026</div>
        <button className="cal-today-btn">Today</button>
        <div className="cal-views">
          {['Week', 'Month', 'List'].map((v) => (
            <button key={v} className={`cal-view-btn${activeView === v ? ' act' : ''}`} onClick={() => setActiveView(v)}>{v}</button>
          ))}
        </div>
      </div>

      {/* Week Grid */}
      <div className="cal-week">
        {weekData.map((d) => (
          <div key={d.day} className={`cal-day${d.today ? ' today' : ''}`}>
            <div className="cal-day-head">
              <span className="cal-day-name">{d.day}</span>
              <span className="cal-day-date">{d.date}</span>
              <span className="cal-day-count">{d.slots.length}</span>
            </div>
            <div className="cal-day-body">
              {d.slots.map((slot, si) => (
                <div key={si} className={`cal-slot ${slot.variant}`}>
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
              {d.day === 'Sun' && (
                <button className="cal-day-add">+ Add Slot</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Panel */}
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
    </div>
  )
}
