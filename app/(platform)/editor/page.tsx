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
  const [aiResult, setAiResult] = useState<{ model?: string; tokensIn?: number; tokensOut?: number } | null>(null)

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
          aiGenerated: !!aiResult,
          aiModel: aiResult?.model,
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
    return <AIGenerateFlow
      onGenerated={(article) => {
        setTitle(article.title)
        setContent(article.content)
        setAiResult(article)
        setMode('manual')
      }}
      onBack={() => setMode('choose')}
    />
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

      {aiResult && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>🤖 Generated by {aiResult.model}</span>
          <span>· {aiResult.tokensIn} in / {aiResult.tokensOut} out tokens</span>
        </div>
      )}
    </div>
  )
}

// ─── AI Generate Flow ────────────────────────────────────────

function AIGenerateFlow({
  onGenerated,
  onBack,
}: {
  onGenerated: (article: { title: string; content: Record<string, unknown>; model: string; tokensIn: number; tokensOut: number }) => void
  onBack: () => void
}) {
  const [type, setType] = useState<string>('match-report')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  // Form fields
  const [homeTeam, setHomeTeam] = useState('')
  const [awayTeam, setAwayTeam] = useState('')
  const [score, setScore] = useState('')
  const [league, setLeague] = useState('')
  const [keyEvents, setKeyEvents] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [fromClub, setFromClub] = useState('')
  const [toClub, setToClub] = useState('')
  const [fee, setFee] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [tone, setTone] = useState('professional')
  const [language, setLanguage] = useState('bs')

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, homeTeam, awayTeam, score, league, keyEvents,
          playerName, fromClub, toClub, fee, customPrompt,
          tone, language, wordCount: 600,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')

      // Convert text content to Tiptap JSON
      const paragraphs = (data.content || '').split('\n\n').filter(Boolean)
      const tiptapContent = {
        type: 'doc',
        content: paragraphs.map((p: string) => ({
          type: 'paragraph',
          content: [{ type: 'text', text: p }],
        })),
      }

      onGenerated({
        title: data.title || 'Generated Article',
        content: tiptapContent,
        model: data.model,
        tokensIn: data.tokensIn,
        tokensOut: data.tokensOut,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const articleTypes = [
    { value: 'match-report', label: '⚽ Match Report', desc: 'Post-match analysis and recap' },
    { value: 'match-preview', label: '🔮 Match Preview', desc: 'Pre-match preview and prediction' },
    { value: 'transfer-news', label: '💰 Transfer News', desc: 'Player transfer announcement' },
    { value: 'analysis', label: '📊 Analysis', desc: 'Tactical or statistical breakdown' },
    { value: 'custom', label: '✍️ Custom', desc: 'Describe what you want' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Generate</h1>
          <p className="text-muted-foreground">Choose article type and fill in details</p>
        </div>
      </div>

      {/* Article type selector */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {articleTypes.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              type === t.value ? 'border-mint bg-mint-light' : 'bg-white hover:border-gray-300'
            }`}
          >
            <p className="font-medium text-sm">{t.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
          </button>
        ))}
      </div>

      {/* Dynamic form based on type */}
      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        {(type === 'match-report' || type === 'match-preview') && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Home Team</label>
                <input value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} placeholder="FK Sarajevo" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Away Team</label>
                <input value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} placeholder="FK Željezničar" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint" />
              </div>
            </div>
            {type === 'match-report' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Score</label>
                  <input value={score} onChange={(e) => setScore(e.target.value)} placeholder="2-1" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">League</label>
                  <input value={league} onChange={(e) => setLeague(e.target.value)} placeholder="Premijer Liga BiH" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint" />
                </div>
              </div>
            )}
            {type === 'match-report' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Key Events (optional)</label>
                <input value={keyEvents} onChange={(e) => setKeyEvents(e.target.value)} placeholder="Goal 23' Demirović, Red card 67' Kovačević" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint" />
              </div>
            )}
          </>
        )}

        {type === 'transfer-news' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Player Name</label>
                <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Ermedin Demirović" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Transfer Fee (optional)</label>
                <input value={fee} onChange={(e) => setFee(e.target.value)} placeholder="€5M" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">From Club</label>
                <input value={fromClub} onChange={(e) => setFromClub(e.target.value)} placeholder="FC Augsburg" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">To Club</label>
                <input value={toClub} onChange={(e) => setToClub(e.target.value)} placeholder="VfB Stuttgart" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint" />
              </div>
            </div>
          </>
        )}

        {(type === 'analysis' || type === 'custom') && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              {type === 'custom' ? 'Describe what you want' : 'Analysis topic'}
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder={type === 'custom' ? 'Write a feature about...' : 'Tactical analysis of how FK Sarajevo uses high press...'}
              rows={3}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint"
            />
          </div>
        )}

        {/* Common options */}
        <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Tone</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint">
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="tabloid">Tabloid</option>
              <option value="analytical">Analytical</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint">
              <option value="bs">Bosanski</option>
              <option value="hr">Hrvatski</option>
              <option value="sr">Srpski</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full rounded-lg bg-mint px-4 py-3 text-sm font-medium text-white hover:bg-mint-dark transition-colors disabled:opacity-50"
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">🤖</span> Generating with Claude...
            </span>
          ) : (
            '🤖 Generate Article'
          )}
        </button>
      </div>
    </div>
  )
}
