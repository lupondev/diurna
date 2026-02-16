'use client'

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import LinkExt from '@tiptap/extension-link'
import ImageExt from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Youtube from '@tiptap/extension-youtube'
import Highlight from '@tiptap/extension-highlight'
import { useState, useCallback, useRef, useEffect } from 'react'

interface TiptapEditorProps {
  content?: Record<string, unknown>
  onChange?: (json: Record<string, unknown>, html: string) => void
  placeholder?: string
  editable?: boolean
}

/* ─── Toolbar Button ─── */
function TBtn({
  icon, label, action, active, disabled, title,
}: {
  icon: string; label?: string; action: () => void; active?: boolean; disabled?: boolean; title?: string
}) {
  return (
    <button
      type="button"
      onClick={action}
      disabled={disabled}
      title={title || label || icon}
      className={`te-tb-btn ${active ? 'active' : ''}`}
    >
      <span className="te-tb-icon">{icon}</span>
      {label && <span className="te-tb-label">{label}</span>}
    </button>
  )
}

function Sep() { return <div className="te-tb-sep" /> }

/* ─── Row 1: Formatting Toolbar ─── */
function ToolbarRow1({ editor }: { editor: NonNullable<ReturnType<typeof useEditor>> }) {
  const setLink = useCallback(() => {
    const prev = editor.getAttributes('link').href
    const url = window.prompt('URL', prev || 'https://')
    if (url === null) return
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  return (
    <div className="te-tb-row">
      {/* Text formatting */}
      <TBtn icon="B" action={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold" />
      <TBtn icon="I" action={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic" />
      <TBtn icon="U" action={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline" />
      <TBtn icon="S" action={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough" />

      <Sep />

      {/* Headings */}
      <TBtn icon="H1" action={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1" />
      <TBtn icon="H2" action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2" />
      <TBtn icon="H3" action={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3" />
      <TBtn icon="P" action={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph') && !editor.isActive('heading')} title="Paragraph" />

      <Sep />

      {/* Blockquote & Code */}
      <TBtn icon="❝" action={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote" />
      <TBtn icon="⟨/⟩" action={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code Block" />

      <Sep />

      {/* Alignment */}
      <TBtn icon="☰" action={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left" />
      <TBtn icon="☰" action={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Center" />
      <TBtn icon="☰" action={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right" />

      <Sep />

      {/* Lists */}
      <TBtn icon="1." action={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered List" />
      <TBtn icon="•" action={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List" />

      <Sep />

      {/* Link */}
      <TBtn icon="🔗" action={setLink} active={editor.isActive('link')} title="Insert Link" />
      {editor.isActive('link') && (
        <TBtn icon="✂" action={() => editor.chain().focus().unsetLink().run()} title="Unlink" />
      )}

      <Sep />

      {/* Undo / Redo */}
      <TBtn icon="↩" action={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo" />
      <TBtn icon="↪" action={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo" />
    </div>
  )
}

/* ─── Row 2: Content Blocks Toolbar ─── */
function ToolbarRow2({
  editor,
  onOpenMediaLibrary,
}: {
  editor: NonNullable<ReturnType<typeof useEditor>>
  onOpenMediaLibrary: () => void
}) {
  const insertYoutube = useCallback(() => {
    const url = window.prompt('Paste YouTube or video URL')
    if (!url) return
    editor.chain().focus().setYoutubeVideo({ src: url }).run()
  }, [editor])

  const insertTable = useCallback(() => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  const insertCallout = useCallback((type: 'info' | 'warning' | 'tip') => {
    const colors = { info: '#e0f2fe', warning: '#fef3c7', tip: '#d1fae5' }
    const icons = { info: 'ℹ️', warning: '⚠️', tip: '💡' }
    editor.chain().focus().insertContent({
      type: 'blockquote',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: `${icons[type]} ${type.charAt(0).toUpperCase() + type.slice(1)}: Your text here` }] }],
    }).run()
    // Highlight the blockquote for visual distinction
    editor.chain().focus().toggleHighlight({ color: colors[type] }).run()
  }, [editor])

  const insertSocialEmbed = useCallback(() => {
    const url = window.prompt('Paste tweet or Instagram URL')
    if (!url) return
    editor.chain().focus().insertContent({
      type: 'paragraph',
      content: [{ type: 'text', marks: [{ type: 'link', attrs: { href: url, target: '_blank' } }], text: `[Social Embed: ${url}]` }],
    }).run()
  }, [editor])

  const insertPoll = useCallback(() => {
    editor.chain().focus().insertContent({
      type: 'blockquote',
      content: [
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '📊 Poll: Your question here?' }] },
        { type: 'bulletList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Option A' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Option B' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Option C' }] }] },
        ]},
      ],
    }).run()
  }, [editor])

  const insertQuiz = useCallback(() => {
    editor.chain().focus().insertContent({
      type: 'blockquote',
      content: [
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '🧠 Quiz: Your question here?' }] },
        { type: 'orderedList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Answer A' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Answer B' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Answer C (correct)' }] }] },
        ]},
      ],
    }).run()
  }, [editor])

  const insertSurvey = useCallback(() => {
    editor.chain().focus().insertContent({
      type: 'blockquote',
      content: [
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '📋 Survey: Rate this article' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '⭐⭐⭐⭐⭐ (1-5 stars)' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Feedback: ...' }] },
      ],
    }).run()
  }, [editor])

  const insertWidget = useCallback(() => {
    const widgetId = window.prompt('Enter Football Widget ID or name')
    if (!widgetId) return
    editor.chain().focus().insertContent({
      type: 'paragraph',
      content: [{ type: 'text', text: `[Football Widget: ${widgetId}]` }],
    }).run()
  }, [editor])

  return (
    <div className="te-tb-row te-tb-row2">
      <TBtn icon="🖼" label="Image" action={onOpenMediaLibrary} title="Insert Image from Media Library" />
      <TBtn icon="▶" label="Video" action={insertYoutube} title="Embed YouTube/Video" />
      <TBtn icon="📊" label="Poll" action={insertPoll} title="Insert Poll Block" />
      <TBtn icon="🧠" label="Quiz" action={insertQuiz} title="Insert Quiz Block" />
      <TBtn icon="📋" label="Survey" action={insertSurvey} title="Insert Survey Block" />
      <TBtn icon="⚽" label="Widget" action={insertWidget} title="Embed Football Widget" />
      <TBtn icon="▦" label="Table" action={insertTable} title="Insert Table" />
      <TBtn icon="—" label="Divider" action={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule" />
      <TBtn icon="💡" label="Callout" action={() => insertCallout('tip')} title="Callout Box" />
      <TBtn icon="🌐" label="Social" action={insertSocialEmbed} title="Embed Social Post" />
    </div>
  )
}

