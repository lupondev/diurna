'use client'

import { useState } from 'react'
import './widgets.css'

type Widget = {
  name: string
  desc: string
  tag?: { label: string; cls: string }
  embedCode: string
  preview: 'live-score' | 'standings' | 'h2h' | 'poll' | 'timeline' | 'player'
}

const widgets: Widget[] = [
  {
    name: 'Live Score',
    desc: 'Real-time match scores with live events, goal scorers, and minute-by-minute updates.',
    tag: { label: 'Popular', cls: 'popular' },
    embedCode: '<script src="https://cdn.diurna.io/widgets/live-score.js" data-match="auto" data-theme="light"></script>',
    preview: 'live-score',
  },
  {
    name: 'League Standings',
    desc: 'Full league table with positions, points, wins, draws, losses, and form indicators.',
    tag: { label: 'Popular', cls: 'popular' },
    embedCode: '<script src="https://cdn.diurna.io/widgets/standings.js" data-league="premier-league" data-theme="light"></script>',
    preview: 'standings',
  },
  {
    name: 'Head to Head',
    desc: 'Complete H2H comparison between two teams with historical stats and win percentages.',
    tag: { label: 'New', cls: 'new' },
    embedCode: '<script src="https://cdn.diurna.io/widgets/h2h.js" data-home="real-madrid" data-away="barcelona" data-theme="light"></script>',
    preview: 'h2h',
  },
  {
    name: 'Fan Poll',
    desc: 'Interactive polls for fan engagement — match predictions, MOTM votes, and opinion surveys.',
    tag: { label: 'Pro', cls: 'pro' },
    embedCode: '<script src="https://cdn.diurna.io/widgets/poll.js" data-id="el-clasico-prediction" data-theme="light"></script>',
    preview: 'poll',
  },
  {
    name: 'Match Timeline',
    desc: 'Visual match timeline showing goals, cards, substitutions, and key events chronologically.',
    tag: { label: 'New', cls: 'new' },
    embedCode: '<script src="https://cdn.diurna.io/widgets/timeline.js" data-match="auto" data-theme="light"></script>',
    preview: 'timeline',
  },
  {
    name: 'Player Card',
    desc: 'Player statistics card with season performance data, goals, assists, and match ratings.',
    tag: { label: 'Pro', cls: 'pro' },
    embedCode: '<script src="https://cdn.diurna.io/widgets/player.js" data-player="vinicius-jr" data-theme="light"></script>',
    preview: 'player',
  },
]

