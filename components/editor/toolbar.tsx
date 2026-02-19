'use client'

import { useCallback, useRef } from 'react'
import type { Editor } from '@tiptap/react'

/* ─── Toolbar Button ─── */

function TBtn({ icon, action, active, disabled, title }: {
  icon: string; action: () => void; active?: boolean; disabled?: boolean; title: string
}) {
  return (
    <button type="button" onClick={action} disabled={disabled} title={title}
      className={`te-tb-btn ${active ? 'active' : ''}`}>
      <span className="te-tb-icon">{icon}</span>
    </button>
  )
}

/* ─── Color Picker Button ─── */

function ColorBtn({ value, onChange, title }: {
  value: string; onChange: (color: string) => void; title: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <span className="te-tb-color-wrap" title={title}>
      <button type="button" className="te-tb-btn" onClick={() => ref.current?.click()} title={title}>
        <span className="te-tb-icon" style={{ borderBottom: `3px solid ${value || '#000'}` }}>A</span>
      </button>
      <input ref={ref} type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)}
        className="te-tb-color-input" tabIndex={-1} />
    </span>
  )
}

/* ─── Separator ─── */

function Sep() { return <div className="te-tb-sep" /> }

/* ─── Main Toolbar ─── */

export function Toolbar({ editor, onOpenMediaLibrary }: { editor: Editor; onOpenMediaLibrary: () => void }) {

  const fileRef = useRef<HTMLInputElement>(null)

  const setLink = useCallback(() => {
    const prev = editor.getAttributes('link').href
    const url = window.prompt('URL', prev || 'https://')
    if (url === null) return
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const insertYoutube = useCallback(() => {
    const url = window.prompt('YouTube URL:')
    if (!url) return
    editor.commands.setYoutubeVideo({ src: url })
  }, [editor])

  const insertTable = useCallback(() => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/media', { method: 'POST', body: form })
      if (res.ok) {
        const data = await res.json() as { url?: string }
        if (data.url) editor.chain().focus().setImage({ src: data.url, alt: file.name }).run()
      }
    } catch { /* upload failed silently */ }
    e.target.value = ''
  }, [editor])

  return (
    <div className="te-toolbar">
      <div className="te-tb-row">

        {/* Group 1 — History */}
        <TBtn icon="↩" action={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Cmd+Z)" />
        <TBtn icon="↪" action={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Cmd+Shift+Z)" />

        <Sep />

        {/* Group 2 — Format */}
        <TBtn icon="B" action={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Cmd+B)" />
        <TBtn icon="I" action={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Cmd+I)" />
        <TBtn icon="U" action={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Cmd+U)" />
        <TBtn icon="S" action={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough" />
        <TBtn icon="<>" action={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline Code" />
        <TBtn icon="⊘" action={() => editor.chain().focus().unsetAllMarks().run()} title="Clear Formatting" />

        <Sep />

        {/* Group 3 — Color */}
        <ColorBtn
          value={editor.getAttributes('textStyle').color || '#000000'}
          onChange={(color) => editor.chain().focus().setColor(color).run()}
          title="Text Color"
        />
        <TBtn icon="🖍" action={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight" />

        <Sep />

        {/* Group 4 — Script */}
        <TBtn icon="x₂" action={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')} title="Subscript" />
        <TBtn icon="x²" action={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} title="Superscript" />

        <Sep />

        {/* Group 5 — Headings */}
        <TBtn icon="H1" action={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1" />
        <TBtn icon="H2" action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2" />
        <TBtn icon="H3" action={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3" />
        <TBtn icon="¶" action={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph') && !editor.isActive('heading')} title="Normal Text" />

        <Sep />

        {/* Group 6 — Align */}
        <TBtn icon="≡←" action={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left" />
        <TBtn icon="≡↔" action={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Center" />
        <TBtn icon="≡→" action={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right" />
        <TBtn icon="≡≡" action={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify" />

        <Sep />

        {/* Group 7 — Lists */}
        <TBtn icon="•" action={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List" />
        <TBtn icon="1." action={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List" />
        <TBtn icon="☑" action={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Task List" />

        <Sep />

        {/* Group 8 — Insert */}
        <TBtn icon="🔗" action={setLink} active={editor.isActive('link')} title="Insert Link (Cmd+K)" />
        <TBtn icon="🖼" action={onOpenMediaLibrary} title="Insert Image" />
        <TBtn icon="📁" action={() => fileRef.current?.click()} title="Upload Image" />
        <TBtn icon="▶" action={insertYoutube} title="YouTube Video" />
        <TBtn icon="▦" action={insertTable} title="Insert Table" />
        <TBtn icon="❝" action={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote" />
        <TBtn icon="⟨/⟩" action={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code Block" />
        <TBtn icon="—" action={() => editor.chain().focus().setHorizontalRule().run()} title="Divider" />
        <TBtn icon="⏎" action={() => editor.chain().focus().setHardBreak().run()} title="Hard Break" />

        {/* Hidden file input for image upload */}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
      </div>
    </div>
  )
}
