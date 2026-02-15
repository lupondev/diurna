import Link from 'next/link'
import { getArticles } from '@/lib/db'

export default async function NewsroomPage() {
  const articles = await getArticles()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Newsroom</h1>
          <p className="text-muted-foreground">{articles.length} article{articles.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/editor"
          className="rounded-lg bg-mint px-4 py-2 text-sm font-medium text-white hover:bg-mint-dark transition-colors"
        >
          + New Article
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['All', 'Draft', 'Published', 'Scheduled', 'In Review'].map((tab) => (
          <button
            key={tab}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              tab === 'All'
                ? 'bg-mint text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {articles.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="text-center py-16">
            <span className="text-5xl">📝</span>
            <h3 className="mt-4 text-lg font-semibold">No articles yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first article with AI or write it manually.
            </p>
            <Link
              href="/editor"
              className="mt-4 inline-block rounded-lg bg-mint px-6 py-2.5 text-sm font-medium text-white hover:bg-mint-dark transition-colors"
            >
              Create First Article
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Title</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Category</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Updated</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {articles.map((article) => (
                <tr key={article.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/editor/${article.id}`} className="group">
                      <p className="text-sm font-medium group-hover:text-mint transition-colors">
                        {article.title}
                        {article.aiGenerated && <span className="ml-1.5" title="AI Generated">🤖</span>}
                      </p>
                      {article.excerpt && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-md">{article.excerpt}</p>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">{article.category?.name || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      article.status === 'PUBLISHED' ? 'bg-green-50 text-green-700'
                      : article.status === 'DRAFT' ? 'bg-gray-100 text-gray-600'
                      : article.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-700'
                      : article.status === 'IN_REVIEW' ? 'bg-yellow-50 text-yellow-700'
                      : 'bg-gray-100 text-gray-500'
                    }`}>
                      {article.status.replace('_', ' ').toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(article.updatedAt).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/editor/${article.id}`} className="text-xs text-mint hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
