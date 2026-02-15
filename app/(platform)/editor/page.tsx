export default function EditorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Co-Pilot</h1>
        <p className="text-muted-foreground">Create articles with AI or write manually</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* AI Generation */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🤖</span>
            <h2 className="text-lg font-semibold">AI Generate</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Generate a match report, preview, or transfer news using AI.
          </p>
          <button className="w-full rounded-lg bg-mint px-4 py-3 text-sm font-medium text-white hover:bg-mint-dark transition-colors">
            Start AI Generation
          </button>
        </div>

        {/* Manual Writing */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">✍️</span>
            <h2 className="text-lg font-semibold">Write Manually</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Open the editor and write your article from scratch.
          </p>
          <button className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium hover:bg-gray-50 transition-colors">
            Open Editor
          </button>
        </div>
      </div>
    </div>
  )
}
