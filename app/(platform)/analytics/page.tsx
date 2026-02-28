'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'
import './analytics.css'

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
] as const

type Period = typeof PERIODS[number]['key']

type DayPoint = { day: string; ai: number; manual: number; total: number }
type TopArticle = {
  id: string; title: string; slug: string; aiGenerated: boolean
  publishedAt: string | null; category: { name: string } | null; site: { slug: string } | null
}
type CategoryStat = { name: string; icon: string; count: number }
type SiteInfo = { id: string; name: string; slug: string; hasGa: boolean }

type StatsData = {
  period: string
  from: string
  hasGa: boolean
  sites: SiteInfo[]
  published: number
  publishedPrev: number
  publishedChange: number
  aiCount: number
  manualCount: number
  totalArticles: number
  drafts: number
  subscribers: number
  topArticles: TopArticle[]
  dailyChart: DayPoint[]
  categoryStats: CategoryStat[]
  autopilot: { dailyTarget: number; isActive: boolean; todayCount: number } | null
}

type WidgetStats = {
  total: number
  byType: { type: string; count: number }[]
  byDevice: { device: string; count: number }[]
}

type AdvancedData = {
  contentQuality: {
    totalArticles: number
    avgWordCount: number
    imageRate: number
    tagRate: number
    excerptRate: number
    wordCountDistribution: { range: string; count: number }[]
  }
  autopilotPerformance: {
    successRate: number
    hourHeatmap: { hour: number; count: number }[]
    dailyTrend: { date: string; count: number; ai: number; manual: number }[]
    topCategories: { name: string; count: number }[]
  }
  entityAnalytics: {
    avgTagsPerArticle: number
    untaggedArticles: number
    topTags: { name: string; slug: string; count: number }[]
  }
  sourcePerformance: {
    totalSources: number
    activeSources: number
    staleSourcesCount: number
    staleSources: { name: string; lastFetch: string }[]
    topClusters: { title: string; dis: number; itemCount: number }[]
  }
  period: string
}

const eventLabels: Record<string, { label: string; icon: string; color: string }> = {
  widget_view: { label: 'Widget Views', icon: '👁️', color: 'var(--elec)' },
  poll_vote: { label: 'Poll Votes', icon: '🗳️', color: 'var(--mint)' },
  quiz_start: { label: 'Quiz Starts', icon: '🧠', color: 'var(--gold)' },
  quiz_complete: { label: 'Quiz Completions', icon: '✅', color: 'var(--suc)' },
  survey_submit: { label: 'Survey Submissions', icon: '📋', color: 'var(--coral)' },
}

