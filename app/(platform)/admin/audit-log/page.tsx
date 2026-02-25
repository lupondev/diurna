'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDateTime } from '@/lib/utils'

type LogEntry = {
  id: string
  action: string
  target: string | null
  detail: string | null
  userName: string | null
  createdAt: string
}

const ACTION_ICONS: Record<string, { icon: string; bg: string }> = {
  'user.joined': { icon: '\u{1F44B}', bg: 'var(--mint-l)' },
  'user.role_changed': { icon: '\u{1F504}', bg: 'var(--elec-l)' },
  'user.removed': { icon: '\u{1F6AB}', bg: 'var(--coral-l)' },
  'invite.created': { icon: '\u2709\uFE0F', bg: 'var(--gold-l)' },
  'invite.accepted': { icon: '\u2705', bg: 'var(--suc-l)' },
  'article.published': { icon: '\u{1F4F0}', bg: 'var(--mint-l)' },
  'article.created': { icon: '\u{1F4DD}', bg: 'var(--g100)' },
  'article.deleted': { icon: '\u{1F5D1}\uFE0F', bg: 'var(--coral-l)' },
  'settings.updated': { icon: '\u2699\uFE0F', bg: 'var(--g100)' },
}

function getIcon(action: string) {
  return ACTION_ICONS[action] || { icon: '\u{1F4CB}', bg: 'var(--g100)' }
}

function formatAction(entry: LogEntry): string {
  const parts = entry.action.split('.')
  const verb = parts[1]?.replace(/_/g, ' ') || entry.action
  if (entry.target) return `${verb} — ${entry.target}`
  return verb
}

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/audit-log')
      if (res.ok) setLogs(await res.json() as LogEntry[])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--g900)' }}>Activity Log</div>
        <div style={{ fontSize: 12, color: 'var(--g500)' }}>Track all activities and changes in your team</div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--g400)' }}>Loading activities...</div>
      ) : logs.length === 0 ? (
        <div className="adm-card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>{'\u{1F4CB}'}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--g900)', marginBottom: 4 }}>No activities</div>
          <div style={{ fontSize: 12, color: 'var(--g400)' }}>Actions will appear here as your team uses the platform</div>
        </div>
      ) : (
        <div className="adm-card" style={{ padding: '8px 24px' }}>
          {logs.map((entry) => {
            const { icon, bg } = getIcon(entry.action)
            return (
              <div className="adm-log-item" key={entry.id}>
                <div className="adm-log-icon" style={{ background: bg }}>{icon}</div>
                <div style={{ flex: 1 }}>
                  <div className="adm-log-text">
                    <strong>{entry.userName || 'System'}</strong>{' '}
                    {formatAction(entry)}
                  </div>
                  {entry.detail && (
                    <div style={{ fontSize: 11, color: 'var(--g400)', marginTop: 2 }}>{entry.detail}</div>
                  )}
                  <div className="adm-log-time">
                    {formatDateTime(entry.createdAt)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
