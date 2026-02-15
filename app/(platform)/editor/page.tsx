'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import './editor.css'

const TiptapEditor = dynamic(() => import('@/components/editor/tiptap-editor'), {
  ssr: false,
  loading: () => <div style={{ minHeight: 400, background: 'var(--wh)', border: '1px solid var(--brd)', borderRadius: 'var(--rl)', animation: 'pulse 2s infinite' }} />,
})

const trendingItems = [
  { text: 'El Clásico: Real Madrid vs Barcelona', prompt: 'Write a match preview for Real Madrid vs Barcelona — El Clásico, include prediction, key battles, H2H stats, fan poll and quiz', tag: 'hot', tagLabel: 'HOT', countdown: '4h 23m' },
  { text: 'Man City vs Liverpool — match report', prompt: 'Post-match report Man City vs Liverpool with player ratings and tactical analysis', tag: 'live', tagLabel: 'LIVE', articles: '847 articles' },
  { text: 'Mbappé transfer saga — done deal?', prompt: 'Transfer news: Mbappé to Real Madrid — latest updates, fee, contract details', tag: 'hot', tagLabel: 'HOT', articles: '1.2K articles' },
  { text: 'UCL quarter-final predictions', prompt: 'Champions League QF predictions with stats', tag: 'ai', tagLabel: 'AI PICK' },
  { text: 'Top 10 strikers in Europe', prompt: 'Top 10 strikers in Europe 2024/25 with stats', articles: '326 articles' },
  { text: 'Arsenal tactical masterclass vs Chelsea', prompt: 'Arsenal tactical breakdown vs Chelsea', tag: 'ai', tagLabel: 'AI PICK' },
  { text: 'Der Klassiker: Bayern vs Dortmund', prompt: 'Bayern vs Dortmund Der Klassiker preview', countdown: '1d 6h' },
  { text: 'PL title race analysis', prompt: 'Premier League title race — who wins?', tag: 'hot', tagLabel: 'HOT', articles: '2.4K' },
  { text: 'Lamine Yamal — the next big thing', prompt: 'Lamine Yamal player profile with stats', tag: 'ai', tagLabel: 'AI PICK' },
  { text: 'Serie A Round 28 preview', prompt: 'Serie A Round 28 full preview — all matches', articles: '189 articles' },
]

const matches = [
  { home: 'Real Madrid', away: 'Barcelona', homeCrest: '⚪', awayCrest: '🔴', league: 'La Liga', time: 'Today, 21:00' },
  { home: 'Man City', away: 'Liverpool', homeCrest: '🔵', awayCrest: '🔴', league: 'Premier League', live: "LIVE 67'" },
  { home: 'Bayern', away: 'Dortmund', homeCrest: '🔴', awayCrest: '🟡', league: 'Bundesliga', time: 'Tomorrow 18:30' },
]

const chips = [
  { label: '⚽ Preview', prompt: 'Match preview' },
  { label: '📝 Report', prompt: 'Post-match report' },
  { label: '🔄 Transfer', prompt: 'Transfer news' },
  { label: '📊 Analysis', prompt: 'Tactical analysis' },
  { label: '🏆 Rankings', prompt: 'Top 10 rankings' },
  { label: '👤 Profile', prompt: 'Player profile' },
]

const attachWidgets = [
  { icon: '⚽', name: 'Match', value: 'match widget' },
  { icon: '🗳️', name: 'Poll', value: 'fan poll' },
  { icon: '🧠', name: 'Quiz', value: 'interactive quiz' },
  { icon: '📸', name: 'Gallery', value: 'image gallery' },
  { icon: '📊', name: 'Stats', value: 'stats table' },
  { icon: '⭐', name: 'Ratings', value: 'player ratings' },
  { icon: '📹', name: 'Video', value: 'video embed' },
  { icon: '📋', name: 'Survey', value: 'reader survey' },
]

const genSteps = [
  'Fetching match data',
  'Analyzing H2H & form',
  'Writing article (~1,800 words)',
  'Creating widgets & quiz',
  'Generating gallery',
  'Placing ad slots',
  'Final review ✅',
]

