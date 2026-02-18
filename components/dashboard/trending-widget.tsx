'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Trend {
  title: string
  traffic: string
}

export function TrendingWidget() {
  const [trends, setTrends] = useState<Trend[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/trends?geo=BA')
      .then((r) => r.json() as Promise<{ trends?: Trend[] }>)
      .then((data) => { setTrends(data.trends || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="db-card">
        <div className="db-card-head">
          <span className="db-card-title">📈 Trending Topics</span>
        </div>
        <div style={{ padding: '24px 18px', textAlign: 'center', fontSize: 12, color: 'var(--g400)' }}>
          Loading trends...
        </div>
      </div>
    )
  }

  if (trends.length === 0) return null

  return (
    <div className="db-card">
      <div className="db-card-head">
        <span className="db-card-title">📈 Trending Topics</span>
        <Link href="/editor" className="db-card-action">Write about →</Link>
      </div>
      <div className="db-card-body">
        {trends.slice(0, 5).map((trend, i) => (
          <Link key={i} href="/editor" className="art-item">
            <div className="top-rank" style={{ color: i === 0 ? 'var(--coral)' : i === 1 ? 'var(--gold)' : 'var(--g400)' }}>{i + 1}</div>
            <div className="art-info">
              <div className="art-title">{trend.title}</div>
              <div className="art-meta">
                {trend.traffic && <span>{trend.traffic}</span>}
                <span className="art-badge ai" style={{ background: 'var(--coral-l)', color: 'var(--coral)' }}>TRENDING</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
