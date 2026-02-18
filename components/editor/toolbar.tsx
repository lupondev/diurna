'use client'

import { useCallback } from 'react'
import type { Editor } from '@tiptap/react'

function TBtn({ icon, label, action, active, disabled, title }: {
  icon: string; label?: string; action: () => void; active?: boolean; disabled?: boolean; title?: string
}) {
  return (
    <button type="button" onClick={action} disabled={disabled} title={title || label || icon}
      className={`te-tb-btn ${active ? 'active' : ''}`}>
      <span className="te-tb-icon">{icon}</span>
      {label && <span className="te-tb-label">{label}</span>}
    </button>
  )
}

function Sep() { return <div className="te-tb-sep" /> }

export function Toolbar({ editor, onOpenMediaLibrary }: { editor: Editor; onOpenMediaLibrary: () => void }) {
  const setLink = useCallback(() => {
    const prev = editor.getAttributes('link').href
    const url = window.prompt('URL', prev || 'https://')
    if (url === null) return
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const insertTable = useCallback(() => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  return (
    <div className="te-toolbar">
      {/* Row 1: Formatting */}
      <div className="te-tb-row">
        <TBtn icon="B" action={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Cmd+B)" />
        <TBtn icon="I" action={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Cmd+I)" />
        <TBtn icon="U" action={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Cmd+U)" />
        <TBtn icon="S" action={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough" />
        <Sep />
        <TBtn icon="H1" action={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1" />
        <TBtn icon="H2" action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2" />
        <TBtn icon="H3" action={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3" />
        <Sep />
        <TBtn icon="•" action={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List" />
        <TBtn icon="1." action={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List" />
        <Sep />
        <TBtn icon="🔗" action={setLink} active={editor.isActive('link')} title="Insert Link (Cmd+K)" />
        <TBtn icon="🖼" action={onOpenMediaLibrary} title="Insert Image" />
        <Sep />
        <TBtn icon="↩" action={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Cmd+Z)" />
        <TBtn icon="↪" action={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Cmd+Shift+Z)" />
      </div>
      {/* Row 2: Blocks */}
      <div className="te-tb-row te-tb-row2">
        <TBtn icon="☰" label="Left" action={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} />
        <TBtn icon="☰" label="Center" action={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} />
        <TBtn icon="☰" label="Right" action={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} />
        <Sep />
        <TBtn icon="❝" label="Quote" action={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} />
        <TBtn icon="⟨/⟩" label="Code" action={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} />
        <TBtn icon="—" label="Divider" action={() => editor.chain().focus().setHorizontalRule().run()} />
        <TBtn icon="▦" label="Table" action={insertTable} />
      </div>
    </div>
  )
}
