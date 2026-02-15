import Link from 'next/link'
import { getDashboardStats, getArticles } from '@/lib/db'
import './dashboard.css'

export default async function DashboardPage() {
  const stats = await getDashboardStats()
  const articles = await getArticles()

  const statCards = [
    { label: 'Published', value: stats.published, icon: '📄', cls: 'sc--mint',
      path: 'M0,30 Q30,25 60,28 T120,15 T180,20 T200,8 V40 H0Z', fill: '#00D4AA' },
    { label: 'Drafts', value: stats.drafts, icon: '📝', cls: 'sc--elec',
      path: 'M0,35 Q25,28 50,30 T100,20 T150,25 T200,10 V40 H0Z', fill: '#5B5FFF' },
    { label: 'AI Generated', value: stats.aiGenerated, icon: '🤖', cls: 'sc--gold',
      path: 'M0,32 Q40,28 80,25 T140,18 T200,12 V40 H0Z', fill: '#FFB800' },
    { label: 'Team Members', value: stats.teamMembers, icon: '👥', cls: 'sc--suc',
      path: 'M0,28 Q30,32 60,22 T120,18 T180,24 T200,14 V40 H0Z', fill: '#10B981' },
  ]

  return (
    <div className="db-page">
      {/* Welcome */}
      <div className="db-welcome">
        <div className="db-welcome-text">
          <h1>Good morning, Harun 👋</h1>
          <p>Your site is performing great this week</p>
        </div>
        <Link href="/editor" className="db-btn-new">✨ New Article</Link>
      </div>

      {/* Stats */}
      <div className="db-stats">
        {statCards.map((s) => (
          <div key={s.label} className={`sc ${s.cls}`}>
            <div className="sc-top">
              <span className="sc-label">{s.label}</span>
              <div className="sc-icon">{s.icon}</div>
            </div>
            <div className="sc-val">{s.value}</div>
            <div className="sc-chart">
              <svg viewBox="0 0 200 40" preserveAspectRatio="none">
                <path d={s.path} fill={s.fill} opacity="0.3" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="db-grid">
        {/* Left column */}
        <div className="db-col">

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
                <Link href="/editor" className="db-btn-new" style={{ display: 'inline-flex' }}>✨ Create First Article</Link>
              </div>
            ) : (
              <div>
                {articles.slice(0, 5).map((article) => {
                  const st = {
                    PUBLISHED: { bg: '#ECFDF5', color: '#10B981', label: 'Published', thumbBg: '#ECFDF5', icon: '🏆' },
                    DRAFT: { bg: '#F4F4F5', color: '#71717A', label: 'Draft', thumbBg: '#F4F4F5', icon: '📊' },
                    SCHEDULED: { bg: '#FFF9E6', color: '#FFB800', label: 'Scheduled', thumbBg: '#FFF9E6', icon: '🔄' },
                    IN_REVIEW: { bg: '#FFFBEB', color: '#F59E0B', label: 'In Review', thumbBg: '#FFFBEB', icon: '👁️' },
                  }[article.status as string] || { bg: '#F4F4F5', color: '#71717A', label: 'Draft', thumbBg: '#F4F4F5', icon: '📊' }
                  const isAI = article.aiGenerated
                  return (
                    <Link key={article.id} href={`/editor/${article.id}`} className="art-item">
                      <div className="art-thumb" style={{ background: isAI ? 'linear-gradient(135deg, #E6FBF6, #F0F0FF)' : st.thumbBg }}>
                        {isAI ? '⚽' : st.icon}
                      </div>
                      <div className="art-info">
                        <div className="art-title">{article.title}</div>
                        <div className="art-meta">
                          {isAI && <span className="art-badge" style={{ background: '#E6FBF6', color: '#00A888' }}>🤖 AI</span>}
                          <span className="art-badge" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                          <span>{article.category?.name || 'Uncategorized'}</span>
                        </div>
                      </div>
                      <div className="art-date">
                        {new Date(article.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
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
            <div>
              {[
                { icon: '🤖', bg: '#E6FBF6', html: '<b>AI Co-Pilot</b> is ready for content generation', time: 'Just now' },
                { icon: '📰', bg: '#ECFDF5', html: `<b>${articles.length}</b> articles in your newsroom`, time: 'Updated' },
                { icon: '🚀', bg: '#F0F0FF', html: '<b>Diurna</b> platform deployed successfully', time: 'Today' },
                { icon: '👥', bg: '#FFF9E6', html: '<b>Team</b> features coming in Phase 2', time: 'Upcoming' },
              ].map((act, i) => (
                <div key={i} className="act-item">
                  <div className="act-dot" style={{ background: act.bg }}>{act.icon}</div>
                  <div>
                    <div className="act-text" dangerouslySetInnerHTML={{ __html: act.html }} />
                    <div className="act-time">{act.time}</div>
                  </div>
                </div>
              ))}
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
            <div className="qa-grid">
              {[
                { icon: '✏️', label: 'Write Article', href: '/editor' },
                { icon: '🤖', label: 'AI Co-Pilot', href: '/editor' },
                { icon: '📰', label: 'Newsroom', href: '/newsroom' },
                { icon: '⚙️', label: 'Settings', href: '/settings' },
              ].map((q) => (
                <Link key={q.label} href={q.href} className="qa-btn">
                  <span className="qa-icon">{q.icon}</span>{q.label}
                </Link>
              ))}
            </div>
          </div>

          {/* AI Co-Pilot — dark card */}
          <div className="copilot-card">
            <div className="copilot-head">
              <div className="copilot-icon">🤖</div>
              <div>
                <h3>AI Co-Pilot Ready</h3>
                <p>Generate articles with Claude</p>
              </div>
            </div>
            {[
              { label: 'Match Report', desc: 'Post-match analysis' },
              { label: 'Transfer News', desc: 'Breaking transfers' },
              { label: 'Match Preview', desc: 'Pre-match preview' },
            ].map((item) => (
              <div key={item.label} className="copilot-match">
                <div>
                  <div className="copilot-match-name">{item.label}</div>
                  <div className="copilot-match-desc">{item.desc}</div>
                </div>
                <Link href="/editor" className="copilot-match-btn">Generate</Link>
              </div>
            ))}
            <Link href="/editor" className="copilot-cta">🚀 Open AI Co-Pilot</Link>
          </div>

          {/* Top Performing */}
          <div className="db-card">
            <div className="db-card-head">
              <span className="db-card-title">🔥 Top Performing</span>
            </div>
            {articles.length === 0 ? (
              <div style={{ padding: '24px 18px', textAlign: 'center', fontSize: 12, color: '#A1A1AA' }}>
                Create articles to see performance data
              </div>
            ) : (
              <div>
                {articles.slice(0, 3).map((article, i) => {
                  const colors = ['#00A888', '#5B5FFF', '#FFB800']
                  return (
                    <Link key={article.id} href={`/editor/${article.id}`} className="art-item">
                      <div className="top-rank" style={{ color: colors[i] }}>{i + 1}</div>
                      <div className="art-info">
                        <div className="art-title">{article.title}</div>
                        <div className="art-meta"><span>{article.category?.name || 'Uncategorized'}</span></div>
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
