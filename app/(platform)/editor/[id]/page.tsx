export default function EditArticlePage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Article</h1>
        <p className="text-muted-foreground">Article ID: {params.id}</p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm min-h-[400px]">
        <p className="text-muted-foreground">Tiptap editor will be mounted here.</p>
      </div>
    </div>
  )
}