/* ─── Floating Bubble Menu ─── */
function FloatingToolbar({ editor }: { editor: NonNullable<ReturnType<typeof useEditor>> }) {
  const setLink = useCallback(() => {
    const prev = editor.getAttributes('link').href
    const url = window.prompt('URL', prev || 'https://')
    if (url === null) return
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const aiRephrase = useCallback(async () => {
    const { from, to } = editor.state.selection
    const text = editor.state.doc.textBetween(from, to)
    if (!text.trim()) return
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'custom', customPrompt: `Rephrase this text concisely, return ONLY the rephrased text with no preamble: "${text}"`, wordCount: 100 }),
      })
      const data = await res.json()
      if (data.content) {
        editor.chain().focus().deleteSelection().insertContent(data.content.trim()).run()
      }
    } catch { /* noop */ }
  }, [editor])

  return (
    <BubbleMenu editor={editor} tippyOptions={{ duration: 150, placement: 'top' }} className="te-bubble">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'active' : ''}>B</button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'active' : ''}>I</button>
      <button type="button" onClick={setLink} className={editor.isActive('link') ? 'active' : ''}>🔗</button>
      <button type="button" onClick={() => editor.chain().focus().toggleHighlight().run()} className={editor.isActive('highlight') ? 'active' : ''}>🖍</button>
      <div className="te-bubble-sep" />
      <button type="button" onClick={aiRephrase} className="te-bubble-ai">AI Rephrase</button>
    </BubbleMenu>
  )
}

