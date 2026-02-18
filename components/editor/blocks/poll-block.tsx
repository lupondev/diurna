'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { useState } from 'react'

function PollComponent({ node, updateAttributes, deleteNode, selected }: {
  node: { attrs: { question: string; options: string[] } }
  updateAttributes: (attrs: Record<string, unknown>) => void
  deleteNode: () => void
  selected: boolean
}) {
  const { question, options } = node.attrs
  const [editIdx, setEditIdx] = useState<number | null>(null)

  return (
    <NodeViewWrapper data-type="poll" className={`blk blk-poll ${selected ? 'blk-selected' : ''}`}>
      <div className="blk-head">
        <span className="blk-icon">🗳️</span>
        <span className="blk-label">Poll</span>
        <button className="blk-del" onClick={deleteNode} title="Remove block">×</button>
      </div>
      <input
        className="blk-poll-q"
        value={question}
        onChange={(e) => updateAttributes({ question: e.target.value })}
        placeholder="Poll question..."
      />
      <div className="blk-poll-opts">
        {(options || []).map((opt: string, i: number) => (
          <div key={i} className="blk-poll-opt">
            <span className="blk-poll-letter">{String.fromCharCode(65 + i)}</span>
            {editIdx === i ? (
              <input
                className="blk-poll-opt-input"
                value={opt}
                autoFocus
                onChange={(e) => {
                  const newOpts = [...options]
                  newOpts[i] = e.target.value
                  updateAttributes({ options: newOpts })
                }}
                onBlur={() => setEditIdx(null)}
                onKeyDown={(e) => { if (e.key === 'Enter') setEditIdx(null) }}
              />
            ) : (
              <span className="blk-poll-opt-text" onClick={() => setEditIdx(i)}>{opt || 'Click to edit'}</span>
            )}
            {options.length > 2 && (
              <button className="blk-poll-opt-rm" onClick={() => {
                updateAttributes({ options: options.filter((_: string, j: number) => j !== i) })
              }}>×</button>
            )}
          </div>
        ))}
      </div>
      {options.length < 6 && (
        <button className="blk-add-opt" onClick={() => updateAttributes({ options: [...options, `Option ${String.fromCharCode(65 + options.length)}`] })}>
          + Add option
        </button>
      )}
    </NodeViewWrapper>
  )
}

export const PollBlock = Node.create({
  name: 'poll',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      question: { default: 'Your question here?' },
      options: {
        default: ['Option A', 'Option B', 'Option C'],
        parseHTML: (el: HTMLElement) => {
          try { return JSON.parse(el.getAttribute('data-options') || '[]') } catch { return [] }
        },
        renderHTML: (attrs: { options: string[] }) => ({ 'data-options': JSON.stringify(attrs.options) }),
      },
    }
  },

  parseHTML() { return [{ tag: 'div[data-type="poll"]' }] },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'poll' }), 0]
  },

  addNodeView() { return ReactNodeViewRenderer(PollComponent as never) },
})
