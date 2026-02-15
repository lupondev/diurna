'use client'

import { useState } from 'react'
import './widgets.css'

function MockAd({ scale = 1 }: { scale?: number }) {
  return (
    <div style={{
      width: 300 * scale,
      height: 250 * scale,
      background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
      borderRadius: 12 * scale,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'sans-serif',
      overflow: 'hidden',
      position: 'relative',
      flexShrink: 0,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3 * scale, background: 'linear-gradient(90deg, #00D4AA, #5B5FFF)' }} />
      <div style={{ fontSize: 32 * scale, marginBottom: 8 * scale }}>⚡</div>
      <div style={{ fontSize: 18 * scale, fontWeight: 800, letterSpacing: 1 }}>NIKE FOOTBALL</div>
      <div style={{ fontSize: 11 * scale, color: '#888', marginTop: 4 * scale }}>Just Do It</div>
      <div style={{ marginTop: 12 * scale, padding: `${6 * scale}px ${20 * scale}px`, background: '#00D4AA', borderRadius: 6 * scale, fontSize: 11 * scale, fontWeight: 700 }}>SHOP NOW</div>
      <div style={{ position: 'absolute', bottom: 6 * scale, right: 8 * scale, fontSize: 8 * scale, color: '#555' }}>Ad &bull; Lupon Media SSP</div>
    </div>
  )
}

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

const relatedArticles = [
  { img: 'https://picsum.photos/seed/sport1/80/80', title: 'Bayern Munich Confirm Manager Decision', time: '2h ago' },
  { img: 'https://picsum.photos/seed/sport2/80/80', title: 'Haaland Hat-trick Fires City to Win', time: '4h ago' },
  { img: 'https://picsum.photos/seed/sport3/80/80', title: 'El Clásico Tactical Preview & Prediction', time: '6h ago' },
]

function RelatedArticlesSmall() {
  return (
    <div className="wg-related">
      <div className="wg-related-head">
        <span className="wg-related-title">More from SportNews Pro</span>
        <span className="wg-related-arrow">→</span>
      </div>
      {relatedArticles.slice(0, 2).map((a) => (
        <a key={a.title} href="#" className="wg-related-item" onClick={(e) => e.preventDefault()}>
          <img className="wg-related-thumb" src={a.img} alt="" />
          <div className="wg-related-info">
            <div className="wg-related-item-title">{a.title}</div>
            <div className="wg-related-time">{a.time}</div>
          </div>
        </a>
      ))}
    </div>
  )
}

