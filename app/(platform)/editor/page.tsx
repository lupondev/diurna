'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues with Tiptap
const TiptapEditor = dynamic(() => import('@/components/editor/tiptap-editor'), {
  ssr: false,
  loading: () => <div className="rounded-xl border bg-white p-6 shadow-sm min-h-[400px] animate-pulse" />,
})

export default function EditorPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'choose' | 'manual' | 'ai'>('choose')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [siteId, setSiteId] = useState<string | null>(null)
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [categoryId, setCategoryId] = useState('')

  // Fetch default site and categories
  useEffect(() => {
    fetch('/api/site')
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setSiteId(data.id)
          setCategories(data.categories || [])
        }
      })
      .catch(console.error)
  }, [])

  async function handleSave(status: 'DRAFT' | 'PUBLISHED') {
    if (!title.trim() || !siteId) return
    setSaving(true)
    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          siteId,
          categoryId: categoryId || undefined,
          status,
          aiGenerated: false,
        }),
      })
      if (res.ok) {
        router.push('/newsroom')
        router.refresh()
      }
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  if (mode === 'choose') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Co-Pilot</h1>
          <p className="text-muted-foreground">Create articles with AI or write manually</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <button
            onClick={() => setMode('ai')}
            className="rounded-xl border bg-white p-6 shadow-sm text-left hover:border-mint transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🤖</span>
              <h2 className="text-lg font-semibold">AI Generate</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Generate a match report, preview, or transfer news using AI.
            </p>
          </button>

          <button
            onClick={() => setMode('manual')}
            className="rounded-xl border bg-white p-6 shadow-sm text-left hover:border-mint transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">✍️</span>
              <h2 className="text-lg font-semibold">Write Manually</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Open the editor and write your article from scratch.
            </p>
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'ai') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setMode('choose')} className="text-sm text-muted-foreground hover:text-foreground">
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Generate</h1>
            <p className="text-muted-foreground">Coming soon — connect your Anthropic API key</p>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-8 shadow-sm text-center">
          <span className="text-5xl">🤖</span>
          <h3 className="mt-4 text-lg font-semibold">AI Generation Coming Next</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add ANTHROPIC_API_KEY to your .env and we&apos;ll wire up Claude for match reports, transfer news, and more.
          </p>
          <button
            onClick={() => setMode('manual')}
            className="mt-4 rounded-lg bg-mint px-6 py-2.5 text-sm font-medium text-white hover:bg-mint-dark transition-colors"
          >
            Write Manually Instead
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setMode('choose')} className="text-sm text-muted-foreground hover:text-foreground">
            ← Back
          </button>
          <h1 className="text-lg font-bold">New Article</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave('DRAFT')}
            disabled={saving || !title.trim()}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={() => handleSave('PUBLISHED')}
            disabled={saving || !title.trim()}
            className="rounded-lg bg-mint px-4 py-2 text-sm font-medium text-white hover:bg-mint-dark transition-colors disabled:opacity-50"
          >
            Publish
          </button>
        </div>
      </div>

      {/* Title + meta */}
      <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
        <input
          type="text"
          placeholder="Article title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-2xl font-bold placeholder:text-gray-300 focus:outline-none"
        />
        <div className="flex gap-3">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-mint"
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Editor */}
      <TiptapEditor
        onChange={(json) => setContent(json)}
        placeholder="Start writing your article..."
      />
    </div>
  )
}
