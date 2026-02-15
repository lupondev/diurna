'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { useCallback } from 'react'

interface TiptapEditorProps {
  content?: Record<string, unknown>
  onChange?: (json: Record<string, unknown>, html: string) => void
  placeholder?: string
  editable?: boolean
}

function MenuBar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null

  const buttons = [
    { label: 'B', action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold') },
    { label: 'I', action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), className: 'italic' },
    { label: 'S', action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike'), className: 'line-through' },
    { label: 'H1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }) },
    { label: 'H2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
    { label: 'H3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }) },
    { label: '•', action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList') },
    { label: '1.', action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList') },
    { label: '"', action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote') },
    { label: '—', action: () => editor.chain().focus().setHorizontalRule().run(), active: false },
  ]

  return (
    <div className="flex flex-wrap items-center gap-1 border-b bg-gray-50/50 px-3 py-2">
      {buttons.map((btn, i) => (
        <button
          key={i}
          type="button"
          onClick={btn.action}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            btn.active
              ? 'bg-mint text-white'
              : 'text-gray-600 hover:bg-gray-200'
          } ${btn.className || ''}`}
        >
          {btn.label}
        </button>
      ))}

      <div className="mx-1 h-4 w-px bg-gray-300" />

      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-30"
      >
        ↩
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-30"
      >
        ↪
      </button>
    </div>
  )
}

export default function TiptapEditor({
  content,
  onChange,
  placeholder = 'Start writing your article...',
  editable = true,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      CharacterCount,
      Link.configure({ openOnClick: false }),
      Image,
    ],
    content: content || undefined,
    editable,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none px-6 py-4 min-h-[400px] focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON() as Record<string, unknown>, editor.getHTML())
    },
  })

  const wordCount = editor?.storage.characterCount?.words() || 0
  const charCount = editor?.storage.characterCount?.characters() || 0

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
      <div className="flex items-center justify-between border-t px-4 py-2 text-[10px] text-muted-foreground">
        <span>{wordCount} words · {charCount} characters</span>
        <span className="text-mint">Tiptap Editor</span>
      </div>
    </div>
  )
}
