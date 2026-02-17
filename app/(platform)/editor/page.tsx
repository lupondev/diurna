'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

const WORD_COUNT_OPTIONS = [
  { value: 150, label: 'Flash', desc: '~150 words' },
  { value: 300, label: 'Standard', desc: '~300 words' },
  { value: 500, label: 'Detailed', desc: '~500 words' },
  { value: 800, label: 'Long-form', desc: '~800 words' },
]

export default function EditorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const [sendNewsletter, setSendNewsletter] = useState(false)
  const [smartNotice, setSmartNotice] = useState<string | null>(null)
  const [showOriginality, setShowOriginality] = useState(false)
  const [origLoading, setOrigLoading] = useState(false)
  const [origResult, setOrigResult] = useState<{ aiScore: number; uniquenessScore: number; flaggedPhrases: string[]; suggestions: string[]; summary: string } | null>(null)
  const [trends, setTrends] = useState<{ title: string; traffic: string }[]>([])
  const [trendsGeo, setTrendsGeo] = useState('BA')
  const [trendsLoading, setTrendsLoading] = useState(false)
  const [wordCount, setWordCount] = useState(300)
  const [contextLevel, setContextLevel] = useState<string | null>(null)
  const [factCheck, setFactCheck] = useState<{ warnings: { type: string; detail: string; severity: string }[]; warningCount: number; status: string } | null>(null)
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

  useEffect(() => {
    if (searchParams.get('smartGenerate') === 'true') {
      try {
        const raw = sessionStorage.getItem('smartArticle')
        if (raw) {
          const data = JSON.parse(raw)
          if (data.title) setTitle(data.title)
          if (data.tiptapContent) setContent(data.tiptapContent)
          if (data.model) setAiResult({ model: data.model, tokensIn: data.tokensIn, tokensOut: data.tokensOut })
          setScreen('editor')
          setSmartNotice('Article generated by AI — review and edit before publishing')
          setTimeout(() => setSmartNotice(null), 6000)
          sessionStorage.removeItem('smartArticle')
        }
      } catch {}
    }

    if (searchParams.get('mode') === 'rewrite') {
      try {
        const raw = sessionStorage.getItem('diurna_rewrite_source')
        if (raw) {
          const data = JSON.parse(raw) as { title: string; sourceText: string; domain: string; prompt: string }
          sessionStorage.removeItem('diurna_rewrite_source')
          setPrompt(`Rewriting: ${data.title}`)
          setScreen('generating')
          setGenStep(0)

          const runRewriteGenerate = async () => {
            for (let i = 0; i < genSteps.length; i++) {
              await new Promise((r) => setTimeout(r, 400 + Math.random() * 300))
              setGenStep(i + 1)
            }
            try {
              const res = await fetch('/api/ai/smart-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  topic: data.title,
                  category: 'Sport',
                  articleType: 'report',
                  mode: 'rewrite',
                  sourceContext: data.sourceText,
                  sourceDomain: data.domain,
                }),
              })
              const result = await res.json()
              if (!res.ok) throw new Error(result.error || 'Generation failed')
              setTitle(result.title || data.title)
              if (result.tiptapContent) setContent(result.tiptapContent)
              setAiResult({ model: result.model, tokensIn: result.tokensIn, tokensOut: result.tokensOut })
              setContextLevel(result.contextLevel || 'full')
              if (result.factCheck?.warnings?.length > 0) setFactCheck(result.factCheck)
              setScreen('editor')
              setSmartNotice(`Rewritten from ${data.domain} — review and edit before publishing`)
              setTimeout(() => setSmartNotice(null), 6000)
            } catch {
              setTitle(data.title)
              setContent({})
              setScreen('editor')
            }
          }
          runRewriteGenerate()
        }
      } catch {}
    }

    if (searchParams.get('mode') === 'headline-only') {
      try {
        const raw = sessionStorage.getItem('diurna_headline_only')
        if (raw) {
          const data = JSON.parse(raw) as { title: string }
          sessionStorage.removeItem('diurna_headline_only')
          setPrompt(`Headline-only: ${data.title}`)
          setScreen('generating')
          setGenStep(0)

          const runHeadlineGenerate = async () => {
            for (let i = 0; i < genSteps.length; i++) {
              await new Promise((r) => setTimeout(r, 400 + Math.random() * 300))
              setGenStep(i + 1)
            }
            try {
              const res = await fetch('/api/ai/smart-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  topic: data.title,
                  category: 'Sport',
                  articleType: 'breaking',
                  mode: 'single',
                }),
              })
              const result = await res.json()
              if (!res.ok) throw new Error(result.error || 'Generation failed')
              setTitle(result.title || data.title)
              if (result.tiptapContent) setContent(result.tiptapContent)
              setAiResult({ model: result.model, tokensIn: result.tokensIn, tokensOut: result.tokensOut })
              setContextLevel(result.contextLevel || 'headline-only')
              if (result.factCheck?.warnings?.length > 0) setFactCheck(result.factCheck)
              setScreen('editor')
              setSmartNotice('⚠️ Headline-only — no source article available. Review carefully before publishing.')
              setTimeout(() => setSmartNotice(null), 10000)
            } catch {
              setTitle(data.title)
              setContent({})
              setScreen('editor')
            }
          }
          runHeadlineGenerate()
        }
      } catch {}
    }

    if (searchParams.get('mode') === 'combined') {
      try {
        const raw = sessionStorage.getItem('diurna_combined_sources')
        if (raw) {
          const sources = JSON.parse(raw) as { title: string; source: string; role: string }[]
          sessionStorage.removeItem('diurna_combined_sources')
          if (sources.length > 0) {
            const primary = sources.find(s => s.role === 'primary')
            setPrompt(`Combined article from ${sources.length} sources`)
            setScreen('generating')
            setGenStep(0)

            const runCombinedGenerate = async () => {
              for (let i = 0; i < genSteps.length; i++) {
                await new Promise((r) => setTimeout(r, 400 + Math.random() * 300))
                setGenStep(i + 1)
              }
              try {
                const res = await fetch('/api/ai/smart-generate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    topic: primary?.title || sources[0].title,
                    category: 'Sport',
                    articleType: 'report',
                    mode: 'combined',
                    sources: sources.map(s => ({ title: s.title, source: s.source, role: s.role })),
                  }),
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error || 'Generation failed')
                setTitle(data.title || primary?.title || 'Combined Article')
                if (data.tiptapContent) setContent(data.tiptapContent)
                setAiResult({ model: data.model, tokensIn: data.tokensIn, tokensOut: data.tokensOut })
                setScreen('editor')
                setSmartNotice('Combined article generated — review and edit before publishing')
                setTimeout(() => setSmartNotice(null), 6000)
              } catch {
                setTitle(primary?.title || sources[0].title)
                setContent({})
                setScreen('editor')
              }
            }
            runCombinedGenerate()
          }
        }
      } catch {}
    }

    const promptParam = searchParams.get('prompt')
    if (promptParam && !searchParams.get('smartGenerate') && searchParams.get('mode') !== 'combined') {
      setPrompt(promptParam)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setTrendsLoading(true)
    fetch(`/api/trends?geo=${trendsGeo}`)
      .then((r) => r.json())
      .then((data) => { setTrends(data.trends || []); setTrendsLoading(false) })
      .catch(() => setTrendsLoading(false))
  }, [trendsGeo])

  async function runOriginalityCheck() {
    const doc = content as { content?: Array<{ content?: Array<{ text?: string }> }> }
    let text = ''
    if (doc?.content) {
      for (const node of doc.content) {
        if (node.content) {
          text += node.content.map((c) => c.text || '').join('') + '\n'
        }
      }
    }
    text = text.trim()
    if (text.length < 50) { alert('Write at least 50 characters before checking originality.'); return }
    setOrigLoading(true)
    setOrigResult(null)
    setShowOriginality(true)
    try {
      const res = await fetch('/api/ai/originality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      const data = await res.json()
      if (res.ok) setOrigResult(data)
      else setOrigResult({ aiScore: 0, uniquenessScore: 0, flaggedPhrases: [], suggestions: [data.error || 'Check failed'], summary: 'Error' })
    } catch {
      setOrigResult({ aiScore: 0, uniquenessScore: 0, flaggedPhrases: [], suggestions: ['Network error'], summary: 'Error' })
    } finally { setOrigLoading(false) }
  }

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

  const genSteps = [
    'Analyzing topic',
    `Generating article (~${wordCount} words)`,
    'Building SEO metadata',
    'Final review',
  ]

  async function startGenerate() {
    if (!prompt.trim()) return
    setScreen('generating')
    setGenStep(0)

    for (let i = 0; i < genSteps.length; i++) {
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 300))
      setGenStep(i + 1)
    }

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'custom',
          customPrompt: prompt,
          tone: 'professional',
          language: 'en',
          wordCount,
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
        const article = await res.json()
        if (sendNewsletter && status === 'PUBLISHED' && article.id) {
          fetch('/api/newsletter/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ articleId: article.id }),
          }).catch(console.error)
        }
        router.push('/newsroom')
        router.refresh()
      }
    } catch {} finally {
      setSaving(false)
    }
  }

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
          <button className="ed-btn ed-btn-originality" onClick={runOriginalityCheck} disabled={origLoading}>
            🔍 {origLoading ? 'Checking...' : 'Originality'}
          </button>
          <label className="ed-nl-check">
            <input type="checkbox" checked={sendNewsletter} onChange={(e) => setSendNewsletter(e.target.checked)} />
            <span>📧 Newsletter</span>
          </label>
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
            content={content && Object.keys(content).length > 0 ? content : undefined}
            onChange={(json) => setContent(json)}
            placeholder="Start writing your article..."
          />
        </div>

        {smartNotice && (
          <div style={{
            position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
            background: '#065F46', color: '#fff', padding: '10px 20px', borderRadius: 10,
            fontSize: 13, fontWeight: 600, zIndex: 1000, boxShadow: '0 4px 20px rgba(0,0,0,.15)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>✨</span> {smartNotice}
            <button onClick={() => setSmartNotice(null)} style={{
              background: 'none', border: 'none', color: '#fff', cursor: 'pointer',
              fontSize: 16, marginLeft: 8, opacity: 0.7,
            }}>×</button>
          </div>
        )}

        {aiResult && (
          <div className="ai-result-info">
            <span>🤖 Generated by {aiResult.model}</span>
            <span>· {aiResult.tokensIn} in / {aiResult.tokensOut} out tokens</span>
            {contextLevel && <span>· Level: {contextLevel}</span>}
          </div>
        )}

        {contextLevel === 'headline-only' && (
          <div className="fact-warning-bar headline-only-warning">
            <span className="fact-warning-icon">⚠️</span>
            <span>No source article was available. This article was generated from the headline only — MAX 3 sentences. Verify all details before publishing.</span>
          </div>
        )}

        {factCheck && factCheck.warnings.length > 0 && (
          <div className="fact-warning-bar">
            <div className="fact-warning-header">
              <span className="fact-warning-icon">⚠️</span>
              <span className="fact-warning-title">Fact-Check Warnings ({factCheck.warningCount})</span>
              <span className="fact-warning-sub">
                {factCheck.status === 'REVIEW_REQUIRED' ? 'Review required — potential hallucinations detected' : 'Some details need verification'}
              </span>
            </div>
            <div className="fact-warning-list">
              {factCheck.warnings.map((w, i) => (
                <div key={i} className="fact-check-item">
                  <span className={`fact-severity ${w.severity.toLowerCase()}`}>
                    {w.severity === 'HIGH' ? '🔴' : w.severity === 'MEDIUM' ? '🟡' : '⚪'}
                  </span>
                  <span className="fact-check-detail">{w.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {showOriginality && (
          <div className="ed-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowOriginality(false) }}>
            <div className="ed-modal" style={{ width: 540 }}>
              <div className="ed-modal-head">
                <div className="ed-modal-title">🔍 Originality Check</div>
                <button className="ed-modal-close" onClick={() => setShowOriginality(false)}>x</button>
              </div>
              <div className="ed-modal-body">
                {origLoading ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--g400)' }}>
                    <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
                    Analyzing content...
                  </div>
                ) : origResult ? (
                  <div className="orig-results">
                    <div className="orig-scores">
                      <div className="orig-score-card">
                        <div className={`orig-score-val ${origResult.aiScore > 70 ? 'high' : origResult.aiScore > 40 ? 'med' : 'low'}`}>{origResult.aiScore}</div>
                        <div className="orig-score-label">AI Detection</div>
                        <div className="orig-score-hint">{origResult.aiScore > 70 ? 'Likely AI' : origResult.aiScore > 40 ? 'Mixed' : 'Likely Human'}</div>
                      </div>
                      <div className="orig-score-card">
                        <div className={`orig-score-val ${origResult.uniquenessScore > 70 ? 'low' : origResult.uniquenessScore > 40 ? 'med' : 'high'}`}>{origResult.uniquenessScore}</div>
                        <div className="orig-score-label">Uniqueness</div>
                        <div className="orig-score-hint">{origResult.uniquenessScore > 70 ? 'Highly Original' : origResult.uniquenessScore > 40 ? 'Moderate' : 'Needs Work'}</div>
                      </div>
                    </div>
                    <div className="orig-summary">{origResult.summary}</div>
                    {origResult.flaggedPhrases.length > 0 && (
                      <div className="orig-section">
                        <div className="orig-section-title">Flagged Phrases</div>
                        {origResult.flaggedPhrases.map((p, i) => (
                          <div key={i} className="orig-phrase">&ldquo;{p}&rdquo;</div>
                        ))}
                      </div>
                    )}
                    {origResult.suggestions.length > 0 && (
                      <div className="orig-section">
                        <div className="orig-section-title">Suggestions</div>
                        {origResult.suggestions.map((s, i) => (
                          <div key={i} className="orig-suggestion"><span className="orig-bullet">→</span> {s}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const showPreview = prompt.length > 10
  const widgets = getPreviewWidgets()

  return (
    <div className="s1">
      <div className="s1-main">
        <div className="tp">
          <div className="tp-trends-head">
            <div className="tp-title"><span>📈</span> Google Trends</div>
            <select className="tp-geo-select" value={trendsGeo} onChange={(e) => setTrendsGeo(e.target.value)}>
              <option value="BA">Bosnia</option>
              <option value="US">USA</option>
              <option value="GB">UK</option>
              <option value="DE">Germany</option>
              <option value="HR">Croatia</option>
              <option value="RS">Serbia</option>
            </select>
          </div>
          <div className="tp-list">
            {trendsLoading ? (
              <div style={{ textAlign: 'center', padding: 16, color: 'var(--g400)', fontSize: 12 }}>Loading trends...</div>
            ) : trends.length > 0 ? (
              trends.slice(0, 10).map((item, i) => (
                <div key={i} className="ti" onClick={() => setP(`Write a sports article about: ${item.title}`)}>
                  <span className="ti-num">{String(i + 1).padStart(2, '0')}</span>
                  <div className="ti-body">
                    <div className="ti-text">{item.title}</div>
                    <div className="ti-meta">
                      <span className="ti-tag hot">TRENDING</span>
                      {item.traffic && <span className="ti-art">{item.traffic}</span>}
                    </div>
                  </div>
                </div>
              ))
            ) : null}
          </div>

          <div className="tp-title" style={{ marginTop: 16 }}><span>🔥</span> Editorial Picks</div>
          <div className="tp-list">
            {trendingItems.slice(0, showMore ? 15 : 5).map((item, i) => (
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
              <button className="load-more-btn" onClick={() => setShowMore(true)}>▾ Load more</button>
            )}
          </div>
        </div>

        <div className="pc">
          <div className="brand">
            <h1>AI Co-Pilot<span>.</span></h1>
            <p>Describe what you want — AI handles the rest</p>
          </div>

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
              <select className="wc-select" value={wordCount} onChange={(e) => setWordCount(Number(e.target.value))}>
                {WORD_COUNT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label} ({opt.desc})</option>
                ))}
              </select>
              <button className="gen-btn" onClick={startGenerate}>🤖 Generate</button>
            </div>
          </div>

          {showPreview && (
            <div className="prev-card">
              <div className="pci">⚡</div>
              <div className="pcb">
                <div className="pct">AI will generate:</div>
                <div className="pcd">~{wordCount} words · {Math.max(1, Math.round(wordCount / 200))} min read · {widgets.length} widgets</div>
                <div className="pcp">
                  {widgets.map((w) => (
                    <span key={w} className="pill">{w}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="chips">
            {chips.map((c) => (
              <button key={c.label} className="chip" onClick={() => setP(c.prompt)}>{c.label}</button>
            ))}
          </div>

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
