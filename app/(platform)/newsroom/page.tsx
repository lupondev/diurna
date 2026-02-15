import Link from 'next/link'
import { getArticles, getDashboardStats } from '@/lib/db'
import './newsroom.css'

export default async function NewsroomPage() {
  const [articles, stats] = await Promise.all([
    getArticles(),
    getDashboardStats(),
  ])

  const getStatusInfo = (status: string, aiGenerated: boolean) => {
    if (aiGenerated) return { cls: 'ai', icon: '🤖', badge: 'ai', label: 'AI Generated' }
    switch (status) {
      case 'PUBLISHED': return { cls: 'pub', icon: '✓', badge: 'pub', label: 'Published' }
      case 'SCHEDULED': return { cls: 'sch', icon: '⏰', badge: 'sch', label: 'Scheduled' }
      case 'IN_REVIEW': return { cls: 'rev', icon: '👁️', badge: 'rev', label: 'In Review' }
      default: return { cls: 'dra', icon: '📝', badge: 'dra', label: 'Draft' }
    }
  }

  const statCards = [
    { label: 'Total Articles', value: articles.length, icon: '📰', cls: 'all' },
    { label: 'Published', value: stats.published, icon: '✓', cls: 'pub' },
    { label: 'Drafts', value: stats.drafts, icon: '📝', cls: 'dra' },
    { label: 'AI Generated', value: stats.aiGenerated, icon: '🤖', cls: 'ai' },
  ]

  const filters = ['All', 'Published', 'Draft', 'Scheduled', 'In Review']

  return (
    <div className="nr-page">
      {/* Header */}
      <div className="nr-header">
        <div className="nr-header-left">
          <h1>Newsroom</h1>
          <p>{articles.length} article{articles.length !== 1 ? 's' : ''} in your newsroom</p>
        </div>
        <Link href="/editor" className="nr-new-btn">✨ New Article</Link>
      </div>

      {/* Stats */}
      <div className="nr-stats">
        {statCards.map((s) => (
          <div key={s.label} className="nr-stat">
            <div className={`nr-stat-icon ${s.cls}`}>{s.icon}</div>
            <div>
              <div className="nr-stat-val">{s.value}</div>
              <div className="nr-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="nr-filters">
        {filters.map((f, i) => (
          <span key={f} className={`nr-chip${i === 0 ? ' act' : ''}`}>{f}</span>
        ))}
        <input type="text" className="nr-search" placeholder="Search articles..." />
      </div>

      {/* Articles */}
      {articles.length === 0 ? (
        <div className="nr-card">
          <div className="nr-empty">
            <div className="nr-empty-icon">📝</div>
            <p className="nr-empty-title">No articles yet</p>
            <p className="nr-empty-desc">Create your first article with AI or write it manually</p>
            <Link href="/editor" className="nr-new-btn">✨ Create First Article</Link>
          </div>
        </div>
      ) : (
        <div className="nr-card">
          <div className="nr-card-head">
            <span className="nr-card-title">All Articles</span>
            <span className="nr-card-count">{articles.length} items</span>
          </div>
          {articles.map((article) => {
            const si = getStatusInfo(article.status as string, article.aiGenerated)
            return (
              <Link key={article.id} href={`/editor/${article.id}`} className="nr-art">
                <div className={`nr-art-thumb ${si.cls}`}>{si.icon}</div>
                <div className="nr-art-info">
                  <div className="nr-art-title">{article.title}</div>
                  <div className="nr-art-meta">
                    <span className={`nr-art-badge ${si.badge}`}>{si.label}</span>
                    <span className="nr-art-cat">{article.category?.name || 'Uncategorized'}</span>
                    {article.aiGenerated && <span className={`nr-art-badge ai`}>🤖 AI</span>}
                  </div>
                </div>
                <div className="nr-art-right">
                  <span className="nr-art-date">
                    {new Date(article.updatedAt).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </span>
                  <span className="nr-art-edit">Edit →</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