function RelatedArticlesFull() {
  return (
    <div className="wg-preview-body-related">
      <div className="wg-preview-body-related-head">
        <span className="wg-preview-body-related-title">More from SportNews Pro</span>
        <span className="wg-preview-body-related-arrow">→</span>
      </div>
      {relatedArticles.map((a) => (
        <a key={a.title} href="#" className="wg-preview-body-related-item" onClick={(e) => e.preventDefault()}>
          <img className="wg-preview-body-related-thumb" src={a.img} alt="" />
          <div className="wg-preview-body-related-info">
            <div className="wg-preview-body-related-item-title">{a.title}</div>
            <div className="wg-preview-body-related-time">{a.time}</div>
          </div>
        </a>
      ))}
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

function buildEmbedCode(widgetScript: string): string {
  return `<div style="display:flex;flex-direction:column;align-items:center;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#fff">
  <!-- Widget -->
  ${widgetScript}
  <!-- Divider -->
  <div style="width:100%;height:1px;background:#e5e7eb"></div>
  <!-- Related Articles (drives traffic back to your site) -->
  <div id="diurna-related" style="width:100%;padding:12px 16px">
    <script src="https://cdn.diurna.io/widgets/related.js" data-count="3" data-source="auto"></script>
  </div>
  <!-- Divider -->
  <div style="width:100%;height:1px;background:#e5e7eb"></div>
  <!-- 300x250 Ad Slot (Lupon Media SSP) -->
  <div style="display:flex;flex-direction:column;align-items:center;padding:12px 20px 20px">
    <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;margin-bottom:10px">Powered by Lupon Media SSP</div>
    <div id="diurna-ad-300x250">
      <script src="https://cdn.luponmedia.com/ssp/ad-slot.js" data-size="300x250" data-placement="widget-below"></script>
    </div>
  </div>
</div>`
}

export default function WidgetsPage() {
  const [embedModal, setEmbedModal] = useState<{ code: string; name: string } | null>(null)
  const [previewModal, setPreviewModal] = useState<{ preview: string; name: string; embedCode: string } | null>(null)
  const [copied, setCopied] = useState(false)

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function openEmbed(w: Widget) {
    setCopied(false)
    setEmbedModal({ code: buildEmbedCode(w.embedCode), name: w.name })
  }

  function openPreview(w: Widget) {
    setPreviewModal({ preview: w.preview, name: w.name, embedCode: w.embedCode })
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
                <div className="wg-preview-unit">
                  <div className="wg-preview-widget">
                    <Preview />
                  </div>
                  <div className="wg-ad-divider" />
                  <RelatedArticlesSmall />
                  <div className="wg-ad-divider" />
                  <div className="wg-ad-slot">
                    <div className="wg-ad-label">Powered by Lupon Media SSP</div>
                    <MockAd scale={0.6} />
                  </div>
                </div>
              </div>
              <div className="wg-info">
                <div className="wg-name">
                  {w.name}
                  {w.tag && <span className={`wg-tag ${w.tag.cls}`}>{w.tag.label}</span>}
                </div>
                <div className="wg-desc">{w.desc}</div>
                <div className="wg-actions">
                  <button className="wg-btn primary" onClick={() => openEmbed(w)}>Embed</button>
                  <button className="wg-btn secondary" onClick={() => openPreview(w)}>Preview</button>
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
              <div className="wg-embed-title">📋 Embed Code — {embedModal.name}</div>
              <button className="wg-embed-close" onClick={() => setEmbedModal(null)}>✕</button>
            </div>
            <div className="wg-embed-body">
              <textarea className="wg-embed-code" rows={8} readOnly value={embedModal.code} />
              <button className="wg-embed-copy" onClick={() => handleCopy(embedModal.code)}>
                {copied ? '✅ Copied!' : '📋 Copy to Clipboard'}
              </button>
              <div className="wg-embed-hint">
                <strong>Includes related articles + 300x250 ad slot below the widget</strong> powered by Lupon Media SSP. Related articles drive traffic back to your site, and the ad generates revenue via programmatic demand — all in one cohesive unit.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewModal && (() => {
        const PreviewComp = previewComponents[previewModal.preview]
        return (
          <div className="wg-preview-overlay" onClick={(e) => { if (e.target === e.currentTarget) setPreviewModal(null) }}>
            <div className="wg-preview-modal">
              <div className="wg-preview-head">
                <div className="wg-preview-title">👁️ {previewModal.name} — Live Preview</div>
                <button className="wg-preview-close" onClick={() => setPreviewModal(null)}>✕</button>
              </div>
              <div className="wg-preview-body">
                <div className="wg-preview-body-unit">
                  <div className="wg-preview-body-widget">
                    <PreviewComp />
                  </div>
                  <div className="wg-preview-body-divider" />
                  <RelatedArticlesFull />
                  <div className="wg-preview-body-divider" />
                  <div className="wg-preview-body-ad">
                    <div className="wg-preview-body-ad-label">Powered by Lupon Media SSP</div>
                    <MockAd />
                  </div>
                </div>
              </div>
              <div className="wg-preview-foot">
                <div className="wg-preview-foot-info">
                  Widget + related articles + ad renders as one cohesive unit on your site. <strong>Related articles drive traffic, ad slot generates revenue via Lupon Media SSP.</strong>
                </div>
                <div className="wg-preview-foot-actions">
                  <button className="wg-preview-foot-btn secondary" onClick={() => setPreviewModal(null)}>Close</button>
                  <button className="wg-preview-foot-btn primary" onClick={() => {
                    setPreviewModal(null)
                    setCopied(false)
                    setEmbedModal({ code: buildEmbedCode(previewModal.embedCode), name: previewModal.name })
                  }}>Get Embed Code</button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
