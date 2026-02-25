'use client'

import { useState, useCallback, useEffect } from 'react'
import type { Editor } from '@tiptap/react'

const TEMPLATES = [
  { label: '⚽ Preview', articleType: 'preview', prompt: 'Write match preview' },
  { label: '📝 Report', articleType: 'report', prompt: 'Write match report' },
  { label: '🔄 Transfer', articleType: 'transfer', prompt: 'Write transfer article' },
  { label: '📊 Analysis', articleType: 'analysis', prompt: 'Write tactical analysis' },
  { label: '🏆 Rankings', articleType: 'rankings', prompt: 'Write rankings' },
  { label: '👤 Profile', articleType: 'profile', prompt: 'Write player profile' },
]

const COVERAGE = [
  { value: 300, label: 'Quick (300w)' },
  { value: 800, label: 'Standard (800w)' },
  { value: 1500, label: 'Deep (1500w)' },
  { value: 2500, label: 'Longform (2500w)' },
]

const AI_ACTIONS = [
  { key: 'improve', icon: '✨', label: 'Improve', prompt: 'Improve this text — make it clearer, more engaging, and better structured. Return ONLY the improved text:' },
  { key: 'extend', icon: '📏', label: 'Extend', prompt: 'Expand this paragraph with more detail, context, and supporting information. Return ONLY the extended text:' },
  { key: 'shorten', icon: '✂️', label: 'Shorten', prompt: 'Shorten this text to be more concise while keeping the key points. Return ONLY the shortened text:' },
  { key: 'translate', icon: '🌐', label: 'Translate', prompt: 'Translate this text. If it is in English, translate to Bosnian. If in Bosnian, translate to English. Return ONLY the translated text:' },
  { key: 'stats', icon: '📊', label: 'Add Stats', prompt: 'Add relevant statistics and data points to enhance this text. Return the text with stats woven in naturally:' },
  { key: 'factcheck', icon: '🔍', label: 'Fact Check', prompt: 'Check this text for factual accuracy. List any potential issues. If everything looks correct, say "No issues found." Return your analysis:' },
]

interface AISidebarProps {
  editor: Editor | null
  onGenerate?: (result: { title?: string; content?: Record<string, unknown>; model?: string; tokensIn?: number; tokensOut?: number }) => void
  prefilledPrompt?: string
  autoGenerate?: boolean
}

