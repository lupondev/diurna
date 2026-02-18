'use client'

import { useState, useEffect } from 'react'
import './analytics.css'

const periods = ['Today', 'Week', 'Month', 'Year'] as const

const periodData: Record<string, { stats: { val: string; change: string; dir: 'up' | 'down' }[] }> = {
  Today: { stats: [
    { val: '18.4K', change: '↑ 5%', dir: 'up' },
    { val: '4.2K', change: '↑ 3%', dir: 'up' },
    { val: '$412', change: '↑ 8%', dir: 'up' },
    { val: '$4.52', change: '↑ 2%', dir: 'up' },
    { val: '87.1%', change: '↓ 1%', dir: 'down' },
  ]},
  Week: { stats: [
    { val: '142K', change: '↑ 18%', dir: 'up' },
    { val: '38.4K', change: '↑ 12%', dir: 'up' },
    { val: '$2,847', change: '↑ 24%', dir: 'up' },
    { val: '$4.82', change: '↑ 8%', dir: 'up' },
    { val: '89.2%', change: '↑ 3%', dir: 'up' },
  ]},
  Month: { stats: [
    { val: '584K', change: '↑ 22%', dir: 'up' },
    { val: '156K', change: '↑ 15%', dir: 'up' },
    { val: '$11,840', change: '↑ 28%', dir: 'up' },
    { val: '$5.12', change: '↑ 12%', dir: 'up' },
    { val: '91.4%', change: '↑ 5%', dir: 'up' },
  ]},
  Year: { stats: [
    { val: '6.2M', change: '↑ 45%', dir: 'up' },
    { val: '1.8M', change: '↑ 38%', dir: 'up' },
    { val: '$146K', change: '↑ 52%', dir: 'up' },
    { val: '$4.94', change: '↑ 9%', dir: 'up' },
    { val: '88.7%', change: '↑ 4%', dir: 'up' },
  ]},
}

const statLabels = [
  { label: 'Page Views', icon: '👁️' },
  { label: 'Unique Visitors', icon: '👤' },
  { label: 'Revenue', icon: '💰', isRevenue: true },
  { label: 'eCPM', icon: '📊' },
  { label: 'Fill Rate', icon: '🎯' },
]

const trafficData = [
  { day: 'Mon', views: 65, visitors: 35 },
  { day: 'Tue', views: 78, visitors: 42 },
  { day: 'Wed', views: 92, visitors: 55 },
  { day: 'Thu', views: 70, visitors: 38 },
  { day: 'Fri', views: 85, visitors: 48 },
  { day: 'Sat', views: 55, visitors: 30 },
  { day: 'Sun', views: 48, visitors: 25 },
]

const revenueSources = [
  { name: 'Prebid.js', pct: 42, color: 'var(--mint)', val: '$1,196' },
  { name: 'Google MCM', pct: 28, color: 'var(--elec)', val: '$797' },
  { name: 'Criteo', pct: 16, color: 'var(--gold)', val: '$455' },
  { name: 'Magnite', pct: 9, color: 'var(--coral)', val: '$256' },
  { name: 'Other', pct: 5, color: 'var(--g400)', val: '$143' },
]

const topArticles = [
  { title: 'El Clásico Preview: Can Barcelona Stop Vinícius Jr?', views: '24.8K', revenue: '$142', ecpm: '$5.73', type: 'ai' as const },
  { title: 'Bayern Munich 2-1 Arsenal: Saka Misses Penalty', views: '18.2K', revenue: '$98', ecpm: '$5.38', type: 'ai' as const },
  { title: 'Constitutional Court Rules Article 203a Unconstitutional', views: '15.6K', revenue: '$67', ecpm: '$4.29', type: 'manual' as const },
  { title: 'Cigarette Prices to Increase from March 1st', views: '12.1K', revenue: '$52', ecpm: '$4.30', type: 'ai' as const },
  { title: 'Transfer: Džeko Linked with Return to Sarajevo', views: '9.8K', revenue: '$48', ecpm: '$4.90', type: 'manual' as const },
  { title: 'BH Telecom Pink TV — New Rates for All Packages', views: '8.4K', revenue: '$36', ecpm: '$4.29', type: 'ai' as const },
  { title: 'Belgrade Protests Enter Third Week', views: '7.2K', revenue: '$31', ecpm: '$4.31', type: 'manual' as const },
]

type WidgetStats = {
  total: number
  byType: { type: string; count: number }[]
  byDevice: { device: string; count: number }[]
}

