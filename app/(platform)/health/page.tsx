'use client'

import { useState, useEffect, useCallback } from 'react'

type ServiceCheck = {
  name: string
  status: 'ok' | 'degraded' | 'error'
  responseTime: number
  error?: string
}

type LogEntry = {
  id: string
  level: string
  service: string
  message: string
  meta: Record<string, unknown> | null
  createdAt: string
}

type DashboardData = {
  checks: ServiceCheck[]
  footballQuota: { current: number; limit: number }
  autopilot: {
    today: number
    week: number
    month: number
    successRate: number
    geminiFallbacks: number
    lastRun: string | null
    lastModel: string | null
    lastTitle: string | null
  }
  logs: LogEntry[]
  envVars: Record<string, boolean>
}

const STATUS_DOT: Record<string, string> = {
  ok: '#22c55e',
  degraded: '#eab308',
  error: '#ef4444',
}

const LEVEL_STYLE: Record<string, { bg: string; color: string }> = {
  error: { bg: '#fef2f2', color: '#dc2626' },
  warn: { bg: '#fffbeb', color: '#d97706' },
  info: { bg: '#eff6ff', color: '#2563eb' },
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default function HealthPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionResult, setActionResult] = useState<string | null>(null)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    fetch('/api/health/dashboard')
      .then(r => r.json() as Promise<DashboardData>)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  async function runAction(action: string, label: string) {
    setActionLoading(action)
    setActionResult(null)
    try {
      const res = await fetch('/api/health/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const result = await res.json() as { result?: unknown; error?: string }
      setActionResult(`${label}: ${JSON.stringify(result.result || result.error)}`)
      fetchData()
    } catch (e) {
      setActionResult(`${label} failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
    setActionLoading(null)
  }

  if (loading && !data) {
    return (
      <div style={s.container}>
        <h1 style={s.h1}>System Health</h1>
        <div style={s.loadingBox}>Loading health data...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={s.container}>
        <h1 style={s.h1}>System Health</h1>
        <div style={s.errorBox}>Failed to load health data</div>
      </div>
    )
  }

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={s.h1}>System Health</h1>
        <button onClick={fetchData} style={s.refreshBtn} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* SECTION 1: Service Status */}
      <section style={s.section}>
        <h2 style={s.h2}>Service Status</h2>
        <div style={s.grid}>
          {data.checks.map((check) => (
            <div key={check.name} style={s.card}>
              <div style={s.cardHeader}>
                <span style={{ ...s.dot, background: STATUS_DOT[check.status] }} />
                <span style={s.cardTitle}>{check.name}</span>
                <span style={badgeStyle(check.status)}>
                  {check.status.toUpperCase()}
                </span>
              </div>
              <div style={s.cardMeta}>
                {check.responseTime}ms
                {check.error && <span style={{ color: '#ef4444', marginLeft: 8 }}>{check.error}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2: Autopilot Stats */}
      <section style={s.section}>
        <h2 style={s.h2}>Autopilot Stats</h2>
        <div style={s.grid}>
          <div style={s.statCard}>
            <div style={s.statValue}>{data.autopilot.today}</div>
            <div style={s.statLabel}>Articles Today</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statValue}>{data.autopilot.week}</div>
            <div style={s.statLabel}>This Week</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statValue}>{data.autopilot.month}</div>
            <div style={s.statLabel}>This Month</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statValue}>{data.autopilot.successRate}%</div>
            <div style={s.statLabel}>Publish Rate</div>
          </div>
        </div>
        <div style={s.metaRow}>
          <span>Last model: <b>{data.autopilot.lastModel || 'N/A'}</b></span>
          <span>Gemini fallbacks today: <b>{data.autopilot.geminiFallbacks}</b></span>
          <span>Last run: <b>{data.autopilot.lastRun ? timeAgo(data.autopilot.lastRun) : 'Never'}</b></span>
        </div>
        {data.autopilot.lastTitle && (
          <div style={s.lastArticle}>
            Last article: {data.autopilot.lastTitle}
          </div>
        )}
      </section>

      {/* SECTION 3: API Usage */}
      <section style={s.section}>
        <h2 style={s.h2}>API Usage</h2>
        <div style={s.card}>
          <div style={s.cardHeader}>
            <span style={s.cardTitle}>API-Football Quota</span>
            <span style={s.quotaText}>
              {data.footballQuota.current} / {data.footballQuota.limit} requests today
            </span>
          </div>
          <div style={s.progressBar}>
            <div
              style={{
                ...s.progressFill,
                width: `${Math.min(100, (data.footballQuota.current / data.footballQuota.limit) * 100)}%`,
                background: data.footballQuota.current / data.footballQuota.limit > 0.8 ? '#ef4444' : '#22c55e',
              }}
            />
          </div>
        </div>

        <div style={{ ...s.card, marginTop: 12 }}>
          <div style={s.cardHeader}>
            <span style={s.cardTitle}>Environment Variables</span>
          </div>
          <div style={s.envGrid}>
            {Object.entries(data.envVars).map(([key, set]) => (
              <div key={key} style={s.envItem}>
                <span style={{ ...s.dot, background: set ? '#22c55e' : '#ef4444', width: 8, height: 8 }} />
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono, monospace)', color: set ? 'var(--g700, #374151)' : '#ef4444' }}>
                  {key}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: Quick Actions */}
      <section style={s.section}>
        <h2 style={s.h2}>Quick Actions</h2>
        <div style={s.actionsRow}>
          {[
            { action: 'run-autopilot', label: 'Run Autopilot Now', icon: '▶' },
            { action: 'backfill-images', label: 'Backfill Images', icon: '🖼' },
            { action: 'clear-duplicates', label: 'Clear Duplicates', icon: '🧹' },
            { action: 'purge-logs', label: 'Purge Old Logs', icon: '🗑' },
          ].map(({ action, label, icon }) => (
            <button
              key={action}
              onClick={() => runAction(action, label)}
              disabled={actionLoading !== null}
              style={s.actionBtn}
            >
              <span>{icon}</span>
              {actionLoading === action ? 'Running...' : label}
            </button>
          ))}
        </div>
        {actionResult && (
          <div style={s.actionResult}>{actionResult}</div>
        )}
      </section>

      {/* SECTION 5: Recent Logs */}
      <section style={s.section}>
        <h2 style={s.h2}>Recent Logs ({data.logs.length})</h2>
        <div style={s.logsTable}>
          {data.logs.length === 0 ? (
            <div style={s.emptyLogs}>No logs yet</div>
          ) : (
            data.logs.map((log) => (
              <div
                key={log.id}
                style={s.logRow}
                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
              >
                <div style={s.logMain}>
                  <span style={s.logTime}>{timeAgo(log.createdAt)}</span>
                  <span style={{
                    ...s.levelBadge,
                    background: LEVEL_STYLE[log.level]?.bg || '#f3f4f6',
                    color: LEVEL_STYLE[log.level]?.color || '#374151',
                  }}>
                    {log.level.toUpperCase()}
                  </span>
                  <span style={s.logService}>{log.service}</span>
                  <span style={s.logMessage}>{log.message}</span>
                </div>
                {expandedLog === log.id && log.meta && (
                  <pre style={s.logMeta}>
                    {JSON.stringify(log.meta, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

/* ── Inline styles ── */

function badgeStyle(status: string): React.CSSProperties {
  return {
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 10,
    background: status === 'ok' ? '#dcfce7' : status === 'degraded' ? '#fef9c3' : '#fee2e2',
    color: status === 'ok' ? '#166534' : status === 'degraded' ? '#854d0e' : '#991b1b',
  }
}

const s = {
  container: { maxWidth: 960, margin: '0 auto', padding: '24px 20px' } as React.CSSProperties,
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 } as React.CSSProperties,
  h1: { fontSize: 24, fontWeight: 700, color: 'var(--g900, #111)', margin: 0 } as React.CSSProperties,
  h2: { fontSize: 16, fontWeight: 600, color: 'var(--g800, #1f2937)', margin: '0 0 12px' } as React.CSSProperties,
  section: { marginBottom: 32, padding: 20, background: 'var(--g50, #f9fafb)', borderRadius: 12, border: '1px solid var(--g200, #e5e7eb)' } as React.CSSProperties,
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 } as React.CSSProperties,
  card: { background: 'white', borderRadius: 8, padding: 16, border: '1px solid var(--g200, #e5e7eb)' } as React.CSSProperties,
  cardHeader: { display: 'flex', alignItems: 'center', gap: 8 } as React.CSSProperties,
  cardTitle: { fontWeight: 600, fontSize: 14, color: 'var(--g800, #1f2937)', flex: 1 } as React.CSSProperties,
  cardMeta: { fontSize: 12, color: 'var(--g500, #6b7280)', marginTop: 6, fontFamily: 'var(--font-mono, monospace)' } as React.CSSProperties,
  dot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 } as React.CSSProperties,
  statCard: { background: 'white', borderRadius: 8, padding: 20, border: '1px solid var(--g200, #e5e7eb)', textAlign: 'center' as const } as React.CSSProperties,
  statValue: { fontSize: 32, fontWeight: 700, color: 'var(--g900, #111)', fontFamily: 'var(--font-mono, monospace)' } as React.CSSProperties,
  statLabel: { fontSize: 12, color: 'var(--g500, #6b7280)', marginTop: 4 } as React.CSSProperties,
  metaRow: { display: 'flex', gap: 24, flexWrap: 'wrap' as const, fontSize: 13, color: 'var(--g600, #4b5563)', marginTop: 12 } as React.CSSProperties,
  lastArticle: { fontSize: 12, color: 'var(--g500, #6b7280)', marginTop: 8, fontStyle: 'italic' as const } as React.CSSProperties,
  quotaText: { fontSize: 13, fontFamily: 'var(--font-mono, monospace)', color: 'var(--g600, #4b5563)' } as React.CSSProperties,
  progressBar: { height: 8, background: 'var(--g200, #e5e7eb)', borderRadius: 4, marginTop: 10, overflow: 'hidden' as const } as React.CSSProperties,
  progressFill: { height: '100%', borderRadius: 4, transition: 'width 0.3s' } as React.CSSProperties,
  envGrid: { display: 'flex', flexWrap: 'wrap' as const, gap: 12, marginTop: 10 } as React.CSSProperties,
  envItem: { display: 'flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
  actionsRow: { display: 'flex', gap: 10, flexWrap: 'wrap' as const } as React.CSSProperties,
  actionBtn: { padding: '10px 16px', fontSize: 13, fontWeight: 600, background: 'white', border: '1px solid var(--g300, #d1d5db)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', color: 'var(--g700, #374151)' } as React.CSSProperties,
  actionResult: { marginTop: 12, padding: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12, fontFamily: 'var(--font-mono, monospace)', color: '#166534', wordBreak: 'break-all' as const } as React.CSSProperties,
  refreshBtn: { padding: '6px 14px', fontSize: 12, fontWeight: 600, background: 'var(--g100, #f3f4f6)', border: '1px solid var(--g300, #d1d5db)', borderRadius: 6, cursor: 'pointer', color: 'var(--g700, #374151)' } as React.CSSProperties,
  loadingBox: { padding: 40, textAlign: 'center' as const, color: 'var(--g500, #6b7280)', fontSize: 14 } as React.CSSProperties,
  errorBox: { padding: 40, textAlign: 'center' as const, color: '#ef4444', fontSize: 14 } as React.CSSProperties,
  logsTable: { maxHeight: 500, overflowY: 'auto' as const } as React.CSSProperties,
  logRow: { padding: '10px 12px', borderBottom: '1px solid var(--g200, #e5e7eb)', cursor: 'pointer', transition: 'background 0.1s' } as React.CSSProperties,
  logMain: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const } as React.CSSProperties,
  logTime: { fontSize: 11, color: 'var(--g400, #9ca3af)', fontFamily: 'var(--font-mono, monospace)', minWidth: 60 } as React.CSSProperties,
  levelBadge: { fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em' } as React.CSSProperties,
  logService: { fontSize: 11, fontWeight: 600, color: 'var(--g600, #4b5563)', background: 'var(--g100, #f3f4f6)', padding: '2px 6px', borderRadius: 4 } as React.CSSProperties,
  logMessage: { fontSize: 12, color: 'var(--g700, #374151)', flex: 1, minWidth: 0 } as React.CSSProperties,
  logMeta: { marginTop: 8, padding: 10, background: 'var(--g100, #f3f4f6)', borderRadius: 6, fontSize: 11, fontFamily: 'var(--font-mono, monospace)', color: 'var(--g600, #4b5563)', overflow: 'auto' as const, maxHeight: 200, whiteSpace: 'pre-wrap' as const } as React.CSSProperties,
  emptyLogs: { padding: 24, textAlign: 'center' as const, color: 'var(--g400, #9ca3af)', fontSize: 13 } as React.CSSProperties,
}
