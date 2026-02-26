'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import type { Editor } from '@tiptap/react'

interface ToolbarProps {
  editor: Editor
  onOpenMediaLibrary: () => void
  onOpenLink?: () => void
  onOpenYoutube?: () => void
}

function AlignLeftIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="1" y1="3" x2="15" y2="3"/><line x1="1" y1="6.5" x2="10" y2="6.5"/><line x1="1" y1="10" x2="15" y2="10"/><line x1="1" y1="13.5" x2="10" y2="13.5"/></svg>
}
function AlignCenterIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="1" y1="3" x2="15" y2="3"/><line x1="3" y1="6.5" x2="13" y2="6.5"/><line x1="1" y1="10" x2="15" y2="10"/><line x1="3" y1="13.5" x2="13" y2="13.5"/></svg>
}
function AlignRightIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="1" y1="3" x2="15" y2="3"/><line x1="6" y1="6.5" x2="15" y2="6.5"/><line x1="1" y1="10" x2="15" y2="10"/><line x1="6" y1="13.5" x2="15" y2="13.5"/></svg>
}
function AlignJustifyIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="1" y1="3" x2="15" y2="3"/><line x1="1" y1="6.5" x2="15" y2="6.5"/><line x1="1" y1="10" x2="15" y2="10"/><line x1="1" y1="13.5" x2="15" y2="13.5"/></svg>
}

export function Toolbar({ editor, onOpenMediaLibrary, onOpenLink, onOpenYoutube }: ToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const overflowRef = useRef<HTMLDivElement>(null)
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    if (!showMore) return
    const close = (e: MouseEvent) => {
      const target = e.target as Node
      if (overflowRef.current?.contains(target)) return
      setShowMore(false)
    }
    document.addEventListener('mousedown', close, true)
    return () => document.removeEventListener('mousedown', close, true)
  }, [showMore])

  const setLink = useCallback(() => {
    if (onOpenLink) {
      onOpenLink()
    } else {
      const prev = editor.getAttributes('link').href
      const url = window.prompt('URL', prev || 'https://')
      if (url === null) return
      if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }, [editor, onOpenLink])

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

  const tbBtn = (active: boolean | undefined) =>
    `px-2 py-1 rounded text-sm font-medium flex-shrink-0 transition-colors ${
      active ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
    } disabled:opacity-30 disabled:cursor-not-allowed`

  return (
    <div className="te-toolbar sticky top-0 z-10 bg-white border-b border-gray-200">
      <div className="te-tb-row flex items-center gap-0.5 px-2 py-1 overflow-x-auto flex-nowrap">

        {/* Group 1: History */}
        <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo" className={tbBtn(false)}>↩</button>
        <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo" className={tbBtn(false)}>↪</button>
        <span className="toolbar-divider" />

        {/* Group 2: Inline format */}
        <button onClick={() => editor.chain().focus().toggleBold().run()} title="Bold" className={tbBtn(editor.isActive('bold'))}>B</button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic" className={tbBtn(editor.isActive('italic'))}><i>I</i></button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline" className={tbBtn(editor.isActive('underline'))}><u>U</u></button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough" className={tbBtn(editor.isActive('strike'))}><s>S</s></button>
        <span className="toolbar-divider" />

        {/* Group 3: Headings */}
        <button onClick={() => editor.chain().focus().setParagraph().run()} title="Paragraph" className={tbBtn(editor.isActive('paragraph'))}>¶</button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1" className={tbBtn(editor.isActive('heading', { level: 1 }))}>H1</button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2" className={tbBtn(editor.isActive('heading', { level: 2 }))}>H2</button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3" className={tbBtn(editor.isActive('heading', { level: 3 }))}>H3</button>
        <span className="toolbar-divider" />

        {/* Group 4: Align */}
        <button onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align left" className={tbBtn(editor.isActive({ textAlign: 'left' }))}><AlignLeftIcon /></button>
        <button onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align center" className={tbBtn(editor.isActive({ textAlign: 'center' }))}><AlignCenterIcon /></button>
        <button onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align right" className={tbBtn(editor.isActive({ textAlign: 'right' }))}><AlignRightIcon /></button>
        <button onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="Justify" className={tbBtn(editor.isActive({ textAlign: 'justify' }))}><AlignJustifyIcon /></button>
        <span className="toolbar-divider" />

        {/* Group 5: Lists */}
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list" className={tbBtn(editor.isActive('bulletList'))}>•</button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered list" className={tbBtn(editor.isActive('orderedList'))}>1.</button>
        <span className="toolbar-divider" />

        {/* Group 6: Insert */}
        <button onClick={setLink} title="Link" className={tbBtn(editor.isActive('link'))}>🔗</button>
        <button onClick={onOpenMediaLibrary} title="Insert Image" className={tbBtn(false)}>🖼</button>
        <button onClick={() => fileRef.current?.click()} title="Upload Image" className={tbBtn(false)}>📁</button>
        <button onClick={onOpenYoutube ?? (() => { const url = prompt('YouTube URL:'); if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run() })} title="YouTube" className={tbBtn(false)}>▶</button>
        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote" className={tbBtn(editor.isActive('blockquote'))}>❝</button>
        <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code block" className={tbBtn(editor.isActive('codeBlock'))}>{'</>'}</button>
        <span className="toolbar-divider" />

        {/* Group 7: Table & Divider */}
        <button onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider" className={tbBtn(false)}>—</button>
        <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Table" className={tbBtn(false)}>▦</button>

        {/* Overflow: more formatting */}
        <span className="toolbar-divider" />
        <div className="toolbar-overflow" ref={overflowRef}>
          <button type="button" onClick={() => setShowMore(!showMore)} title="More formatting" className={tbBtn(false)}>⋯</button>
          {showMore && (
            <div className="toolbar-overflow-menu">
              <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code" className={tbBtn(editor.isActive('code'))}>{'<>'}</button>
              <button type="button" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear formatting" className={tbBtn(false)}>✕</button>
              <label title="Text color" className="cursor-pointer relative">
                <span className={tbBtn(false)}>A</span>
                <input type="color" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()} />
              </label>
              <button type="button" onClick={() => editor.chain().focus().toggleHighlight().run()} title="Highlight" className={tbBtn(editor.isActive('highlight'))}>▌</button>
              <button type="button" onClick={() => editor.chain().focus().toggleSubscript().run()} title="Subscript" className={tbBtn(editor.isActive('subscript'))}>x₂</button>
              <button type="button" onClick={() => editor.chain().focus().toggleSuperscript().run()} title="Superscript" className={tbBtn(editor.isActive('superscript'))}>x²</button>
              <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()} title="Task list" className={tbBtn(editor.isActive('taskList'))}>☑</button>
              <button type="button" onClick={() => editor.chain().focus().setHardBreak().run()} title="Hard break" className={tbBtn(false)}>↵</button>
            </div>
          )}
        </div>

        {/* Hidden file input for image upload */}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
      </div>
    </div>
  )
}
