export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your newsroom</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Published', value: '0', icon: '📰' },
          { label: 'Drafts', value: '0', icon: '📝' },
          { label: 'AI Generated', value: '0', icon: '🤖' },
          { label: 'Team Members', value: '1', icon: '👥' },
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

      {/* Recent articles placeholder */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Recent Articles</h2>
        <p className="mt-4 text-center text-muted-foreground py-12">
          No articles yet. Create your first one in the Newsroom.
        </p>
      </div>
    </div>
  )
}