function LiveScorePreview() {
  return (
    <div className="wg-live-score">
      <div className="wg-ls-header">
        <div className="wg-ls-league">🏴 Premier League</div>
        <div className="wg-ls-live"><span className="wg-ls-dot"></span>LIVE</div>
      </div>
      <div className="wg-ls-match">
        <div className="wg-ls-teams">
          <div className="wg-ls-team">
            <div className="wg-ls-logo">🔵</div>
            <div className="wg-ls-name">Man City</div>
          </div>
          <div className="wg-ls-center">
            <div className="wg-ls-score">2 - 1</div>
            <div className="wg-ls-minute">67&apos;</div>
          </div>
          <div className="wg-ls-team">
            <div className="wg-ls-logo">🔴</div>
            <div className="wg-ls-name">Liverpool</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StandingsPreview() {
  const teams = [
    { pos: 1, cls: 'ucl', icon: '🔵', name: 'Man City', w: 18, d: 3, pts: 57 },
    { pos: 2, cls: 'ucl', icon: '🔴', name: 'Arsenal', w: 17, d: 4, pts: 55 },
    { pos: 3, cls: 'ucl', icon: '🔴', name: 'Liverpool', w: 16, d: 5, pts: 53 },
    { pos: 4, cls: 'ucl', icon: '🔵', name: 'Chelsea', w: 14, d: 6, pts: 48 },
    { pos: 5, cls: 'uel', icon: '⚪', name: 'Spurs', w: 13, d: 5, pts: 44 },
  ]
  return (
    <div className="wg-standings">
      <div className="wg-st-header">🏴 Premier League 2025/26</div>
      <div className="wg-st-thead">
        <span>#</span><span>Team</span><span>W</span><span>D</span><span>Pts</span>
      </div>
      {teams.map((t) => (
        <div key={t.pos} className="wg-st-row">
          <span className={`wg-st-pos ${t.cls}`}>{t.pos}</span>
          <div className="wg-st-team"><span className="wg-st-team-icon">{t.icon}</span>{t.name}</div>
          <span className="wg-st-stat">{t.w}</span>
          <span className="wg-st-stat">{t.d}</span>
          <span className="wg-st-pts">{t.pts}</span>
        </div>
      ))}
    </div>
  )
}

function H2HPreview() {
  return (
    <div className="wg-h2h">
      <div className="wg-h2h-header">⚔️ Head to Head</div>
      <div className="wg-h2h-teams">
        <div className="wg-h2h-team">
          <div className="wg-h2h-logo">⚪</div>
          <div className="wg-h2h-name">Real Madrid</div>
        </div>
        <div className="wg-h2h-vs">VS</div>
        <div className="wg-h2h-team">
          <div className="wg-h2h-logo">🔵🔴</div>
          <div className="wg-h2h-name">Barcelona</div>
        </div>
      </div>
      <div className="wg-h2h-stats">
        <div><div className="wg-h2h-stat-val highlight">105</div><div className="wg-h2h-stat-label">RM Wins</div></div>
        <div><div className="wg-h2h-stat-val">52</div><div className="wg-h2h-stat-label">Draws</div></div>
        <div><div className="wg-h2h-stat-val">100</div><div className="wg-h2h-stat-label">FCB Wins</div></div>
      </div>
      <div className="wg-h2h-bar">
        <div className="wg-h2h-seg home" style={{ width: '41%' }}></div>
        <div className="wg-h2h-seg draw" style={{ width: '20%' }}></div>
        <div className="wg-h2h-seg away" style={{ width: '39%' }}></div>
      </div>
    </div>
  )
}

function PollPreview() {
  return (
    <div className="wg-poll">
      <div className="wg-poll-header">📊 Fan Poll</div>
      <div className="wg-poll-body">
        <div className="wg-poll-q">Who will win El Cl&aacute;sico?</div>
        <div className="wg-poll-opt">⚪ Real Madrid</div>
        <div className="wg-poll-opt selected">🔵🔴 Barcelona</div>
        <div className="wg-poll-opt">🤝 Draw</div>
      </div>
    </div>
  )
}

function TimelinePreview() {
  const events = [
    { min: "12'", icon: '⚽', text: 'Haaland — Man City 1-0' },
    { min: "34'", icon: '🟨', text: 'Robertson — Yellow Card' },
    { min: "45'", icon: '⚽', text: 'Salah — Man City 1-1' },
    { min: "58'", icon: '🔄', text: 'De Bruyne → Foden' },
    { min: "67'", icon: '⚽', text: 'Foden — Man City 2-1' },
  ]
  return (
    <div className="wg-timeline">
      <div className="wg-tl-header">📋 Match Timeline</div>
      <div className="wg-tl-events">
        {events.map((e, i) => (
          <div key={i} className="wg-tl-event">
            <span className="wg-tl-min">{e.min}</span>
            <span className="wg-tl-icon">{e.icon}</span>
            <span className="wg-tl-text">{e.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PlayerPreview() {
  return (
    <div className="wg-player">
      <div className="wg-pl-header">
        <div className="wg-pl-avatar">⚡</div>
        <div className="wg-pl-name">Vinícius Jr.</div>
        <div className="wg-pl-pos">LW · Real Madrid · #7</div>
      </div>
      <div className="wg-pl-stats">
        <div className="wg-pl-stat"><div className="wg-pl-stat-val">18</div><div className="wg-pl-stat-label">Goals</div></div>
        <div className="wg-pl-stat"><div className="wg-pl-stat-val">12</div><div className="wg-pl-stat-label">Assists</div></div>
        <div className="wg-pl-stat"><div className="wg-pl-stat-val">8.4</div><div className="wg-pl-stat-label">Rating</div></div>
      </div>
    </div>
  )
}

const previewComponents: Record<string, () => React.JSX.Element> = {
  'live-score': LiveScorePreview,
  'standings': StandingsPreview,
  'h2h': H2HPreview,
  'poll': PollPreview,
  'timeline': TimelinePreview,
  'player': PlayerPreview,
}

export default function WidgetsPage() {
  const [embedModal, setEmbedModal] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="wg-page">
      {/* Header */}
      <div className="wg-header">
        <div className="wg-badge">Widget Library</div>
        <h1 className="wg-title">Football Widgets</h1>
        <p className="wg-subtitle">Embeddable sports widgets for your publication. Live scores, standings, player cards, and more.</p>
      </div>

      {/* Grid */}
      <div className="wg-grid">
        {widgets.map((w) => {
          const Preview = previewComponents[w.preview]
          return (
            <div key={w.name} className="wg-card">
              <div className="wg-preview">
                <Preview />
              </div>
              <div className="wg-info">
                <div className="wg-name">
                  {w.name}
                  {w.tag && <span className={`wg-tag ${w.tag.cls}`}>{w.tag.label}</span>}
                </div>
                <div className="wg-desc">{w.desc}</div>
                <div className="wg-actions">
                  <button className="wg-btn primary" onClick={() => setEmbedModal(w.embedCode)}>Embed</button>
                  <button className="wg-btn secondary">Preview</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Embed Modal */}
      {embedModal && (
        <div className="wg-embed-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEmbedModal(null) }}>
          <div className="wg-embed-modal">
            <div className="wg-embed-head">
              <div className="wg-embed-title">📋 Embed Code</div>
              <button className="wg-embed-close" onClick={() => setEmbedModal(null)}>✕</button>
            </div>
            <div className="wg-embed-body">
              <textarea className="wg-embed-code" rows={4} readOnly value={embedModal} />
              <button className="wg-embed-copy" onClick={() => handleCopy(embedModal)}>
                {copied ? '✅ Copied!' : '📋 Copy to Clipboard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
