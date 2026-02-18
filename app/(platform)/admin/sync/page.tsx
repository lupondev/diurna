'use client'

import { useState } from 'react'

type SyncResult = {
  label: string
  status: 'idle' | 'running' | 'done' | 'error'
  data?: Record<string, unknown>
}

const SYNC_JOBS = [
  { label: 'Sync PL Players', path: '/api/admin/sync-players?league=39&page=1' },
  { label: 'Sync La Liga Players', path: '/api/admin/sync-players?league=140&page=1' },
  { label: 'Sync Serie A Players', path: '/api/admin/sync-players?league=135&page=1' },
  { label: 'Sync Bundesliga Players', path: '/api/admin/sync-players?league=78&page=1' },
  { label: 'Sync Ligue 1 Players', path: '/api/admin/sync-players?league=61&page=1' },
  { label: 'Scrape PL Salaries', path: '/api/admin/scrape-salaries?league=premier-league&offset=0' },
  { label: 'Scrape La Liga Salaries', path: '/api/admin/scrape-salaries?league=la-liga&offset=0' },
]

export default function SyncPage() {
  const [results, setResults] = useState<SyncResult[]>(
    SYNC_JOBS.map(j => ({ label: j.label, status: 'idle' }))
  )
  const [allRunning, setAllRunning] = useState(false)

  async function runJob(index: number) {
    setResults(prev => prev.map((r, i) => i === index ? { ...r, status: 'running' } : r))
    try {
      const res = await fetch(SYNC_JOBS[index].path, { method: 'POST', credentials: 'include' })
      const data = await res.json()
      setResults(prev => prev.map((r, i) => i === index ? { ...r, status: 'done', data } : r))
    } catch {
      setResults(prev => prev.map((r, i) => i === index ? { ...r, status: 'error', data: { error: 'Request failed' } } : r))
    }
  }

  async function runAll() {
    setAllRunning(true)
    for (let i = 0; i < SYNC_JOBS.length; i++) {
      await runJob(i)
      if (i < SYNC_JOBS.length - 1) {
        await new Promise(r => setTimeout(r, 2000))
      }
    }
    setAllRunning(false)
  }

  const statusColor: Record<string, string> = {
    idle: '#94a3b8',
    running: '#f59e0b',
    done: '#22c55e',
    error: '#ef4444',
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Data Sync</h2>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
            API-Football players + Capology salaries
          </p>
        </div>
        <button
          onClick={runAll}
          disabled={allRunning}
          style={{
            background: allRunning ? '#94a3b8' : '#f97316',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '9px 18px',
            fontSize: 12,
            fontWeight: 700,
            cursor: allRunning ? 'not-allowed' : 'pointer',
          }}
        >
          {allRunning ? 'Running...' : 'Sync All'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {results.map((r, i) => (
          <div
            key={r.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              padding: '12px 16px',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: statusColor[r.status],
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', flex: 1 }}>
              {r.label}
            </span>
            {r.data && (
              <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'var(--mono)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {JSON.stringify(r.data)}
              </span>
            )}
            <button
              onClick={() => runJob(i)}
              disabled={r.status === 'running' || allRunning}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                padding: '5px 12px',
                fontSize: 11,
                fontWeight: 600,
                color: '#64748b',
                cursor: r.status === 'running' || allRunning ? 'not-allowed' : 'pointer',
                flexShrink: 0,
              }}
            >
              {r.status === 'running' ? '...' : 'Run'}
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Notes</h3>
        <ul style={{ fontSize: 12, color: '#64748b', margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
          <li>API-Football syncs 10 players per page. Run multiple pages for full roster.</li>
          <li>Capology scraper processes 3 clubs per batch with 3s delays.</li>
          <li>Player name matching between sources is fuzzy — some mismatches expected.</li>
          <li>Daily cron runs at 04:00 UTC (PL page 1 + first 3 PL clubs).</li>
        </ul>
      </div>
    </div>
  )
}
