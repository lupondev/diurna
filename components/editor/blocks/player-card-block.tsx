'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { useState, useEffect } from 'react'

type PlayerData = {
  id?: string
  name: string; photo?: string; position?: string; currentTeam?: string
  nationality?: string; age?: number; salary?: number; marketValue?: string
  goals?: number; assists?: number; appearances?: number; rating?: number
}

interface PlayerSearchResponse {
  players?: PlayerData[]
}

function PlayerCardComponent({ node, updateAttributes, deleteNode, selected }: {
  node: { attrs: { playerId: string; playerName: string } }
  updateAttributes: (attrs: Record<string, unknown>) => void
  deleteNode: () => void
  selected: boolean
}) {
  const { playerId, playerName } = node.attrs
  const [player, setPlayer] = useState<PlayerData | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState(playerName || '')

  useEffect(() => {
    if (playerId) {
      setLoading(true)
      fetch(`/api/players/${playerId}`)
        .then((r) => r.json() as Promise<PlayerData>)
        .then((data) => { if (data.name) setPlayer(data) })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [playerId])

  async function searchPlayer() {
    if (!search.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/players?search=${encodeURIComponent(search)}&limit=1`)
      const data = await res.json() as PlayerSearchResponse
      const players = data.players || data
      if (Array.isArray(players) && players.length > 0) {
        const p = players[0]
        setPlayer(p)
        updateAttributes({ playerId: p.id, playerName: p.name })
      }
    } catch (err) {
      console.error('Player card fetch:', err)
    } finally { setLoading(false) }
  }

  return (
    <NodeViewWrapper data-type="playerCard" className={`blk blk-player ${selected ? 'blk-selected' : ''}`}>
      <div className="blk-head">
        <span className="blk-icon">👤</span>
        <span className="blk-label">Player Card</span>
        <button className="blk-del" onClick={deleteNode} title="Remove block">×</button>
      </div>
      {!player ? (
        <div className="blk-player-search">
          <input
            className="blk-player-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') searchPlayer() }}
            placeholder="Search player name..."
          />
          <button className="blk-player-search-btn" onClick={searchPlayer} disabled={loading}>
            {loading ? '...' : 'Find'}
          </button>
        </div>
      ) : (
        <div className="blk-player-card">
          <div className="blk-player-top">
            {player.photo && <div className="blk-player-photo" style={{ backgroundImage: `url(${player.photo})` }} />}
            <div className="blk-player-info">
              <div className="blk-player-name">{player.name}</div>
              <div className="blk-player-meta">{player.position} · {player.currentTeam}</div>
              <div className="blk-player-meta">{player.nationality} · Age {player.age}</div>
            </div>
          </div>
          <div className="blk-player-stats">
            {player.appearances != null && <div className="blk-player-stat"><span>{player.appearances}</span><small>Apps</small></div>}
            {player.goals != null && <div className="blk-player-stat"><span>{player.goals}</span><small>Goals</small></div>}
            {player.assists != null && <div className="blk-player-stat"><span>{player.assists}</span><small>Assists</small></div>}
            {player.rating != null && <div className="blk-player-stat"><span>{player.rating.toFixed(1)}</span><small>Rating</small></div>}
            {player.salary != null && <div className="blk-player-stat"><span>{(player.salary / 1000).toFixed(0)}k</span><small>Salary/w</small></div>}
            {player.marketValue && <div className="blk-player-stat"><span>{player.marketValue}</span><small>Value</small></div>}
          </div>
          <button className="blk-player-change" onClick={() => { setPlayer(null); setSearch('') }}>Change player</button>
        </div>
      )}
    </NodeViewWrapper>
  )
}

export const PlayerCardBlock = Node.create({
  name: 'playerCard',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      playerId: { default: '' },
      playerName: { default: '' },
    }
  },

  parseHTML() { return [{ tag: 'div[data-type="playerCard"]' }] },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'playerCard' }), 0]
  },

  addNodeView() { return ReactNodeViewRenderer(PlayerCardComponent as never) },
})
