import Link from 'next/link'
import { getDashboardStats, getArticles } from '@/lib/db'
import './dashboard.css'

export default async function DashboardPage() {
  const stats = await getDashboardStats()
  const articles = await getArticles()

  const statCards = [
    { label: 'Page Views', value: '48.2K', change: '↑ 24%', icon: '👁️', iconCls: 'views',
      path: 'M0,35 Q25,28 50,30 T100,20 T150,25 T200,10 V40 H0Z', fill: '#5B5FFF' },
    { label: 'Articles Published', value: String(stats.published), change: '↑ 12%', icon: '📄', iconCls: 'articles',
      path: 'M0,30 Q30,25 60,28 T120,15 T180,20 T200,8 V40 H0Z', fill: '#00D4AA' },
    { label: 'Revenue', value: '$2.8K', change: '↑ 18%', icon: '💰', iconCls: 'revenue',
      path: 'M0,32 Q40,28 80,25 T140,18 T200,12 V40 H0Z', fill: '#FFB800' },
    { label: 'Engagement', value: '6.2%', change: '↑ 8%', icon: '📈', iconCls: 'traffic',
      path: 'M0,28 Q30,32 60,22 T120,18 T180,24 T200,14 V40 H0Z', fill: '#10B981' },
  ]

  const chartData = [
    { day: 'Mon', v: 45, e: 35, vl: '5.2K views', el: '2.1K visitors' },
    { day: 'Tue', v: 62, e: 48, vl: '7.8K views', el: '3.4K visitors' },
    { day: 'Wed', v: 55, e: 42, vl: '6.4K views', el: '2.8K visitors' },
    { day: 'Thu', v: 78, e: 60, vl: '9.1K views', el: '4.2K visitors' },
    { day: 'Fri', v: 90, e: 72, vl: '12.3K views', el: '5.8K visitors' },
    { day: 'Sat', v: 70, e: 55, vl: '8.6K views', el: '3.9K visitors' },
    { day: 'Sun', v: 50, e: 38, vl: '5.8K (live)', el: '2.4K (live)' },
  ]

  const getStatusInfo = (status: string, aiGenerated: boolean) => {
    if (aiGenerated) return { cls: 'ai', icon: '⚽', badge: 'ai', label: '🤖 AI' }
    switch (status) {
      case 'PUBLISHED': return { cls: 'pub', icon: '🏆', badge: 'pub', label: 'Published' }
      case 'SCHEDULED': return { cls: 'sch', icon: '🔄', badge: 'sch', label: 'Scheduled' }
      case 'IN_REVIEW': return { cls: 'sch', icon: '👁️', badge: 'sch', label: 'In Review' }
      default: return { cls: 'dra', icon: '📊', badge: 'dra', label: 'Draft' }
    }
  }

  return (
    <div className="db-page">
      {/* Welcome */}
      <div className="db-welcome">
        <div className="db-welcome-text">
          <h1>Good morning, Harun 👋</h1>
          <p>Your site is performing great this week</p>
        </div>
        <div className="db-period">
          <span className="db-period-btn">Today</span>
          <span className="db-period-btn act">Week</span>
          <span className="db-period-btn">Month</span>
          <span className="db-period-btn">Year</span>
        </div>
      </div>

      {/* Stats */}
      <div className="db-stats">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-top">
              <span className="stat-label">{s.label}</span>
              <div className={`stat-icon ${s.iconCls}`}>{s.icon}</div>
            </div>
            <div className="stat-val">{s.value}</div>
            <span className="stat-change up">{s.change}</span>
            <div className="stat-chart">
              <svg viewBox="0 0 200 40" preserveAspectRatio="none">
                <path d={s.path} fill={s.fill} opacity=".3" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="db-grid">
        {/* Left column */}
        <div className="db-col">

          {/* Traffic Overview */}
          <div className="db-card">
            <div className="db-card-head">
              <span className="db-card-title">📈 Traffic Overview</span>
              <div className="db-chart-legend">
                <span className="db-chart-legend-item">
                  <span className="db-chart-legend-dot" style={{ background: 'var(--mint)' }} />Views
                </span>
                <span className="db-chart-legend-item">
                  <span className="db-chart-legend-dot" style={{ background: 'var(--elec)' }} />Visitors
                </span>
              </div>
            </div>
            <div className="db-chart-wrap">
              <div className="db-chart-bars">
                {chartData.map((d) => (
                  <div key={d.day} className="db-chart-col">
                    <div className="db-chart-bar m" style={{ height: `${d.v}%` }}>
                      <span className="ct">{d.vl}</span>
                    </div>
                    <div className="db-chart-bar e" style={{ height: `${d.e}%` }}>
                      <span className="ct">{d.el}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="db-chart-labels">
                {chartData.map((d) => (
                  <span key={d.day}>{d.day}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Articles */}
          <div className="db-card">
            <div className="db-card-head">
              <span className="db-card-title">📰 Recent Articles</span>
              <Link href="/newsroom" className="db-card-action">View all →</Link>
            </div>
            {articles.length === 0 ? (
              <div className="db-empty">
                <div className="db-empty-icon">📝</div>
                <p className="db-empty-title">No articles yet</p>
                <p className="db-empty-desc">Create your first article with AI or write manually</p>
                <Link href="/editor" className="btn-m" style={{ display: 'inline-flex' }}>✨ Create First Article</Link>
              </div>
            ) : (
              <div className="db-card-body">
                {articles.slice(0, 5).map((article) => {
                  const si = getStatusInfo(article.status as string, article.aiGenerated)
                  return (
                    <Link key={article.id} href={`/editor/${article.id}`} className="art-item">
                      <div className={`art-thumb ${si.cls}`}>{si.icon}</div>
                      <div className="art-info">
                        <div className="art-title">{article.title}</div>
                        <div className="art-meta">
                          <span className={`art-badge ${si.badge}`}>{si.label}</span>
                          <span>{article.category?.name || 'Uncategorized'}</span>
                        </div>
                      </div>
                      <div className="art-stats">
                        <span>{new Date(article.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div className="db-card">
            <div className="db-card-head">
              <span className="db-card-title">⚡ Activity Feed</span>
              <span className="db-card-action">View all →</span>
            </div>
            <div className="db-card-body">
              <div className="act-item">
                <div className="act-dot ai">🤖</div>
                <div>
                  <div className="act-text"><strong>AI Co-Pilot</strong> generated match preview for <strong>Real Madrid vs Barcelona</strong></div>
                  <div className="act-time">15 minutes ago</div>
                </div>
              </div>
              <div className="act-item">
                <div className="act-dot pub">✓</div>
                <div>
                  <div className="act-text"><strong>Bayern vs Arsenal report</strong> published — <strong>5.1K views</strong></div>
                  <div className="act-time">5 hours ago</div>
                </div>
              </div>
              <div className="act-item">
                <div className="act-dot poll">🗳️</div>
                <div>
                  <div className="act-text"><strong>El Clásico poll</strong> received 12.8K votes — Real Madrid leading 45%</div>
                  <div className="act-time">6 hours ago</div>
                </div>
              </div>
              <div className="act-item">
                <div className="act-dot social">📱</div>
                <div>
                  <div className="act-text"><strong>Auto-post</strong> to Twitter — <strong>340 retweets</strong> on Bayern report</div>
                  <div className="act-time">7 hours ago</div>
                </div>
              </div>
              <div className="act-item">
                <div className="act-dot traffic">📈</div>
                <div>
                  <div className="act-text">Traffic spike — <strong>+340%</strong> from Twitter referral</div>
                  <div className="act-time">Yesterday</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="db-col">

          {/* Quick Actions */}
          <div className="db-card">
            <div className="db-card-head">
              <span className="db-card-title">⚡ Quick Actions</span>
            </div>
            <div className="db-quick">
              <Link href="/editor" className="db-quick-btn"><span>✏️</span>Write Article</Link>
              <Link href="/editor" className="db-quick-btn"><span>🤖</span>AI Co-Pilot</Link>
              <Link href="/editor" className="db-quick-btn"><span>🗳️</span>Create Poll</Link>
              <Link href="/editor" className="db-quick-btn"><span>🧠</span>Create Quiz</Link>
            </div>
          </div>

          {/* Live Now */}
          <div className="db-card">
            <div className="db-card-head">
              <span className="db-card-title">⚽ Live Now</span>
              <span className="db-live-badge">LIVE</span>
            </div>
            <div className="db-card-body">
              <div className="db-match">
                <div className="db-match-teams">
                  <div className="db-match-team"><span>🔵</span> Man City</div>
                  <div className="db-match-team"><span>🔴</span> Liverpool</div>
                </div>
                <div className="db-match-score">
                  <div className="db-match-score-val">2 - 1</div>
                  <div className="db-match-min">78&apos;</div>
                </div>
                <Link href="/editor" className="db-match-btn">Cover</Link>
              </div>
              <div className="db-match">
                <div className="db-match-teams">
                  <div className="db-match-team"><span>⚪</span> Real Madrid</div>
                  <div className="db-match-team"><span>🔴🔵</span> Barcelona</div>
                </div>
                <div className="db-match-score">
                  <div className="db-match-time">21:00</div>
                </div>
                <Link href="/editor" className="db-match-btn">Setup AI</Link>
              </div>
              <div className="db-match">
                <div className="db-match-teams">
                  <div className="db-match-team"><span>⚫🔵</span> Inter Milan</div>
                  <div className="db-match-team"><span>⚪⚫</span> Juventus</div>
                </div>
                <div className="db-match-score">
                  <div className="db-match-time">20:45</div>
                </div>
                <Link href="/editor" className="db-match-btn">Setup AI</Link>
              </div>
            </div>
          </div>

          {/* AI Co-Pilot */}
          <div className="db-copilot">
            <div className="db-copilot-head">
              <div className="db-copilot-icon">🤖</div>
              <div>
                <h3>AI Co-Pilot Ready</h3>
                <p>3 matches ready for coverage</p>
              </div>
            </div>
            <div className="db-copilot-match">
              <div>
                <div className="db-copilot-match-name">Real Madrid vs Barcelona</div>
                <div className="db-copilot-match-time">Today 21:00 • El Clásico</div>
              </div>
              <Link href="/editor" className="db-copilot-match-btn">Setup</Link>
            </div>
            <div className="db-copilot-match">
              <div>
                <div className="db-copilot-match-name">Inter vs Juventus</div>
                <div className="db-copilot-match-time">Today 20:45 • Derby d&apos;Italia</div>
              </div>
              <Link href="/editor" className="db-copilot-match-btn">Setup</Link>
            </div>
            <Link href="/editor" className="db-copilot-cta">🚀 Open Content Calendar</Link>
          </div>

          {/* Top Performing */}
          <div className="db-card">
            <div className="db-card-head">
              <span className="db-card-title">🔥 Top Performing</span>
            </div>
            {articles.length === 0 ? (
              <div style={{ padding: '24px 18px', textAlign: 'center', fontSize: 12, color: 'var(--g400)' }}>
                Create articles to see performance data
              </div>
            ) : (
              <div className="db-card-body">
                {articles.slice(0, 3).map((article, i) => {
                  const colors = ['var(--mint-d)', 'var(--elec)', 'var(--gold)']
                  return (
                    <Link key={article.id} href={`/editor/${article.id}`} className="art-item">
                      <div className="top-rank" style={{ color: colors[i] }}>{i + 1}</div>
                      <div className="art-info">
                        <div className="art-title">{article.title}</div>
                        <div className="art-meta">
                          <span>{article.category?.name || 'Uncategorized'}</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
