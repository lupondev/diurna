'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface DashboardStats {
  totalArticles: number
  publishedArticles: number
  draftArticles: number
  articlesToday: number
  articlesThisWeek: number
  totalClusters: number
  activeClusters: number
  avgDis: number
  topCluster: { title: string; dis: number; trend: string } | null
  totalEntities: number
  topEntities: { name: string; type: string; mentionCount: number }[]
  totalFeeds: number
  activeFeeds: number
  totalNewsItems: number
  itemsToday: number
  categoryStats: { name: string; slug: string; articleCount: number }[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/stats')
      if (res.ok) setStats(await res.json())
    } catch (e) {
      console.error('Failed to load stats', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    const seeded = localStorage.getItem('diurna_categories_seeded')
    if (!seeded) {
      setSeeding(true)
      fetch('/api/setup/seed-categories', { method: 'POST' })
        .then(() => {
          localStorage.setItem('diurna_categories_seeded', '1')
          fetchStats()
        })
        .catch(console.error)
        .finally(() => setSeeding(false))
    }
  }, [fetchStats])

  const trendIcon = (trend: string) => {
    if (trend === 'RISING') return '📈'
    if (trend === 'FALLING') return '📉'
    return '➡️'
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
            {seeding ? 'Seeding categories...' : 'Real-time overview of your newsroom'}
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          style={{
            background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8,
            padding: '8px 16px', fontSize: 12, fontWeight: 600, color: '#475569',
            cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {loading && !stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 120, background: '#f8fafc', borderRadius: 12, animation: 'pulse 2s infinite' }} />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            <StatCard
              icon="📰"
              label="Articles"
              value={stats.totalArticles}
              sub={`${stats.publishedArticles} published · ${stats.draftArticles} drafts`}
              extra={stats.articlesToday > 0 ? `+${stats.articlesToday} today` : undefined}
            />
            <StatCard
              icon="🔥"
              label="Clusters"
              value={stats.totalClusters}
              sub={`${stats.activeClusters} active (24h)`}
              extra={stats.avgDis > 0 ? `avg DIS ${stats.avgDis}` : undefined}
            />
            <StatCard
              icon="📡"
              label="Feeds"
              value={stats.totalFeeds}
              sub={`${stats.activeFeeds} active`}
              extra={`${stats.totalNewsItems.toLocaleString()} items${stats.itemsToday > 0 ? ` · +${stats.itemsToday} today` : ''}`}
            />
            <StatCard
              icon="🏷️"
              label="Entities"
              value={stats.totalEntities}
              sub="Named entities tracked"
            />
          </div>

          {/* Top Story */}
          {stats.topCluster && (
            <Link href="/newsroom" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'linear-gradient(135deg, #0c0f1a 0%, #1e293b 100%)',
                borderRadius: 12, padding: '20px 24px', marginBottom: 24, cursor: 'pointer',
                transition: 'transform .15s', position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: '#f97316', marginBottom: 8, textTransform: 'uppercase' }}>
                  Top Story
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.4, marginBottom: 10 }}>
                  {stats.topCluster.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                  <span style={{ color: '#f97316', fontWeight: 700, fontFamily: 'var(--mono)' }}>DIS {stats.topCluster.dis}</span>
                  <span style={{ color: '#94a3b8' }}>{trendIcon(stats.topCluster.trend)} {stats.topCluster.trend}</span>
                </div>
              </div>
            </Link>
          )}

          {/* Two Column: Top Entities + Categories */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            {/* Top Entities */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '18px 20px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🏷️</span> Top Entities
              </div>
              {stats.topEntities.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.topEntities.map((e, i) => (
                    <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#475569', flexShrink: 0 }}>
                        {i + 1}
                      </span>
                      <span style={{ color: '#1e293b', fontWeight: 500, flex: 1 }}>{e.name}</span>
                      <span style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'var(--mono)' }}>{e.mentionCount} mentions</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#94a3b8', fontSize: 12 }}>No entity data yet. Run the cluster engine to start tracking.</div>
              )}
            </div>

            {/* Categories */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '18px 20px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📂</span> Categories
              </div>
              {stats.categoryStats.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.categoryStats.map((c) => (
                    <Link key={c.slug} href={`/newsroom?section=${c.slug}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#1e293b', fontWeight: 500 }}>{c.name}</span>
                      <span style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'var(--mono)' }}>{c.articleCount} articles</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#94a3b8', fontSize: 12 }}>No categories yet. They will be seeded automatically.</div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⚡</span> Quick Actions
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <QuickAction href="/newsroom" icon="📰" label="Newsroom" />
              <QuickAction href="/editor" icon="✍️" label="New Article" />
              <QuickAction href="/api/cron/fetch-feeds?tier=all" icon="📡" label="Run Feed Engine" external />
              <QuickAction href="/api/cron/cluster-engine" icon="🔥" label="Run Cluster Engine" external />
            </div>
          </div>

          {/* Weekly Activity */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '18px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>This Week</div>
            <div style={{ display: 'flex', gap: 24, fontSize: 12, color: '#64748b' }}>
              <span>{stats.articlesThisWeek} articles created</span>
              <span>{stats.itemsToday} feed items today</span>
              <span>{stats.activeClusters} active clusters</span>
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Failed to load dashboard data.</div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, sub, extra }: { icon: string; label: string; value: number; sub: string; extra?: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
      padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', fontWeight: 600 }}>
        <span>{icon}</span> {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--mono)', lineHeight: 1.2 }}>
        {value.toLocaleString()}
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>{sub}</div>
      {extra && <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>{extra}</div>}
    </div>
  )
}

function QuickAction({ href, icon, label, external }: { href: string; icon: string; label: string; external?: boolean }) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
          padding: '16px', textAlign: 'center', textDecoration: 'none',
          cursor: 'pointer', transition: 'all .15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.background = '#fff7ed' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc' }}
      >
        <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{label}</div>
      </a>
    )
  }
  return (
    <Link
      href={href}
      style={{
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
        padding: '16px', textAlign: 'center', textDecoration: 'none',
        cursor: 'pointer', transition: 'all .15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.background = '#fff7ed' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc' }}
    >
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{label}</div>
    </Link>
  )
}
