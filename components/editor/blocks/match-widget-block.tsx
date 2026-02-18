'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'

function MatchWidgetComponent({ node, updateAttributes, deleteNode, selected }: {
  node: { attrs: { homeTeam: string; awayTeam: string; homeScore: string; awayScore: string; league: string; matchTime: string; fixtureId: string } }
  updateAttributes: (attrs: Record<string, unknown>) => void
  deleteNode: () => void
  selected: boolean
}) {
  const { homeTeam, awayTeam, homeScore, awayScore, league, matchTime } = node.attrs

  return (
    <NodeViewWrapper data-type="matchWidget" className={`blk blk-match ${selected ? 'blk-selected' : ''}`}>
      <div className="blk-head">
        <span className="blk-icon">⚽</span>
        <span className="blk-label">Match Widget</span>
        <button className="blk-del" onClick={deleteNode} title="Remove block">×</button>
      </div>
      <div className="blk-match-card">
        <div className="blk-match-league">
          <input
            className="blk-match-league-input"
            value={league}
            onChange={(e) => updateAttributes({ league: e.target.value })}
            placeholder="League..."
          />
        </div>
        <div className="blk-match-teams">
          <div className="blk-match-team">
            <input
              className="blk-match-team-input"
              value={homeTeam}
              onChange={(e) => updateAttributes({ homeTeam: e.target.value })}
              placeholder="Home team..."
            />
          </div>
          <div className="blk-match-score">
            <input
              className="blk-match-score-input"
              value={homeScore}
              onChange={(e) => updateAttributes({ homeScore: e.target.value })}
              placeholder="-"
            />
            <span className="blk-match-divider">:</span>
            <input
              className="blk-match-score-input"
              value={awayScore}
              onChange={(e) => updateAttributes({ awayScore: e.target.value })}
              placeholder="-"
            />
          </div>
          <div className="blk-match-team">
            <input
              className="blk-match-team-input"
              value={awayTeam}
              onChange={(e) => updateAttributes({ awayTeam: e.target.value })}
              placeholder="Away team..."
            />
          </div>
        </div>
        <div className="blk-match-time">
          <input
            className="blk-match-time-input"
            value={matchTime}
            onChange={(e) => updateAttributes({ matchTime: e.target.value })}
            placeholder="Match time / status..."
          />
        </div>
      </div>
    </NodeViewWrapper>
  )
}

export const MatchWidgetBlock = Node.create({
  name: 'matchWidget',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      fixtureId: { default: '' },
      homeTeam: { default: 'Home Team' },
      awayTeam: { default: 'Away Team' },
      homeScore: { default: '' },
      awayScore: { default: '' },
      league: { default: '' },
      matchTime: { default: '' },
    }
  },

  parseHTML() { return [{ tag: 'div[data-type="matchWidget"]' }] },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'matchWidget' }), 0]
  },

  addNodeView() { return ReactNodeViewRenderer(MatchWidgetComponent as never) },
})