function formatDay(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function changeLabel(pct: number): { text: string; dir: 'up' | 'down' | 'flat' } {
  if (pct > 0) return { text: `↑ ${pct}%`, dir: 'up' }
  if (pct < 0) return { text: `↓ ${Math.abs(pct)}%`, dir: 'down' }
  return { text: '→ 0%', dir: 'flat' }
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('week')
  const [stats, setStats] = useState<StatsData | null>(null)
  const [advanced, setAdvanced] = useState<AdvancedData | null>(null)
  const [widgetStats, setWidgetStats] = useState<WidgetStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/analytics/stats?period=${period}`).then(r => r.json() as Promise<StatsData>),
      fetch(`/api/analytics/advanced?period=${period}`).then(r => r.json() as Promise<AdvancedData | { error?: string }>),
    ])
      .then(([statsData, advancedData]) => {
        setStats(statsData)
        setAdvanced((advancedData as AdvancedData)?.contentQuality ? (advancedData as AdvancedData) : null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  useEffect(() => {
    fetch('/api/analytics/events')
      .then(r => r.json() as Promise<WidgetStats>)
      .then(setWidgetStats)
      .catch(() => {})
  }, [])

  const change = stats ? changeLabel(stats.publishedChange) : { text: '—', dir: 'flat' as const }
  const aiPct = stats && (stats.aiCount + stats.manualCount) > 0
    ? Math.round((stats.aiCount / (stats.aiCount + stats.manualCount)) * 100)
    : 0
  const chartMax = stats ? Math.max(...stats.dailyChart.map(d => d.total), 1) : 1

  return (
    <div className="an-page">
      <div className="an-header">
        <div className="an-header-left">
          <h1>Analytics</h1>
          <p>Real-time editorial performance</p>
        </div>
        <div className="an-header-right">
          {stats?.hasGa && <span className="an-ssp">📊 GA4 Connected</span>}
          <div className="an-period">
            {PERIODS.map(p => (
              <button
                key={p.key}
                className={`an-period-btn${period === p.key ? ' act' : ''}`}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="an-loading">
          <div className="an-loading-inner">Loading analytics...</div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="an-stats">
            <div className="an-stat">
              <div className="an-stat-label">✍️ Published</div>
              <div className="an-stat-val">{stats?.published ?? 0}</div>
              <div className={`an-stat-change ${change.dir}`}>{change.text} vs prev period</div>
            </div>
            <div className="an-stat">
              <div className="an-stat-label">🤖 AI Articles</div>
              <div className="an-stat-val">{stats?.aiCount ?? 0}</div>
              <div className="an-stat-change flat">{aiPct}% of published</div>
            </div>
            <div className="an-stat">
              <div className="an-stat-label">✏️ Manual</div>
              <div className="an-stat-val">{stats?.manualCount ?? 0}</div>
              <div className="an-stat-change flat">{100 - aiPct}% of published</div>
            </div>
            <div className="an-stat">
              <div className="an-stat-label">📋 Drafts</div>
              <div className="an-stat-val">{stats?.drafts ?? 0}</div>
              <div className="an-stat-change flat">awaiting publish</div>
            </div>
            <div className="an-stat">
              <div className="an-stat-label">📧 Subscribers</div>
              <div className="an-stat-val">{stats?.subscribers ?? 0}</div>
              <div className="an-stat-change flat">active</div>
            </div>
          </div>

          <div className="an-grid">
            {/* Daily Chart */}
            <div className="an-chart">
              <div className="an-chart-head">
                <div className="an-chart-title">📊 Articles Published — {PERIODS.find(p => p.key === period)?.label}</div>
                <div className="an-chart-legend">
                  <div className="an-legend-item"><div className="an-legend-dot" style={{ background: 'var(--mint)' }} />AI</div>
                  <div className="an-legend-item"><div className="an-legend-dot" style={{ background: 'var(--elec)' }} />Manual</div>
                </div>
              </div>
              {stats?.dailyChart && stats.dailyChart.length > 0 ? (
                <div className="an-bars">
                  {stats.dailyChart.map(d => (
                    <div key={d.day} className="an-bar-col" title={`${formatDay(d.day)}: ${d.total} articles`}>
                      <div className="an-bar views" style={{ height: `${Math.round((d.ai / chartMax) * 100)}%` }} />
                      <div className="an-bar visitors" style={{ height: `${Math.round((d.manual / chartMax) * 100)}%` }} />
                      <div className="an-bar-label">{formatDay(d.day)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--g400)', fontSize: 13 }}>
                  No articles published in this period.
                </div>
              )}
            </div>

            {/* Category Breakdown */}
            <div className="an-chart">
              <div className="an-chart-head">
                <div className="an-chart-title">📂 By Category</div>
              </div>
              {stats?.categoryStats && stats.categoryStats.length > 0 ? (
                stats.categoryStats.slice(0, 6).map(cat => (
                  <div key={cat.name} className="an-source">
                    <div className="an-source-name">{cat.icon} {cat.name}</div>
                    <div className="an-source-track">
                      <div
                        className="an-source-fill"
                        style={{
                          width: `${Math.round((cat.count / (stats.published || 1)) * 100)}%`,
                          background: 'var(--elec)',
                        }}
                      >
                        {cat.count}
                      </div>
                    </div>
                    <div className="an-source-val">{cat.count} articles</div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--g400)', fontSize: 13 }}>
                  No categories set up yet.
                </div>
              )}
            </div>
          </div>

          {/* Top Articles */}
          <div className="an-table">
            <div className="an-table-head">
              <div className="an-table-title">📰 Recent Published Articles</div>
            </div>
            {stats?.topArticles && stats.topArticles.length > 0 ? (
              <>
                <div className="an-row head">
                  <div>Article</div>
                  <div>Category</div>
                  <div>Published</div>
                  <div>Type</div>
                </div>
                {stats.topArticles.map(a => (
                  <div key={a.id} className="an-row">
                    <div className="an-article">{a.title}</div>
                    <div style={{ color: 'var(--g500)', fontSize: 11 }}>{a.category?.name || '—'}</div>
                    <div style={{ color: 'var(--g400)', fontSize: 11, fontFamily: 'monospace' }}>
                      {a.publishedAt ? formatDateTime(a.publishedAt) : '—'}
                    </div>
                    <div>
                      <span className={`an-badge ${a.aiGenerated ? 'ai' : 'manual'}`}>
                        {a.aiGenerated ? '✨ AI' : 'Manual'}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--g400)', fontSize: 13 }}>
                No articles published in this period.
              </div>
            )}
          </div>

          {/* Advanced Analytics — 4 new sections */}
          {advanced && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, marginTop: 24 }}>
              {/* Section 1: Content Quality Score */}
              <div className="an-chart">
                <div className="an-chart-head">
                  <div className="an-chart-title">📊 Content Quality Score</div>
                </div>
                {(() => {
                  const cq = advanced.contentQuality
                  const score = Math.round(
                    (cq.imageRate * 0.3) +
                    (cq.tagRate * 0.3) +
                    (Math.min(cq.avgWordCount / 400, 1) * 100 * 0.3) +
                    (cq.excerptRate * 0.1)
                  )
                  const scoreColor = score > 70 ? '#00D4AA' : score >= 40 ? '#F59E0B' : '#EF4444'
                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
                        <div style={{
                          width: 72, height: 72, borderRadius: '50%',
                          background: `conic-gradient(${scoreColor} ${score * 3.6}deg, var(--g200) 0deg)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--wh)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: scoreColor }}>
                            {score}
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ height: 8, background: 'var(--g100)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                            <div style={{ height: '100%', width: `${score}%`, background: scoreColor, borderRadius: 4, transition: 'width .4s' }} />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 11, color: 'var(--g500)' }}>
                            <span>Avg {cq.avgWordCount} words</span>
                            <span>Image {cq.imageRate}%</span>
                            <span>Tag {cq.tagRate}%</span>
                            <span>Excerpt {cq.excerptRate}%</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: 12 }}>
                        {cq.wordCountDistribution.map(d => (
                          <div key={d.range} className="an-source" style={{ padding: '6px 0' }}>
                            <div className="an-source-name" style={{ width: 70, fontSize: 11 }}>{d.range}</div>
                            <div className="an-source-track">
                              <div className="an-source-fill" style={{
                                width: `${Math.round((d.count / (cq.totalArticles || 1)) * 100)}%`,
                                background: 'var(--elec)',
                              }}>{d.count}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )
                })()}
              </div>

              {/* Section 2: Autopilot Performance */}
              <div className="an-chart">
                <div className="an-chart-head">
                  <div className="an-chart-title">🤖 Autopilot Performance</div>
                </div>
                {(() => {
                  const ap = advanced.autopilotPerformance
                  const sr = ap.successRate
                  const srColor = sr >= 80 ? '#00D4AA' : sr >= 50 ? '#F59E0B' : '#EF4444'
                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                        <div style={{
                          width: 64, height: 64, borderRadius: '50%',
                          background: `conic-gradient(${srColor} ${sr * 3.6}deg, var(--g200) 0deg)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--wh)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: srColor }}>
                            {sr}%
                          </div>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--g500)' }}>AI success rate</span>
                      </div>
                      <div style={{ marginBottom: 12, fontSize: 11, fontWeight: 700, color: 'var(--g600)' }}>Daily trend (7 days)</div>
                      <div className="an-bars" style={{ height: 100 }}>
                        {ap.dailyTrend.map(d => {
                          const max = Math.max(...ap.dailyTrend.map(x => x.count), 1)
                          return (
                            <div key={d.date} className="an-bar-col" title={`${d.date}: ${d.count} (AI: ${d.ai}, Manual: ${d.manual})`}>
                              <div className="an-bar views" style={{ height: `${Math.round((d.ai / max) * 100)}%` }} />
                              <div className="an-bar visitors" style={{ height: `${Math.round((d.manual / max) * 100)}%` }} />
                              <div className="an-bar-label">{formatDay(d.date)}</div>
                            </div>
                          )
                        })}
                      </div>
                      <div style={{ marginTop: 12, fontSize: 11, fontWeight: 700, color: 'var(--g600)' }}>Publishing heatmap (24h)</div>
                      <div style={{ display: 'flex', gap: 2, marginTop: 6 }}>
                        {ap.hourHeatmap.map(h => {
                          const max = Math.max(...ap.hourHeatmap.map(x => x.count), 1)
                          const opacity = 0.2 + (h.count / max) * 0.8
                          return (
                            <div key={h.hour} title={`${h.hour}:00 — ${h.count} articles`} style={{
                              flex: 1, height: 24, background: `rgba(37, 99, 235, ${opacity})`, borderRadius: 2,
                            }} />
                          )
                        })}
                      </div>
                      {ap.topCategories.length > 0 && (
                        <>
                          <div style={{ marginTop: 12, fontSize: 11, fontWeight: 700, color: 'var(--g600)' }}>Top categories (AI)</div>
                          {ap.topCategories.slice(0, 5).map(c => {
                            const catMax = Math.max(...ap.topCategories.map(x => x.count), 1)
                            return (
                              <div key={c.name} className="an-source" style={{ padding: '4px 0' }}>
                                <div className="an-source-name" style={{ width: 100, fontSize: 11 }}>{c.name}</div>
                                <div className="an-source-track">
                                  <div className="an-source-fill" style={{
                                    width: `${Math.round((c.count / catMax) * 100)}%`,
                                    background: 'var(--mint)',
                                  }}>{c.count}</div>
                                </div>
                              </div>
                            )
                          })}
                        </>
                      )}
                    </>
                  )
                })()}
              </div>

              {/* Section 3: Tag & Entity Coverage */}
              <div className="an-chart">
                <div className="an-chart-head">
                  <div className="an-chart-title">🏷️ Tag & Entity Coverage</div>
                </div>
                {(() => {
                  const ea = advanced.entityAnalytics
                  return (
                    <>
                      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--elec)' }}>{ea.avgTagsPerArticle}</div>
                          <div style={{ fontSize: 11, color: 'var(--g500)' }}>Avg tags/article</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: ea.untaggedArticles > 0 ? '#EF4444' : 'var(--g600)' }}>{ea.untaggedArticles}</div>
                          <div style={{ fontSize: 11, color: 'var(--g500)' }}>Untagged</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--g600)', marginBottom: 8 }}>Top tags</div>
                      {ea.topTags.slice(0, 10).map(t => (
                        <div key={t.slug || t.name} className="an-source" style={{ padding: '6px 0' }}>
                          {t.slug ? (
                            <Link href={`/tag/${t.slug}`} className="an-source-name" style={{ width: 120, fontSize: 12, color: 'var(--elec)', textDecoration: 'none' }}>
                              {t.name}
                            </Link>
                          ) : (
                            <span className="an-source-name" style={{ width: 120, fontSize: 12, color: 'var(--g600)' }}>{t.name}</span>
                          )}
                          <div className="an-source-track">
                            <div className="an-source-fill" style={{
                              width: `${ea.topTags[0] ? Math.round((t.count / ea.topTags[0].count) * 100) : 0}%`,
                              background: '#2563EB',
                            }}>{t.count}</div>
                          </div>
                        </div>
                      ))}
                    </>
                  )
                })()}
              </div>

              {/* Section 4: Source Health */}
              <div className="an-chart">
                <div className="an-chart-head">
                  <div className="an-chart-title">📡 Source Health</div>
                </div>
                {(() => {
                  const sp = advanced.sourcePerformance
                  return (
                    <>
                      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--g800)' }}>{sp.activeSources}/{sp.totalSources}</div>
                          <div style={{ fontSize: 11, color: 'var(--g500)' }}>Active sources</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: sp.staleSourcesCount > 0 ? '#EF4444' : 'var(--g600)' }}>{sp.staleSourcesCount}</div>
                          <div style={{ fontSize: 11, color: 'var(--g500)' }}>Stale (24h+)</div>
                        </div>
                      </div>
                      {sp.staleSources.length > 0 && (
                        <>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--g600)', marginBottom: 6 }}>Stale sources</div>
                          <div style={{ marginBottom: 12, fontSize: 11, color: 'var(--g500)' }}>
                            {sp.staleSources.map(s => {
                              const last = s.lastFetch === 'Never' ? null : new Date(s.lastFetch)
                              const ago = last ? Math.round((Date.now() - last.getTime()) / (60 * 60 * 1000)) : null
                              return (
                                <div key={s.name} style={{ padding: '4px 0' }}>
                                  {s.name} — {s.lastFetch === 'Never' ? 'Never' : `${ago}h ago`}
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--g600)', marginBottom: 6 }}>Top story clusters</div>
                      {sp.topClusters.map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--g100)' }}>
                          <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--elec-l)', color: 'var(--elec)' }}>{c.dis}</span>
                          <span style={{ fontSize: 10, color: 'var(--g500)' }}>{c.itemCount} src</span>
                        </div>
                      ))}
                    </>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Autopilot Stats */}
          {stats?.autopilot && (
            <div className="an-table" style={{ marginTop: 16 }}>
              <div className="an-table-head">
                <div className="an-table-title">🤖 AutoPilot — Today</div>
                <span style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700,
                  background: stats.autopilot.isActive ? 'var(--suc-l)' : 'var(--g100)',
                  color: stats.autopilot.isActive ? 'var(--suc)' : 'var(--g400)',
                  border: `1px solid ${stats.autopilot.isActive ? 'var(--suc)' : 'var(--brd)'}`,
                }}>
                  {stats.autopilot.isActive ? 'ACTIVE' : 'PAUSED'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 24, padding: '16px 20px', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--elec)' }}>{stats.autopilot.todayCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--g500)' }}>Generated today</div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--g400)' }}>/</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--g500)' }}>{stats.autopilot.dailyTarget}</div>
                  <div style={{ fontSize: 11, color: 'var(--g500)' }}>Daily target</div>
                </div>
                <div style={{ flex: 1, height: 8, background: 'var(--g100)', borderRadius: 4, overflow: 'hidden', marginLeft: 16 }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, Math.round((stats.autopilot.todayCount / stats.autopilot.dailyTarget) * 100))}%`,
                    background: 'var(--elec)',
                    borderRadius: 4,
                    transition: 'width .4s',
                  }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g500)', minWidth: 40 }}>
                  {Math.min(100, Math.round((stats.autopilot.todayCount / stats.autopilot.dailyTarget) * 100))}%
                </div>
              </div>
            </div>
          )}

          {/* Revenue — GA4 needed */}
          {!stats?.hasGa && (
            <div className="an-table" style={{ marginTop: 16 }}>
              <div className="an-table-head">
                <div className="an-table-title">💰 Revenue & Traffic</div>
              </div>
              <div style={{
                padding: '32px', textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 32 }}>📡</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--g700)' }}>Connect GA4 or Lupon SSP to see revenue</div>
                <div style={{ fontSize: 12, color: 'var(--g400)', maxWidth: 400 }}>
                  Add your Google Analytics 4 Measurement ID in Settings → Integrations to track pageviews, sessions, and ad revenue.
                </div>
                <a
                  href="/settings#integrations"
                  style={{
                    marginTop: 8, padding: '8px 20px',
                    background: 'var(--elec)', color: '#fff',
                    borderRadius: 'var(--rm)', fontWeight: 700, fontSize: 12,
                    textDecoration: 'none',
                  }}
                >
                  ⚙️ Configure in Settings
                </a>
              </div>
            </div>
          )}

          {/* Widget Interactions */}
          <div className="an-widget-section">
            <div className="an-table-head">
              <div className="an-table-title">🧩 Widget Interactions (Last 7 Days)</div>
            </div>
            {widgetStats && widgetStats.total > 0 ? (
              <>
                <div className="an-widget-stats">
                  <div className="an-widget-total">
                    <div className="an-widget-total-val">{widgetStats.total.toLocaleString()}</div>
                    <div className="an-widget-total-label">Total Events</div>
                  </div>
                  {widgetStats.byType.map(e => {
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
                    {widgetStats.byDevice.map(d => (
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
            Data from your Diurna database &middot; Updated in real-time
            {stats?.hasGa && <> &middot; GA4 connected</>}
          </div>
        </>
      )}
    </div>
  )
}
