import Link from 'next/link'
import { getDashboardStats, getArticles } from '@/lib/db'

export default async function DashboardPage() {
  const stats = await getDashboardStats()
  const recentArticles = await getArticles()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your newsroom</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Published', value: stats.published, icon: '📰' },
          { label: 'Drafts', value: stats.drafts, icon: '📝' },
          { label: 'AI Generated', value: stats.aiGenerated, icon: '🤖' },
          { label: 'Team Members', value: stats.teamMembers, icon: '👥' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <span className="text-xl">{stat.icon}</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent articles */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Articles</h2>
          <Link href="/newsroom" className="text-sm text-mint hover:text-mint-dark transition-colors">
            View all →
          </Link>
        </div>

        {recentArticles.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            No articles yet.{' '}
            <Link href="/editor" className="text-mint hover:underline">Create your first one</Link>
          </p>
        ) : (
          <div className="divide-y">
            {recentArticles.slice(0, 5).map((article) => (
              <Link
                key={article.id}
                href={`/editor/${article.id}`}
                className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{article.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {article.category?.name || 'Uncategorized'} · {article.site.name}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    article.status === 'PUBLISHED' ? 'bg-green-50 text-green-700'
                    : article.status === 'DRAFT' ? 'bg-gray-100 text-gray-600'
                    : article.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-700'
                    : 'bg-yellow-50 text-yellow-700'
                  }`}>
                    {article.status.toLowerCase()}
                  </span>
                  {article.aiGenerated && <span className="text-xs" title="AI Generated">🤖</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