export default function EditorPage() {
  const router = useRouter()
  const [screen, setScreen] = useState<'prompt' | 'generating' | 'editor'>('prompt')
  const [prompt, setPrompt] = useState('')
  const [showAttach, setShowAttach] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null)
  const [showMore, setShowMore] = useState(false)
  const [genStep, setGenStep] = useState(0)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [articleStatus, setArticleStatus] = useState<'DRAFT' | 'IN_REVIEW' | 'PUBLISHED'>('DRAFT')
  const [siteId, setSiteId] = useState<string | null>(null)
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [categoryId, setCategoryId] = useState('')
  const [aiResult, setAiResult] = useState<{ model?: string; tokensIn?: number; tokensOut?: number } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  function setP(text: string) {
    setPrompt(text)
    textareaRef.current?.focus()
  }

  function addToPrompt(widget: string) {
    const v = prompt.trim()
    setPrompt(v + (v ? ', ' : '') + widget)
    setShowAttach(false)
    textareaRef.current?.focus()
  }

  function pickMatch(index: number) {
    setSelectedMatch(index)
    const m = matches[index]
    if (!prompt.trim()) {
      setPrompt(`Write a match preview for ${m.home} vs ${m.away} with H2H stats, quiz, poll, and gallery`)
    }
    textareaRef.current?.focus()
  }

  function getPreviewWidgets(): string[] {
    const l = prompt.toLowerCase()
    const w: string[] = []
    if (l.includes('preview') || l.includes('match')) w.push('Match Widget')
    if (l.includes('h2h') || l.includes('stats')) w.push('H2H Stats')
    if (l.includes('poll')) w.push('Poll')
    if (l.includes('quiz')) w.push('Quiz')
    if (l.includes('gallery')) w.push('Gallery')
    if (l.includes('rating')) w.push('Ratings')
    if (l.includes('video')) w.push('Video')
    if (l.includes('survey')) w.push('Survey')
    if (!w.length) w.push('Match Widget', 'Poll')
    return w
  }

  async function startGenerate() {
    if (!prompt.trim()) return
    setScreen('generating')
    setGenStep(0)

    // Animate steps
    for (let i = 0; i < genSteps.length; i++) {
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 300))
      setGenStep(i + 1)
    }

    // Call the API
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'custom',
          customPrompt: prompt,
          tone: 'professional',
          language: 'en',
          wordCount: 1500,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')

      const paragraphs = (data.content || '').split('\n\n').filter(Boolean)
      const tiptapContent = {
        type: 'doc',
        content: paragraphs.map((p: string) => ({
          type: 'paragraph',
          content: [{ type: 'text', text: p }],
        })),
      }

      setTitle(data.title || 'Generated Article')
      setContent(tiptapContent)
      setAiResult({ model: data.model, tokensIn: data.tokensIn, tokensOut: data.tokensOut })
      setScreen('editor')
    } catch {
      // On error, go to editor with empty content
      setTitle(prompt)
      setContent({})
      setScreen('editor')
    }
  }

  async function handleSave(status: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED') {
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

  // ─── S2: Generating ───
  if (screen === 'generating') {
    return (
      <div className="s2-screen">
        <div className="spinner" />
        <div className="s2-text">Writing your article...</div>
        <div className="s2-steps">
          {genSteps.map((step, i) => (
            <div key={i} className={`gs ${i < genStep ? 'done' : ''} ${i === genStep ? 'active' : ''}`}>
              <span className="ck">✓</span>
              <span className="dt">●</span>
              {step}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ─── S3: Editor ───
  if (screen === 'editor') {
    return (
      <div>
        <div className="ed-top">
          <button className="ed-back" onClick={() => { setScreen('prompt'); setAiResult(null) }}>← New</button>
          <div className="ed-title-bar">
            {title || 'Untitled'}
            {aiResult && <span className="badge-ai">AI</span>}
            <span className={`badge-status ${articleStatus.toLowerCase().replace('_', '-')}`}>
              {articleStatus === 'DRAFT' ? 'Draft' : articleStatus === 'IN_REVIEW' ? 'In Review' : 'Published'}
            </span>
          </div>
          <button className="ed-btn ed-btn-secondary" onClick={() => { setArticleStatus('DRAFT'); handleSave('DRAFT') }} disabled={saving || !title.trim()}>
            💾 {saving && articleStatus === 'DRAFT' ? 'Saving...' : 'Save Draft'}
          </button>
          <button className="ed-btn ed-btn-review" onClick={() => { setArticleStatus('IN_REVIEW'); handleSave('IN_REVIEW') }} disabled={saving || !title.trim()}>
            📝 {saving && articleStatus === 'IN_REVIEW' ? 'Saving...' : 'Submit for Review'}
          </button>
          <button className="ed-btn ed-btn-primary" onClick={() => { setArticleStatus('PUBLISHED'); handleSave('PUBLISHED') }} disabled={saving || !title.trim()}>
            ⚡ {saving && articleStatus === 'PUBLISHED' ? 'Saving...' : 'Publish'}
          </button>
        </div>

        <div className="ed-form">
          <input
            type="text"
            className="ed-title-input"
            placeholder="Article title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="ed-meta">
            <select className="ed-select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">No category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <TiptapEditor
            onChange={(json) => setContent(json)}
            placeholder="Start writing your article..."
          />
        </div>

        {aiResult && (
          <div className="ai-result-info">
            <span>🤖 Generated by {aiResult.model}</span>
            <span>· {aiResult.tokensIn} in / {aiResult.tokensOut} out tokens</span>
          </div>
        )}
      </div>
    )
  }

  // ─── S1: Prompt ───
  const showPreview = prompt.length > 10
  const widgets = getPreviewWidgets()

  return (
    <div className="s1">
      <div className="s1-main">
        {/* Trending sidebar */}
        <div className="tp">
          <div className="tp-title"><span>🔥</span> Trending Now</div>
          <div className="tp-list">
            {trendingItems.slice(0, showMore ? 15 : 10).map((item, i) => (
              <div key={i} className="ti" onClick={() => setP(item.prompt)}>
                <span className="ti-num">{String(i + 1).padStart(2, '0')}</span>
                <div className="ti-body">
                  <div className="ti-text">{item.text}</div>
                  <div className="ti-meta">
                    {item.tag && <span className={`ti-tag ${item.tag}`}>{item.tagLabel}</span>}
                    {item.countdown && <span className="ti-cd">{item.countdown}</span>}
                    {item.articles && <span className="ti-art">{item.articles}</span>}
                  </div>
                </div>
              </div>
            ))}
            {!showMore && (
              <button className="load-more-btn" onClick={() => setShowMore(true)}>▾ Load 5 more</button>
            )}
          </div>
        </div>

        {/* Prompt center */}
        <div className="pc">
          <div className="brand">
            <h1>AI Co-Pilot<span>.</span></h1>
            <p>Describe what you want — AI handles the rest</p>
          </div>

          {/* Prompt box */}
          <div className="pb">
            <textarea
              ref={textareaRef}
              rows={3}
              placeholder="e.g. Write a match preview for El Clasico with H2H stats, fan poll, quiz, and gallery..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) startGenerate() }}
            />
            {showAttach && (
              <div className="ap">
                <div className="ap-title">Add to your article</div>
                <div className="ap-grid">
                  {attachWidgets.map((w) => (
                    <div key={w.name} className="ap-item" onClick={() => addToPrompt(w.value)}>
                      <div className="ap-icon">{w.icon}</div>
                      <div className="ap-name">{w.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="pb-foot">
              <div className="pb-left">
                <button className={`pb-btn ${showAttach ? 'active' : ''}`} onClick={() => setShowAttach(!showAttach)}>
                  <span className="tip">Add widgets</span>🧩
                </button>
                <button className="pb-btn" onClick={() => addToPrompt('image gallery')}>
                  <span className="tip">Gallery</span>📸
                </button>
                <button className="pb-btn" onClick={() => addToPrompt('fan poll')}>
                  <span className="tip">Poll</span>🗳️
                </button>
                <button className="pb-btn" onClick={() => addToPrompt('quiz')}>
                  <span className="tip">Quiz</span>🧠
                </button>
              </div>
              <button className="gen-btn" onClick={startGenerate}>🤖 Generate</button>
            </div>
          </div>

          {/* Preview card */}
          {showPreview && (
            <div className="prev-card">
              <div className="pci">⚡</div>
              <div className="pcb">
                <div className="pct">AI will generate:</div>
                <div className="pcd">~1,500 words · {Math.ceil(1500 / 250)} min read · {widgets.length} widgets</div>
                <div className="pcp">
                  {widgets.map((w) => (
                    <span key={w} className="pill">{w}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick type chips */}
          <div className="chips">
            {chips.map((c) => (
              <button key={c.label} className="chip" onClick={() => setP(c.prompt)}>{c.label}</button>
            ))}
          </div>

          {/* Today's Matches */}
          <div className="ms">
            <div className="ms-label">Today&apos;s Matches</div>
            <div className="mc-list">
              {matches.map((m, i) => (
                <div key={i} className={`mc ${selectedMatch === i ? 'sel' : ''}`} onClick={() => pickMatch(i)}>
                  <div className="mc-teams">
                    <div className="mc-t"><div className="mc-crest">{m.homeCrest}</div>{m.home}</div>
                    <div className="mc-vs">VS</div>
                    <div className="mc-t"><div className="mc-crest">{m.awayCrest}</div>{m.away}</div>
                  </div>
                  <div className="mc-meta">
                    <div className="mc-league">{m.league}</div>
                    {m.live ? <div className="live-b">{m.live}</div> : <div className="mc-time">{m.time}</div>}
                  </div>
                  <span className="mc-arrow">→</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
