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
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Typography from '@tiptap/extension-typography'
import { useState, useCallback, useRef, useEffect } from 'react'

import { Toolbar } from './toolbar'
import { PollBlock } from './blocks/poll-block'
import { QuizBlock } from './blocks/quiz-block'
import { StatsTableBlock } from './blocks/stats-table-block'
import { PlayerCardBlock } from './blocks/player-card-block'
import { MatchWidgetBlock } from './blocks/match-widget-block'
import { VideoBlock } from './blocks/video-block'
import { GalleryBlock } from './blocks/gallery-block'
import { SocialEmbedBlock } from './blocks/social-embed-block'

interface TiptapEditorProps {
  content?: Record<string, unknown>
  onChange?: (json: Record<string, unknown>) => void
  onEditorReady?: (editor: ReturnType<typeof useEditor>) => void
  placeholder?: string
  editable?: boolean
}

interface UnsplashImage {
  id: string; small: string; regular: string; alt: string; author: string; authorUrl: string
}

interface MediaItem {
  id: string
  url: string
  filename: string
  alt?: string | null
}

interface MediaApiResponse {
  media?: MediaItem[]
}

interface ImageSearchResponse {
  results: UnsplashImage[]
  totalPages: number
}

const BLOCK_TYPES = [
  { name: 'poll', icon: '🗳️', label: 'Poll' },
  { name: 'quiz', icon: '🧠', label: 'Quiz' },
  { name: 'statsTable', icon: '📊', label: 'Stats Table' },
  { name: 'playerCard', icon: '👤', label: 'Player Card' },
  { name: 'matchWidget', icon: '⚽', label: 'Match Widget' },
  { name: 'video', icon: '▶️', label: 'Video' },
  { name: 'gallery', icon: '📸', label: 'Gallery' },
  { name: 'socialEmbed', icon: '🌐', label: 'Social Embed' },
]

const BLOCK_DEFAULTS: Record<string, Record<string, unknown>> = {
  poll: { question: 'Your question here?', options: ['Option A', 'Option B', 'Option C'] },
  quiz: { questions: [{ q: 'Question?', options: ['Answer A', 'Answer B', 'Answer C', 'Answer D'], correct: 0 }] },
  statsTable: {},
  playerCard: {},
  matchWidget: {},
  video: {},
  gallery: {},
  socialEmbed: {},
}