const eventLabels: Record<string, { label: string; icon: string; color: string }> = {
  widget_view: { label: 'Widget Views', icon: '👁️', color: 'var(--elec)' },
  poll_vote: { label: 'Poll Votes', icon: '🗳️', color: 'var(--mint)' },
  quiz_start: { label: 'Quiz Starts', icon: '🧠', color: 'var(--gold)' },
  quiz_complete: { label: 'Quiz Completions', icon: '✅', color: 'var(--suc)' },
  survey_submit: { label: 'Survey Submissions', icon: '📋', color: 'var(--coral)' },
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<string>('Week')
  const [widgetStats, setWidgetStats] = useState<WidgetStats | null>(null)
  const currentStats = periodData[period].stats

  useEffect(() => {
    fetch('/api/analytics/events')
      .then((r) => r.json() as Promise<WidgetStats>)
      .then(setWidgetStats)
      .catch(() => {})
  }, [])

  return (
    <div className="an-page">
      <div className="an-header">
        <div className="an-header-left">
          <h1>Analytics</h1>
          <p>Track your publication performance</p>
        </div>
        <div className="an-header-right">
          <span className="an-ssp">📡 Lupon Media SSP</span>
          <div className="an-period">
            {periods.map((p) => (
              <button key={p} className={`an-period-btn${period === p ? ' act' : ''}`} onClick={() => setPeriod(p)}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="an-stats">
        {statLabels.map((s, i) => (
          <div key={s.label} className="an-stat">
            <div className="an-stat-label">{s.icon} {s.label}</div>
            <div className={`an-stat-val${s.isRevenue ? ' revenue' : ''}`}>{currentStats[i].val}</div>
            <div className={`an-stat-change ${currentStats[i].dir}`}>{currentStats[i].change}</div>
          </div>
        ))}
      </div>

      <div className="an-grid">
        <div className="an-chart">
          <div className="an-chart-head">
            <div className="an-chart-title">📊 Traffic Overview</div>
            <div className="an-chart-legend">
              <div className="an-legend-item"><div className="an-legend-dot" style={{ background: 'var(--mint)' }}></div>Views</div>
              <div className="an-legend-item"><div className="an-legend-dot" style={{ background: 'var(--elec)' }}></div>Visitors</div>
            </div>
          </div>
          <div className="an-bars">
            {trafficData.map((d) => (
              <div key={d.day} className="an-bar-col">
                <div className="an-bar views" style={{ height: `${d.views}%` }}></div>
                <div className="an-bar visitors" style={{ height: `${d.visitors}%` }}></div>
                <div className="an-bar-label">{d.day}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="an-chart">
          <div className="an-chart-head">
            <div className="an-chart-title">💰 Revenue by Source</div>
            <span className="an-ssp" style={{ fontSize: 10, padding: '4px 8px' }}>Lupon SSP</span>
          </div>
          {revenueSources.map((s) => (
            <div key={s.name} className="an-source">
              <div className="an-source-name">{s.name}</div>
              <div className="an-source-track">
                <div className="an-source-fill" style={{ width: `${s.pct}%`, background: s.color }}>{s.pct}%</div>
              </div>
              <div className="an-source-val">{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="an-table">
        <div className="an-table-head">
          <div className="an-table-title">📰 Top Performing Articles</div>
        </div>
        <div className="an-row head">
          <div>Article</div>
          <div>Views</div>
          <div>Revenue</div>
          <div>eCPM</div>
          <div>Type</div>
        </div>
        {topArticles.map((a) => (
          <div key={a.title} className="an-row">
            <div className="an-article">{a.title}</div>
            <div>{a.views}</div>
            <div style={{ color: 'var(--suc)', fontWeight: 700 }}>{a.revenue}</div>
            <div>{a.ecpm}</div>
            <div>
              <span className={`an-badge ${a.type}`}>
                {a.type === 'ai' ? '✨ AI' : 'Manual'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="an-widget-section">
        <div className="an-table-head">
          <div className="an-table-title">🧩 Widget Interactions (Last 7 Days)</div>
        </div>
        {widgetStats ? (
          <>
            <div className="an-widget-stats">
              <div className="an-widget-total">
                <div className="an-widget-total-val">{widgetStats.total.toLocaleString()}</div>
                <div className="an-widget-total-label">Total Events</div>
              </div>
              {widgetStats.byType.map((e) => {
                const info = eventLabels[e.type] || { label: e.type, icon: '📊', color: 'var(--g400)' }
                return (
                  <div key={e.type} className="an-widget-event">
                    <div className="an-widget-event-icon">{info.icon}</div>
                    <div className="an-widget-event-info">
                      <div className="an-widget-event-val">{e.count.toLocaleString()}</div>
                      <div className="an-widget-event-label">{info.label}</div>
                    </div>
                    <div className="an-widget-event-bar">
                      <div className="an-widget-event-fill" style={{ width: `${widgetStats.total > 0 ? (e.count / widgetStats.total * 100) : 0}%`, background: info.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
            {widgetStats.byDevice.length > 0 && (
              <div className="an-widget-devices">
                <div className="an-widget-device-label">By Device:</div>
                {widgetStats.byDevice.map((d) => (
                  <span key={d.device} className="an-widget-device-tag">
                    {d.device === 'mobile' ? '📱' : d.device === 'tablet' ? '📟' : '🖥️'} {d.device} ({d.count})
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="an-widget-empty">No widget interaction data yet</div>
        )}
      </div>

      <div className="an-footer">
        Data powered by <strong>Lupon Media SSP</strong> &middot; Updated every 15 minutes
      </div>
    </div>
  )
}
