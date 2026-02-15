'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const TiptapEditor = dynamic(() => import('@/components/editor/tiptap-editor'), {
  ssr: false,
  loading: () => <div className="rounded-xl border bg-white p-6 shadow-sm min-h-[400px] animate-pulse" />,
})

export default function EditArticlePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState<Record<string, unknown>>({})
  const [initialContent, setInitialContent] = useState<Record<string, unknown> | null>(null)
  const [status, setStatus] = useState('DRAFT')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [aiGenerated, setAiGenerated] = useState(false)

  useEffect(() => {
    fetch(`/api/articles/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setTitle(data.title || '')
        setInitialContent(data.content || {})
        setContent(data.content || {})
        setStatus(data.status || 'DRAFT')
        setAiGenerated(data.aiGenerated || false)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.id])

  async function handleSave(newStatus?: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/articles/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          status: newStatus || status,
        }),
      })
      if (res.ok) {
        if (newStatus) setStatus(newStatus)
        router.refresh()
      }
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this article?')) return
    try {
      const res = await fetch(`/api/articles/${params.id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/newsroom')
        router.refresh()
      }
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  if (loading) {
    return <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded" />
      <div className="h-[400px] bg-gray-100 rounded-xl" />
    </div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/newsroom')} className="text-sm text-muted-foreground hover:text-foreground">
            ← Newsroom
          </button>
          <h1 className="text-lg font-bold">Edit Article</h1>
          {aiGenerated && <span title="AI Generated">🤖</span>}
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
            status === 'PUBLISHED' ? 'bg-green-50 text-green-700'
            : status === 'DRAFT' ? 'bg-gray-100 text-gray-600'
            : 'bg-yellow-50 text-yellow-700'
          }`}>
            {status.replace('_', ' ').toLowerCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          {status !== 'PUBLISHED' && (
            <button
              onClick={() => handleSave('PUBLISHED')}
              disabled={saving}
              className="rounded-lg bg-mint px-4 py-2 text-sm font-medium text-white hover:bg-mint-dark transition-colors disabled:opacity-50"
            >
              Publish
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-2xl font-bold placeholder:text-gray-300 focus:outline-none"
          placeholder="Article title..."
        />
      </div>

      {initialContent && (
        <TiptapEditor
          content={initialContent}
          onChange={(json) => setContent(json)}
        />
      )}
    </div>
  )
}
