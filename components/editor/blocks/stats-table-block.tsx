'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'

type StatsRow = { label: string; home: string; away: string }

function StatsTableComponent({ node, updateAttributes, deleteNode, selected }: {
  node: { attrs: { title: string; homeLabel: string; awayLabel: string; rows: StatsRow[] } }
  updateAttributes: (attrs: Record<string, unknown>) => void
  deleteNode: () => void
  selected: boolean
}) {
  const { title, homeLabel, awayLabel, rows } = node.attrs

  function updateRow(idx: number, field: keyof StatsRow, value: string) {
    const newRows = rows.map((r: StatsRow, i: number) => i === idx ? { ...r, [field]: value } : r)
    updateAttributes({ rows: newRows })
  }

  return (
    <NodeViewWrapper data-type="statsTable" className={`blk blk-stats ${selected ? 'blk-selected' : ''}`}>
      <div className="blk-head">
        <span className="blk-icon">📊</span>
        <span className="blk-label">Stats Comparison</span>
        <button className="blk-del" onClick={deleteNode} title="Remove block">×</button>
      </div>
      <input
        className="blk-stats-title"
        value={title}
        onChange={(e) => updateAttributes({ title: e.target.value })}
        placeholder="Stats title..."
      />
      <table className="blk-stats-table">
        <thead>
          <tr>
            <th>
              <input value={homeLabel} onChange={(e) => updateAttributes({ homeLabel: e.target.value })} className="blk-stats-th-input" />
            </th>
            <th>Stat</th>
            <th>
              <input value={awayLabel} onChange={(e) => updateAttributes({ awayLabel: e.target.value })} className="blk-stats-th-input" />
            </th>
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((row: StatsRow, i: number) => (
            <tr key={i}>
              <td><input className="blk-stats-input" value={row.home} onChange={(e) => updateRow(i, 'home', e.target.value)} /></td>
              <td><input className="blk-stats-input blk-stats-label" value={row.label} onChange={(e) => updateRow(i, 'label', e.target.value)} /></td>
              <td><input className="blk-stats-input" value={row.away} onChange={(e) => updateRow(i, 'away', e.target.value)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="blk-stats-actions">
        <button className="blk-add-opt" onClick={() => updateAttributes({ rows: [...rows, { label: 'Stat', home: '0', away: '0' }] })}>+ Add row</button>
        {rows.length > 1 && (
          <button className="blk-add-opt" onClick={() => updateAttributes({ rows: rows.slice(0, -1) })}>- Remove last</button>
        )}
      </div>
    </NodeViewWrapper>
  )
}

export const StatsTableBlock = Node.create({
  name: 'statsTable',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      title: { default: 'Stats Comparison' },
      homeLabel: { default: 'Home' },
      awayLabel: { default: 'Away' },
      rows: {
        default: [
          { label: 'Possession', home: '55%', away: '45%' },
          { label: 'Shots', home: '12', away: '8' },
          { label: 'Passes', home: '487', away: '356' },
        ],
        parseHTML: (el: HTMLElement) => {
          try { return JSON.parse(el.getAttribute('data-rows') || '[]') } catch { return [] }
        },
        renderHTML: (attrs: { rows: StatsRow[] }) => ({ 'data-rows': JSON.stringify(attrs.rows) }),
      },
    }
  },

  parseHTML() { return [{ tag: 'div[data-type="statsTable"]' }] },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'statsTable' }), 0]
  },

  addNodeView() { return ReactNodeViewRenderer(StatsTableComponent as never) },
})