/* ─── Right Sidebar Panel ─── */
function EditorSidebar({
  editor,
  onOpenMediaLibrary,
}: {
  editor: NonNullable<ReturnType<typeof useEditor>>
  onOpenMediaLibrary: () => void
}) {
  const [aiLoading, setAiLoading] = useState<string | null>(null)

  const aiAction = useCallback(async (action: string) => {
    const { from, to } = editor.state.selection
    const text = editor.state.doc.textBetween(from, to)
    if (!text.trim()) {
      alert('Select some text first to use AI assist.')
      return
    }
    setAiLoading(action)
    const prompts: Record<string, string> = {
      rephrase: `Rephrase this text in a different way, keeping the same meaning. Return ONLY the rephrased text: "${text}"`,
      shorten: `Shorten this text to be more concise while keeping the key points. Return ONLY the shortened text: "${text}"`,
      expand: `Expand this text with more detail, examples, and context. Return ONLY the expanded text: "${text}"`,
      translate: `Translate this text to English (if already English, translate to Bosnian). Return ONLY the translated text: "${text}"`,
      stats: `Add relevant statistics and data points to enhance this text. Return the text with stats woven in naturally: "${text}"`,
    }
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'custom', customPrompt: prompts[action], wordCount: 200 }),
      })
      const data = await res.json()
      if (data.content) {
        editor.chain().focus().deleteSelection().insertContent(data.content.trim()).run()
      }
    } catch { /* noop */ } finally { setAiLoading(null) }
  }, [editor])

  const contentBlocks = [
    { icon: '🖼', label: 'Image', action: onOpenMediaLibrary },
    { icon: '▶', label: 'Video', action: () => { const url = window.prompt('YouTube URL'); if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run() } },
    { icon: '▦', label: 'Table', action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { icon: '—', label: 'Divider', action: () => editor.chain().focus().setHorizontalRule().run() },
    { icon: '📊', label: 'Poll', action: () => editor.chain().focus().insertContent({ type: 'blockquote', content: [{ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '📊 Poll' }] }] }).run() },
    { icon: '🧠', label: 'Quiz', action: () => editor.chain().focus().insertContent({ type: 'blockquote', content: [{ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '🧠 Quiz' }] }] }).run() },
  ]

  const aiButtons = [
    { icon: '🔄', label: 'Rephrase', key: 'rephrase' },
    { icon: '✂', label: 'Shorten', key: 'shorten' },
    { icon: '📝', label: 'Expand', key: 'expand' },
    { icon: '🌐', label: 'Translate', key: 'translate' },
    { icon: '📊', label: 'Add Stats', key: 'stats' },
  ]

  return (
    <div className="te-sidebar">
      {/* Content Blocks */}
      <div className="te-sb-section">
        <div className="te-sb-title">Content Blocks</div>
        <div className="te-sb-grid">
          {contentBlocks.map((b) => (
            <button key={b.label} type="button" className="te-sb-block" onClick={b.action}>
              <span className="te-sb-block-icon">{b.icon}</span>
              <span className="te-sb-block-label">{b.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* AI Assist */}
      <div className="te-sb-section">
        <div className="te-sb-title">AI Assist</div>
        <div className="te-sb-desc">Select text, then click an action</div>
        <div className="te-sb-ai-list">
          {aiButtons.map((b) => (
            <button
              key={b.key}
              type="button"
              className={`te-sb-ai-btn ${aiLoading === b.key ? 'loading' : ''}`}
              onClick={() => aiAction(b.key)}
              disabled={aiLoading !== null}
            >
              <span>{b.icon}</span>
              <span>{aiLoading === b.key ? 'Working...' : b.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Unsplash Image Result ─── */
interface UnsplashImage {
  id: string
  small: string
  regular: string
  alt: string
  author: string
  authorUrl: string
}

/* ─── Media Library Modal with Unsplash Search ─── */
function MediaLibraryModal({
  onClose,
  onSelect,
}: {
  onClose: () => void
  onSelect: (url: string, alt: string) => void
}) {
  const [tab, setTab] = useState<'upload' | 'search'>('upload')
  const [media, setMedia] = useState<Array<{ id: string; url: string; filename: string; alt?: string | null }>>([])
  const [loading, setLoading] = useState(true)

  // Unsplash search state
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UnsplashImage[]>([])
  const [searching, setSearching] = useState(false)
  const [searchPage, setSearchPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/media')
      .then((r) => r.json())
      .then((data) => { setMedia(Array.isArray(data) ? data : data.media || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'search' && searchRef.current) {
      searchRef.current.focus()
    }
  }, [tab])

  async function handleSearch(page = 1) {
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/images/search?query=${encodeURIComponent(query)}&page=${page}`)
      const data = await res.json()
      if (res.ok) {
        setSearchResults(page === 1 ? data.results : [...searchResults, ...data.results])
        setSearchPage(page)
        setTotalPages(data.totalPages)
      }
    } catch { /* noop */ }
    finally { setSearching(false) }
  }

  function handleUnsplashSelect(img: UnsplashImage) {
    const attribution = `Photo by ${img.author} on Unsplash`
    onSelect(img.regular, attribution)
  }

  return (
    <div className="ed-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ed-modal" style={{ width: 700 }}>
        <div className="ed-modal-head">
          <div className="ed-modal-title">Insert Image</div>
          <button className="ed-modal-close" onClick={onClose}>x</button>
        </div>

        {/* Tabs */}
        <div className="te-img-tabs">
          <button type="button" className={`te-img-tab ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>Media Library</button>
          <button type="button" className={`te-img-tab ${tab === 'search' ? 'active' : ''}`} onClick={() => setTab('search')}>Unsplash Search</button>
        </div>

        <div className="ed-modal-body">
          {/* Upload tab */}
          {tab === 'upload' && (
            <>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--g400)' }}>Loading media...</div>
              ) : media.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--g400)' }}>No media files. Upload images in the Media Library first.</div>
              ) : (
                <div className="te-media-grid">
                  {media.map((m) => (
                    <button key={m.id} type="button" className="te-media-item" onClick={() => onSelect(m.url, m.alt || m.filename)}>
                      <img src={m.url} alt={m.alt || m.filename} />
                      <div className="te-media-name">{m.filename}</div>
                    </button>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <button type="button" className="ed-btn ed-btn-secondary" onClick={() => { const url = window.prompt('Or paste an image URL directly'); if (url) onSelect(url, '') }}>
                  Paste URL instead
                </button>
              </div>
            </>
          )}

          {/* Unsplash search tab */}
          {tab === 'search' && (
            <>
              <div className="te-unsplash-search">
                <input
                  ref={searchRef}
                  type="text"
                  className="te-unsplash-input"
                  placeholder="Search Unsplash photos..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(1) }}
                />
                <button type="button" className="te-unsplash-search-btn" onClick={() => handleSearch(1)} disabled={searching || !query.trim()}>
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>

              {searchResults.length > 0 ? (
                <>
                  <div className="te-unsplash-grid">
                    {searchResults.map((img) => (
                      <button key={img.id} type="button" className="te-unsplash-item" onClick={() => handleUnsplashSelect(img)}>
                        <img src={img.small} alt={img.alt} loading="lazy" />
                        <div className="te-unsplash-credit">
                          <span className="te-unsplash-author">{img.author}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {searchPage < totalPages && (
                    <div style={{ textAlign: 'center', marginTop: 12 }}>
                      <button type="button" className="ed-btn ed-btn-secondary" onClick={() => handleSearch(searchPage + 1)} disabled={searching}>
                        {searching ? 'Loading...' : 'Load More'}
                      </button>
                    </div>
                  )}
                  <div className="te-unsplash-attribution">
                    Photos provided by <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer">Unsplash</a>
                  </div>
                </>
              ) : !searching && query && searchResults.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--g400)' }}>No results found. Try a different search term.</div>
              ) : !query ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--g400)' }}>Search for free, high-quality photos from Unsplash.</div>
              ) : null}

              {searching && searchResults.length === 0 && (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--g400)' }}>Searching...</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Main Editor Component ─── */
export default function TiptapEditor({
  content,
  onChange,
  placeholder = 'Start writing your article...',
  editable = true,
}: TiptapEditorProps) {
  const [focusMode, setFocusMode] = useState(false)
  const [showMediaLibrary, setShowMediaLibrary] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const wrapRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
      LinkExt.configure({ openOnClick: false }),
      ImageExt,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Youtube.configure({ inline: false, ccLanguage: 'en' }),
      Highlight.configure({ multicolor: true }),
    ],
    content: content || undefined,
    editable,
    editorProps: {
      attributes: {
        class: 'te-prose',
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange?.(e.getJSON() as Record<string, unknown>, e.getHTML())
    },
  })

  const wordCount = editor?.storage.characterCount?.words() || 0
  const charCount = editor?.storage.characterCount?.characters() || 0
  const readingTime = Math.max(1, Math.ceil(wordCount / 238))

  // Focus mode: toggle fullscreen
  const toggleFocus = useCallback(() => {
    setFocusMode((prev) => {
      const next = !prev
      if (next) setShowSidebar(false)
      return next
    })
  }, [])

  // Escape exits focus mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusMode) setFocusMode(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [focusMode])

  const handleImageSelect = useCallback((url: string, alt: string) => {
    if (editor) {
      editor.chain().focus().setImage({ src: url, alt }).run()
      // If alt contains Unsplash attribution, add it as caption text
      if (alt && alt.includes('on Unsplash')) {
        editor.chain().focus().createParagraphNear().insertContent({
          type: 'paragraph',
          content: [{ type: 'text', marks: [{ type: 'italic' }], text: alt }],
        }).run()
      }
    }
    setShowMediaLibrary(false)
  }, [editor])

  if (!editor) {
    return <div className="te-loading" />
  }

  return (
    <>
      <div ref={wrapRef} className={`te-wrap ${focusMode ? 'te-focus-mode' : ''}`}>
        {/* Toolbar */}
        <div className="te-toolbar">
          <ToolbarRow1 editor={editor} />
          <ToolbarRow2 editor={editor} onOpenMediaLibrary={() => setShowMediaLibrary(true)} />
        </div>

        {/* Editor + Sidebar layout */}
        <div className="te-body">
          <div className="te-editor-area">
            {/* Floating toolbar on text selection */}
            <FloatingToolbar editor={editor} />
            <EditorContent editor={editor} />
          </div>

          {showSidebar && !focusMode && (
            <EditorSidebar editor={editor} onOpenMediaLibrary={() => setShowMediaLibrary(true)} />
          )}
        </div>

        {/* Status bar */}
        <div className="te-status">
          <div className="te-status-left">
            <span>{wordCount} words</span>
            <span className="te-status-sep">·</span>
            <span>{charCount} chars</span>
            <span className="te-status-sep">·</span>
            <span>{readingTime} min read</span>
          </div>
          <div className="te-status-right">
            <button type="button" className="te-status-btn" onClick={() => setShowSidebar(!showSidebar)} title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}>
              {showSidebar ? '◨' : '◧'} Panel
            </button>
            <button type="button" className={`te-status-btn ${focusMode ? 'active' : ''}`} onClick={toggleFocus} title="Focus Mode (Esc to exit)">
              ⛶ Focus
            </button>
          </div>
        </div>
      </div>

      {/* Media Library Modal */}
      {showMediaLibrary && (
        <MediaLibraryModal
          onClose={() => setShowMediaLibrary(false)}
          onSelect={handleImageSelect}
        />
      )}
    </>
  )
}