function MediaLibraryModal({ onClose, onSelect }: {
  onClose: () => void
  onSelect: (url: string, alt: string) => void
}) {
  const [tab, setTab] = useState<'upload' | 'search'>('upload')
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UnsplashImage[]>([])
  const [searching, setSearching] = useState(false)
  const [searchPage, setSearchPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/media').then((r) => r.json() as Promise<MediaItem[] | MediaApiResponse>)
      .then((data) => { setMedia(Array.isArray(data) ? data : data.media || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'search' && searchRef.current) searchRef.current.focus()
  }, [tab])

  async function handleSearch(page = 1) {
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/images/search?query=${encodeURIComponent(query)}&page=${page}`)
      const data = await res.json() as ImageSearchResponse
      if (res.ok) {
        setSearchResults(page === 1 ? data.results : [...searchResults, ...data.results])
        setSearchPage(page)
        setTotalPages(data.totalPages)
      }
    } catch {} finally { setSearching(false) }
  }

  return (
    <div className="ed-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ed-modal" style={{ width: 700 }}>
        <div className="ed-modal-head">
          <div className="ed-modal-title">Insert Image</div>
          <button className="ed-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="te-img-tabs">
          <button type="button" className={`te-img-tab ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>Media Library</button>
          <button type="button" className={`te-img-tab ${tab === 'search' ? 'active' : ''}`} onClick={() => setTab('search')}>Unsplash Search</button>
        </div>
        <div className="ed-modal-body">
          {tab === 'upload' && (
            <>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--g400)' }}>Loading media...</div>
              ) : media.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--g400)' }}>No media files yet.</div>
              ) : (
                <div className="te-media-grid">
                  {media.map((m) => (
                    <button key={m.id} type="button" className="te-media-item" onClick={() => onSelect(m.url, m.alt || m.filename)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.url} alt={m.alt || m.filename} />
                      <div className="te-media-name">{m.filename}</div>
                    </button>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <button type="button" className="ed-btn ed-btn-secondary" onClick={() => { const url = window.prompt('Paste image URL'); if (url) onSelect(url, '') }}>
                  Paste URL instead
                </button>
              </div>
            </>
          )}
          {tab === 'search' && (
            <>
              <div className="te-unsplash-search">
                <input ref={searchRef} type="text" className="te-unsplash-input" placeholder="Search Unsplash..."
                  value={query} onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(1) }} />
                <button type="button" className="te-unsplash-search-btn" onClick={() => handleSearch(1)} disabled={searching || !query.trim()}>
                  {searching ? '...' : 'Search'}
                </button>
              </div>
              {searchResults.length > 0 && (
                <>
                  <div className="te-unsplash-grid">
                    {searchResults.map((img) => (
                      <button key={img.id} type="button" className="te-unsplash-item" onClick={() => onSelect(img.regular, `Photo by ${img.author} on Unsplash`)}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.small} alt={img.alt} loading="lazy" />
                        <div className="te-unsplash-credit"><span className="te-unsplash-author">{img.author}</span></div>
                      </button>
                    ))}
                  </div>
                  {searchPage < totalPages && (
                    <div style={{ textAlign: 'center', marginTop: 12 }}>
                      <button type="button" className="ed-btn ed-btn-secondary" onClick={() => handleSearch(searchPage + 1)} disabled={searching}>Load More</button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TiptapEditor({
  content,
  onChange,
  onEditorReady,
  placeholder = 'Start writing your article...',
  editable = true,
}: TiptapEditorProps) {
  const [showMediaLibrary, setShowMediaLibrary] = useState(false)
  const [showAddBlock, setShowAddBlock] = useState(false)
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashFilter, setSlashFilter] = useState('')
  const [slashCoords, setSlashCoords] = useState<{ top: number; left: number } | null>(null)
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0)
  const slashListRef = useRef<HTMLDivElement>(null)
  const slashOpenRef = useRef(false)
  const slashSelectedIndexRef = useRef(0)
  slashOpenRef.current = slashOpen
  slashSelectedIndexRef.current = slashSelectedIndex

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
      LinkExt.configure({ openOnClick: false }),
      ImageExt,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
      Youtube.configure({ width: 640, height: 360 }),
      Typography,
      PollBlock, QuizBlock, StatsTableBlock, PlayerCardBlock,
      MatchWidgetBlock, VideoBlock, GalleryBlock, SocialEmbedBlock,
    ],
    content: content || undefined,
    editable,
    editorProps: {
      attributes: { class: 'te-prose' },
      handleKeyDown: (_view, event) => {
        if (!slashOpenRef.current) return false
        if (event.key === 'Escape') {
          setSlashOpen(false)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSlashSelectedIndex((i) => {
            const n = slashListRef.current?.querySelectorAll('[data-slash-item]').length ?? 1
            return Math.min(i + 1, n - 1)
          })
          return true
        }
        if (event.key === 'ArrowUp') {
          setSlashSelectedIndex((i) => Math.max(0, i - 1))
          return true
        }
        if (event.key === 'Enter') {
          const items = slashListRef.current?.querySelectorAll('[data-slash-item]')
          const btn = items?.[slashSelectedIndexRef.current] as HTMLButtonElement | undefined
          if (btn) { btn.click(); return true }
          return false
        }
        return false
      },
    },
    // Task 10: only emit JSON, skip HTML generation
    onUpdate: ({ editor: e }) => {
      onChange?.(e.getJSON() as Record<string, unknown>)
    },
    onCreate: ({ editor: e }) => {
      onEditorReady?.(e as ReturnType<typeof useEditor>)
    },
  })

  const wordCount = editor?.storage.characterCount?.words?.() ?? 0
  const charCount = editor?.storage.characterCount?.characters?.() ?? 0
  // Task 11: reading time
  const readingTime = Math.max(1, Math.ceil(wordCount / 200))

  // Slash command: show menu when paragraph starts with "/"
  useEffect(() => {
    if (!editor) return
    const updateSlash = () => {
      const { state, view } = editor
      const { selection } = state
      const { $from } = selection
      const node = $from.parent
      if (node.type.name !== 'paragraph' || !node.textContent) {
        setSlashOpen(false)
        return
      }
      const fromStart = $from.start()
      const toCursor = selection.from
      const textFromStart = state.doc.textBetween(fromStart, toCursor)
      if (!textFromStart.startsWith('/')) {
        setSlashOpen(false)
        return
      }
      const filter = textFromStart.slice(1).toLowerCase()
      try {
        const coords = view.coordsAtPos(selection.from)
        setSlashCoords({ top: coords.bottom + 4, left: coords.left })
        setSlashFilter(filter)
        setSlashSelectedIndex(0)
        setSlashOpen(true)
      } catch {
        setSlashOpen(false)
      }
    }
    editor.on('selectionUpdate', updateSlash)
    editor.on('transaction', updateSlash)
    return () => {
      editor.off('selectionUpdate', updateSlash)
      editor.off('transaction', updateSlash)
    }
  }, [editor])

  const slashFiltered = BLOCK_TYPES.filter(
    (b) =>
      !slashFilter ||
      b.name.toLowerCase().includes(slashFilter) ||
      b.label.toLowerCase().includes(slashFilter)
  )

  useEffect(() => {
    setSlashSelectedIndex((i) => Math.min(i, Math.max(0, slashFiltered.length - 1)))
  }, [slashFiltered.length])

  // Click outside to close slash menu
  useEffect(() => {
    if (!slashOpen) return
    const close = (e: MouseEvent) => {
      const target = e.target as Node
      if (slashListRef.current?.contains(target)) return
      const editorEl = editor?.view.dom
      if (editorEl?.contains(target)) return
      setSlashOpen(false)
    }
    document.addEventListener('mousedown', close, true)
    return () => document.removeEventListener('mousedown', close, true)
  }, [slashOpen, editor])

  // Keyboard shortcuts
  useEffect(() => {
    if (!editor) return
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const prev = editor.getAttributes('link').href
        const url = window.prompt('URL', prev || 'https://')
        if (url === null) return
        if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [editor])

  const handleImageSelect = useCallback((url: string, alt: string) => {
    if (editor) {
      editor.chain().focus().setImage({ src: url, alt }).run()
    }
    setShowMediaLibrary(false)
  }, [editor])

  const insertBlock = useCallback((type: string) => {
    if (!editor) return
    editor.chain().focus().insertContent({
      type,
      attrs: BLOCK_DEFAULTS[type] ?? {},
    }).run()
    setShowAddBlock(false)
  }, [editor])

  const insertBlockAtSlash = useCallback((type: string) => {
    if (!editor) return
    const { state } = editor
    const { selection } = state
    const { $from } = selection
    if ($from.parent.type.name !== 'paragraph') return
    const from = $from.before()
    const to = $from.after()
    editor.chain().focus()
      .deleteRange({ from, to })
      .insertContentAt(from, { type, attrs: BLOCK_DEFAULTS[type] ?? {} })
      .run()
    setSlashOpen(false)
  }, [editor])

  // Task 9: BubbleMenu link helper
  const bubbleSetLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href
    const url = window.prompt('URL', prev || 'https://')
    if (url === null) return
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) return <div className="te-loading" />

  return (
    <>
      <div className="te-wrap">
        <Toolbar editor={editor} onOpenMediaLibrary={() => setShowMediaLibrary(true)} />

        <div className="te-body">
          <div className="te-editor-area">
            {/* Task 9: Enhanced BubbleMenu with Underline, Strike, H2, H3 */}
            <BubbleMenu editor={editor} tippyOptions={{ duration: 150, placement: 'top' }} className="te-bubble">
              <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'active' : ''} title="Bold">B</button>
              <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'active' : ''} title="Italic"><em>I</em></button>
              <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? 'active' : ''} title="Underline"><u>U</u></button>
              <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'active' : ''} title="Strikethrough"><s>S</s></button>
              <span className="te-bubble-sep" />
              <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'active' : ''} title="Heading 2">H2</button>
              <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive('heading', { level: 3 }) ? 'active' : ''} title="Heading 3">H3</button>
              <span className="te-bubble-sep" />
              <button type="button" onClick={bubbleSetLink} className={editor.isActive('link') ? 'active' : ''} title="Link">🔗</button>
              <button type="button" onClick={() => editor.chain().focus().toggleHighlight().run()} className={editor.isActive('highlight') ? 'active' : ''} title="Highlight">🖍</button>
            </BubbleMenu>
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Add Block Button */}
        <div className="te-add-block-wrap">
          <button className="te-add-block-btn" onClick={() => setShowAddBlock(!showAddBlock)} title="Add content block">
            +
          </button>
          {showAddBlock && (
            <div className="te-add-block-menu">
              {BLOCK_TYPES.map((b) => (
                <button key={b.name} className="te-add-block-item" onClick={() => insertBlock(b.name)}>
                  <span>{b.icon}</span>
                  <span>{b.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Task 11: Reading time + word/char count */}
        {editor && (
          <div className="te-footer">
            <span className="te-footer-stats">
              {wordCount} riječi · {charCount} znakova · ~{readingTime} min čitanja
            </span>
          </div>
        )}
      </div>

      {showMediaLibrary && (
        <MediaLibraryModal
          onClose={() => setShowMediaLibrary(false)}
          onSelect={handleImageSelect}
        />
      )}

      {/* Slash command menu */}
      {slashOpen && slashCoords && (
        <div
          ref={slashListRef}
          className="te-slash-menu"
          style={{ position: 'fixed', top: slashCoords.top, left: slashCoords.left, zIndex: 100 }}
          role="listbox"
        >
          <div className="te-slash-menu-title">Insert block</div>
          {slashFiltered.length === 0 ? (
            <div className="te-slash-menu-empty">No matching blocks</div>
          ) : (
            slashFiltered.map((b, i) => (
              <button
                key={b.name}
                type="button"
                data-slash-item
                role="option"
                aria-selected={i === slashSelectedIndex}
                className={`te-slash-menu-item ${i === slashSelectedIndex ? 'selected' : ''}`}
                onClick={() => insertBlockAtSlash(b.name)}
                onMouseEnter={() => setSlashSelectedIndex(i)}
              >
                <span>{b.icon}</span>
                <span>{b.label}</span>
              </button>
            ))
          )}
        </div>
      )}
    </>
  )
}