export function AISidebar({ editor, onGenerate, prefilledPrompt, autoGenerate }: AISidebarProps) {
  const [prompt, setPrompt] = useState(prefilledPrompt || '')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [wordCount, setWordCount] = useState(800)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<{ text: string; action: () => void }[]>([])
  const [contextEntities, setContextEntities] = useState<string[]>([])
  const [lastResult, setLastResult] = useState<{ model?: string; tokensIn?: number; tokensOut?: number } | null>(null)
  const [didAutoGenerate, setDidAutoGenerate] = useState(false)
  const [factCheckResult, setFactCheckResult] = useState<string | null>(null)

  // Detect context from editor content
  const detectContext = useCallback(() => {
    if (!editor) return
    const text = editor.getText()
    const entities: string[] = []
    const patterns = [
      /(?:Real Madrid|Barcelona|Bayern|Dortmund|Liverpool|Man City|Chelsea|Arsenal|Inter|Milan|Juventus|PSG|Marseille)/gi,
      /(?:Premier League|La Liga|Bundesliga|Serie A|Ligue 1|Champions League|Europa League)/gi,
      /(?:Haaland|Mbappé|Messi|Ronaldo|Vinicius|Bellingham|Saka|Salah|De Bruyne|Kane)/gi,
    ]
    for (const pattern of patterns) {
      const matches = text.match(pattern)
      if (matches) entities.push(...Array.from(new Set(matches)))
    }
    setContextEntities(Array.from(new Set(entities)))

    const newSuggestions: { text: string; action: () => void }[] = []
    if (text.length > 100 && !text.includes('Poll')) {
      newSuggestions.push({ text: 'Add a fan poll?', action: () => editor.chain().focus().insertContent({ type: 'poll' }).run() })
    }
    if (text.length > 200 && !text.includes('Stats')) {
      newSuggestions.push({ text: 'Insert stats comparison?', action: () => editor.chain().focus().insertContent({ type: 'statsTable' }).run() })
    }
    if (text.length > 100 && !text.includes('Quiz')) {
      newSuggestions.push({ text: 'Add a quiz?', action: () => editor.chain().focus().insertContent({ type: 'quiz' }).run() })
    }
    setSuggestions(newSuggestions)
  }, [editor])

  // Generate article via AI
  async function handleGenerate() {
    if (!prompt.trim() || generating) return
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/smart-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: prompt,
          category: 'Sport',
          articleType: selectedTemplate || 'report',
          mode: 'copilot',
          language: 'bs',
          wordCount,
        }),
      })
      const data = await res.json() as { error?: string; model?: string; tokensIn?: number; tokensOut?: number; title?: string; tiptapContent?: Record<string, unknown>; content?: string }
      if (!res.ok) throw new Error(data.error || 'Generation failed')

      setLastResult({ model: data.model, tokensIn: data.tokensIn, tokensOut: data.tokensOut })

      if (editor && data.tiptapContent) {
        editor.commands.setContent(data.tiptapContent)
      }

      onGenerate?.({
        title: data.title,
        content: data.tiptapContent,
        model: data.model,
        tokensIn: data.tokensIn,
        tokensOut: data.tokensOut,
      })

      detectContext()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed. Please try again.'
      setError(message)
      console.error('AI generate error:', err)
    } finally {
      setGenerating(false)
    }
  }

  // Auto-generate on mount if requested (e.g. from Newsroom "Write" button)
  useEffect(() => {
    if (autoGenerate && prefilledPrompt && !didAutoGenerate && !generating) {
      setDidAutoGenerate(true)
      handleGenerate()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, prefilledPrompt, didAutoGenerate])

  // AI action on selected text
  const handleAiAction = useCallback(async (action: typeof AI_ACTIONS[0]) => {
    if (!editor) return
    const { from, to } = editor.state.selection
    const text = editor.state.doc.textBetween(from, to)
    if (!text.trim()) {
      setError('Select some text first to use this action.')
      setTimeout(() => setError(null), 3000)
      return
    }
    setFactCheckResult(null)
    setAiLoading(action.key)
    setError(null)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'custom',
          customPrompt: `${action.prompt}\n\n"${text}"`,
          wordCount: action.key === 'extend' ? 300 : action.key === 'shorten' ? 50 : 150,
        }),
      })
      const data = await res.json() as { content?: string; text?: string; result?: string }
      const raw = typeof data.content === 'string'
        ? data.content
        : typeof data.text === 'string'
          ? data.text
          : typeof data.result === 'string'
            ? data.result
            : ''
      const output = raw.replace(/^TLDR:.*$/gm, '').trim()
      if (output) {
        if (action.key === 'factcheck') {
          setFactCheckResult(output)
        } else {
          editor.chain().focus().deleteSelection().insertContent(output).run()
        }
      } else if (!res.ok) {
        setError('AI action failed. Try again.')
      }
    } catch {
      setError('AI action failed. Try again.')
    } finally {
      setAiLoading(null)
    }
  }, [editor])

  const PLACEHOLDERS: Record<string, string> = {
    preview: 'Write match preview for [Team A] vs [Team B], [Competition], [Date]',
    report: 'Write match report for [Team A] [score] [Team B], [Competition]',
    transfer: 'Write transfer article about [Player] moving from [Club A] to [Club B]',
    analysis: 'Write tactical analysis of [Team/Match/Player]',
    rankings: 'Write rankings of [Top 10 what? e.g. strikers in Premier League 2025/26]',
    profile: 'Write player profile for [Player Name], [Club], [Position]',
  }

  function handleTemplateClick(t: typeof TEMPLATES[0]) {
    setSelectedTemplate(t.articleType)

    const editorText = editor?.getText()?.substring(0, 500) || ''
    const titleEl = typeof document !== 'undefined' ? document.querySelector<HTMLInputElement>('.ed-title-input') : null
    const articleTitle = titleEl?.value?.trim() || ''

    if (articleTitle || editorText.length > 20) {
      const context = articleTitle
        ? `about: "${articleTitle}"${editorText.length > 50 ? `. Context: ${editorText.substring(0, 300)}` : ''}`
        : `based on: ${editorText.substring(0, 300)}`
      setPrompt(`${t.prompt} ${context}`)
    } else {
      setPrompt(PLACEHOLDERS[t.articleType] ?? t.prompt)
    }
  }

  useEffect(() => {
    if (!editor) return
    const updateHandler = () => detectContext()
    editor.on('update', updateHandler)
    return () => { editor.off('update', updateHandler) }
  }, [editor, detectContext])

  return (
    <div className="ai-sb">
      <div className="ai-sb-header">
        <span className="ai-sb-title">🤖 AI Co-Pilot</span>
      </div>

      {/* Prompt section */}
      <div className="ai-sb-section">
        <textarea
          className="ai-sb-prompt"
          rows={3}
          placeholder="Describe the topic — AI will write the article"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) handleGenerate() }}
        />
        <div className="ai-sb-chips">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              className={`ai-sb-chip ${selectedTemplate === t.articleType ? 'active' : ''}`}
              onClick={() => handleTemplateClick(t)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ai-sb-gen-row">
          <select className="ai-sb-coverage" value={wordCount} onChange={(e) => setWordCount(Number(e.target.value))}>
            {COVERAGE.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <button
            className="ai-sb-gen-btn"
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
          >
            {generating ? 'Generating...' : '✨ Generate'}
          </button>
        </div>
        {error && (
          <div className="ai-sb-error">{error}</div>
        )}
      </div>

      {/* Context panel */}
      <div className="ai-sb-section">
        <div className="ai-sb-section-title">📊 Detected Context</div>
        {contextEntities.length > 0 ? (
          <div className="ai-sb-entities">
            {contextEntities.map((e) => (
              <span key={e} className="ai-sb-entity">{e}</span>
            ))}
          </div>
        ) : (
          <div className="ai-sb-empty">Start writing to detect entities automatically</div>
        )}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="ai-sb-section">
          <div className="ai-sb-section-title">💡 Suggestions</div>
          {suggestions.map((s, i) => (
            <button key={i} className="ai-sb-suggestion" onClick={s.action}>
              {s.text}
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="ai-sb-section">
        <div className="ai-sb-section-title">Actions</div>
        <div className="ai-sb-desc">Select text, then click an action</div>
        <div className="ai-sb-actions">
          {AI_ACTIONS.map((a) => (
            <button
              key={a.key}
              className={`ai-sb-action ${aiLoading === a.key ? 'loading' : ''}`}
              onClick={() => handleAiAction(a)}
              disabled={aiLoading !== null}
            >
              <span>{a.icon}</span>
              <span>{aiLoading === a.key ? 'Working...' : a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fact-check result panel */}
      {factCheckResult !== null && (
        <div className="ai-sb-section ai-sb-factcheck">
          <div className="ai-sb-section-title">🔍 Fact Check</div>
          <div className="ai-sb-factcheck-content">{factCheckResult}</div>
          <button type="button" className="ai-sb-factcheck-close" onClick={() => setFactCheckResult(null)}>
            Close
          </button>
        </div>
      )}

      {/* AI Result info */}
      {lastResult && (
        <div className="ai-sb-section ai-sb-result">
          <div className="ai-sb-result-text">
            🤖 {lastResult.model} · {lastResult.tokensIn}→{lastResult.tokensOut} tokens
          </div>
        </div>
      )}
    </div>
  )
}
