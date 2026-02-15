export default function NewsroomPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Newsroom</h1>
          <p className="text-muted-foreground">Manage your articles</p>
        </div>
        <button className="rounded-lg bg-mint px-4 py-2 text-sm font-medium text-white hover:bg-mint-dark transition-colors">
          + New Article
        </button>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <p className="text-center text-muted-foreground py-12">
          No articles yet. Click &quot;New Article&quot; to get started.
        </p>
      </div>
    </div>
  )
}
