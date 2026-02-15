'use client'

import { useState } from 'react'
import Link from 'next/link'
import './widget-creator.css'

type Template = { id: string; icon: string; name: string; desc: string }
type MatchOption = { id: string; icon: string; name: string; meta: string; type: 'match' | 'league' }

const categories = [
  { id: 'football', label: 'Football' },
  { id: 'polls', label: 'Polls' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'survey', label: 'Survey' },
]

const templates: Record<string, Template[]> = {
  football: [
    { id: 'live-score', icon: '⚽', name: 'Live Score', desc: 'Real-time scores' },
    { id: 'standings', icon: '🏆', name: 'Standings', desc: 'League table' },
    { id: 'h2h', icon: '⚔️', name: 'Head to Head', desc: 'Team comparison' },
    { id: 'match-center', icon: '📋', name: 'Match Center', desc: 'Full match view' },
    { id: 'top-scorers', icon: '🥇', name: 'Top Scorers', desc: 'Goal rankings' },
    { id: 'team-form', icon: '📊', name: 'Team Form', desc: 'Last 5 results' },
    { id: 'player-card', icon: '🃏', name: 'Player Card', desc: 'Trading card' },
    { id: 'prediction', icon: '🤖', name: 'Prediction', desc: 'AI match prediction' },
  ],
  polls: [
    { id: 'match-prediction', icon: '🗳️', name: 'Match Prediction', desc: 'Win/Draw/Win' },
    { id: 'motm', icon: '⭐', name: 'MOTM Vote', desc: 'Man of the Match' },
    { id: 'opinion', icon: '💬', name: 'Opinion Poll', desc: 'Fan opinions' },
    { id: 'rating', icon: '📈', name: 'Player Rating', desc: 'Rate performance' },
  ],
  quiz: [
    { id: 'trivia', icon: '🧠', name: 'Football Trivia', desc: 'Test knowledge' },
    { id: 'guess-player', icon: '🔍', name: 'Guess the Player', desc: 'Player quiz' },
    { id: 'predict-score', icon: '🎯', name: 'Score Predictor', desc: 'Predict results' },
  ],
  survey: [
    { id: 'fan-survey', icon: '📋', name: 'Fan Survey', desc: 'Engagement survey' },
    { id: 'transfer-pick', icon: '🔄', name: 'Transfer Pick', desc: 'Who should sign?' },
  ],
}

const matchOptions: MatchOption[] = [
  { id: 'rm-barca', icon: '⚽', name: 'Real Madrid vs Barcelona', meta: 'La Liga · Today 21:00', type: 'match' },
  { id: 'city-pool', icon: '⚽', name: 'Man City vs Liverpool', meta: 'Premier League · Sat 17:30', type: 'match' },
  { id: 'inter-juve', icon: '⚽', name: 'Inter vs Juventus', meta: 'Serie A · Sun 20:45', type: 'match' },
  { id: 'prem', icon: '🏴', name: 'Premier League', meta: 'England · 2025/26', type: 'league' },
  { id: 'laliga', icon: '🇪🇸', name: 'La Liga', meta: 'Spain · 2025/26', type: 'league' },
  { id: 'seriea', icon: '🇮🇹', name: 'Serie A', meta: 'Italy · 2025/26', type: 'league' },
  { id: 'bundes', icon: '🇩🇪', name: 'Bundesliga', meta: 'Germany · 2025/26', type: 'league' },
]

function LiveScoreWidget() {
  return (
    <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', fontFamily: 'var(--sans)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--g900)', color: '#fff', fontSize: 11, fontWeight: 600 }}>
        <span>🏴 Premier League</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'var(--coral)', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>
          <span style={{ width: 5, height: 5, background: '#fff', borderRadius: '50%' }} />LIVE
        </span>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
            <div style={{ width: 44, height: 44, background: 'var(--g100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🔵</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--g900)' }}>Man City</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 12px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '2rem', fontWeight: 800, color: 'var(--g900)', letterSpacing: 3 }}>2 - 1</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--coral)' }}>67&apos;</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
            <div style={{ width: 44, height: 44, background: 'var(--g100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🔴</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--g900)' }}>Liverpool</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 12, borderTop: '1px solid var(--g100)', fontSize: 11, color: 'var(--g600)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>⚽ 12&apos; — Haaland (Man City)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>⚽ 34&apos; — Salah (Liverpool)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>⚽ 67&apos; — Foden (Man City)</div>
        </div>
      </div>
      <div style={{ padding: 8, textAlign: 'center', fontSize: 9, color: 'var(--g400)', background: 'var(--g100)' }}>
        Powered by <span style={{ color: 'var(--mint)', fontWeight: 700 }}>Diurna</span>
      </div>
    </div>
  )
}

function StandingsWidget() {
  const teams = [
    { pos: 1, icon: '🔴', name: 'Arsenal', pts: 73 },
    { pos: 2, icon: '🔵', name: 'Man City', pts: 70 },
    { pos: 3, icon: '🔴', name: 'Liverpool', pts: 68 },
    { pos: 4, icon: '⚪', name: 'Tottenham', pts: 60 },
    { pos: 5, icon: '🔵', name: 'Chelsea', pts: 55 },
  ]
  return (
    <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', fontFamily: 'var(--sans)' }}>
      <div style={{ padding: '10px 14px', background: 'linear-gradient(135deg, #1e3a5f, #0f2744)', color: '#fff', fontSize: 11, fontWeight: 700 }}>🏴 Premier League 2025/26</div>
      <div style={{ padding: '8px 0' }}>
        {teams.map((t) => (
          <div key={t.pos} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 36px', gap: 8, padding: '8px 12px', alignItems: 'center', fontSize: 11 }}>
            <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--mint)', color: 'var(--g900)', fontWeight: 800, borderRadius: 4, fontSize: 10 }}>{t.pos}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--g900)' }}>
              <span style={{ fontSize: 14 }}>{t.icon}</span>{t.name}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, color: 'var(--g900)', textAlign: 'center' }}>{t.pts}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: 8, textAlign: 'center', fontSize: 9, color: 'var(--g400)', background: 'var(--g100)' }}>
        Powered by <span style={{ color: 'var(--mint)', fontWeight: 700 }}>Diurna</span>
      </div>
    </div>
  )
}

function PollWidget() {
  return (
    <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', fontFamily: 'var(--sans)' }}>
      <div style={{ padding: '10px 14px', background: 'var(--elec)', color: '#fff', fontSize: 11, fontWeight: 700 }}>🗳️ Fan Poll</div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--g900)', marginBottom: 12 }}>Who will win El Cl&aacute;sico?</div>
        {[
          { label: '⚪ Real Madrid', pct: '45%' },
          { label: '🔵🔴 Barcelona', pct: '35%' },
          { label: '🤝 Draw', pct: '20%' },
        ].map((o) => (
          <div key={o.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--g50)', borderRadius: 'var(--rm)', marginBottom: 8, fontSize: 12 }}>
            <span style={{ fontWeight: 600, color: 'var(--g800)' }}>{o.label}</span>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--elec)' }}>{o.pct}</span>
          </div>
        ))}
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--g500)', marginTop: 8 }}>12,847 votes</div>
      </div>
    </div>
  )
}

const previewMap: Record<string, () => React.JSX.Element> = {
  'live-score': LiveScoreWidget,
  'standings': StandingsWidget,
  'h2h': LiveScoreWidget,
  'fixtures': StandingsWidget,
  'match-stats': LiveScoreWidget,
  'lineups': LiveScoreWidget,
  'match-prediction': PollWidget,
  'motm': PollWidget,
  'opinion': PollWidget,
  'rating': PollWidget,
  'trivia': PollWidget,
  'guess-player': PollWidget,
  'predict-score': PollWidget,
  'fan-survey': PollWidget,
  'transfer-pick': PollWidget,
}

export default function WidgetCreatorPage() {
  const [category, setCategory] = useState('football')
  const [selectedTpl, setSelectedTpl] = useState<string | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [search, setSearch] = useState('')
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [codeModal, setCodeModal] = useState(false)
  const [copied, setCopied] = useState(false)

  const step2Ready = !!selectedTpl
  const step3Ready = step2Ready && !!selectedMatch

  const filteredMatches = matchOptions.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  const embedCode = selectedTpl
    ? `<script src="https://cdn.diurna.io/widgets/${selectedTpl}.js" data-${selectedMatch && matchOptions.find((m) => m.id === selectedMatch)?.type === 'league' ? 'league' : 'match'}="${selectedMatch || 'auto'}" data-theme="${theme}"></script>`
    : ''

  function handleCopy() {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const PreviewComp = selectedTpl ? previewMap[selectedTpl] : null

  return (
    <div className="wc-layout">
      {/* Left Panel */}
      <div className="wc-panel">
        <div className="wc-header">
          <div>
            <Link href="/widgets" className="wc-back">← Back to Widgets</Link>
            <h1 className="wc-title">Create Widget</h1>
          </div>
          <div className="wc-actions">
            <Link href="/widgets" className="wg-btn secondary" style={{ padding: '10px 20px' }}>Cancel</Link>
            <button
              className="wg-btn primary"
              style={{ padding: '10px 20px', opacity: step3Ready ? 1 : .4, pointerEvents: step3Ready ? 'auto' : 'none' }}
              onClick={() => setCodeModal(true)}
            >
              Publish Widget
            </button>
          </div>
        </div>

        {/* Step 1: Pick Template */}
        <div className="wc-step">
          <div className="wc-step-label">
            <div className={`wc-step-num${selectedTpl ? ' done' : ''}`}>{selectedTpl ? '✓' : '1'}</div>
            <div className="wc-step-title">Pick a Template</div>
          </div>
          <div className="wc-tabs">
            {categories.map((c) => (
              <button
                key={c.id}
                className={`wc-tab${category === c.id ? ' act' : ''}`}
                onClick={() => { setCategory(c.id); setSelectedTpl(null); setSelectedMatch(null) }}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="wc-templates">
            {templates[category]?.map((t) => (
              <div
                key={t.id}
                className={`wc-tpl${selectedTpl === t.id ? ' sel' : ''}`}
                onClick={() => { setSelectedTpl(t.id); setSelectedMatch(null) }}
              >
                <div className="wc-tpl-icon">{t.icon}</div>
                <div className="wc-tpl-name">{t.name}</div>
                <div className="wc-tpl-desc">{t.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 2: Select Match/League */}
        <div className={`wc-step${!step2Ready ? ' disabled' : ''}`}>
          <div className="wc-step-label">
            <div className={`wc-step-num${selectedMatch ? ' done' : ''}`}>{selectedMatch ? '✓' : '2'}</div>
            <div className="wc-step-title">Select Match or League</div>
          </div>
          <div className="wc-search">
            <span className="wc-search-icon">🔍</span>
            <input
              className="wc-search-input"
              placeholder="Search matches, leagues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="wc-results">
            {filteredMatches.map((m) => (
              <div
                key={m.id}
                className={`wc-result${selectedMatch === m.id ? ' sel' : ''}`}
                onClick={() => setSelectedMatch(m.id)}
              >
                <div className="wc-result-icon">{m.icon}</div>
                <div className="wc-result-info">
                  <div className="wc-result-title">{m.name}</div>
                  <div className="wc-result-meta">{m.meta}</div>
                </div>
                <div className="wc-result-check">✓</div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 3: Configure */}
        <div className={`wc-step${!step3Ready ? ' disabled' : ''}`}>
          <div className="wc-step-label">
            <div className="wc-step-num">3</div>
            <div className="wc-step-title">Configure</div>
          </div>
          <div className="wc-config">
            <div className="wc-field">
              <label>Theme</label>
              <div className="wc-theme-toggle">
                <button className={`wc-theme-btn${theme === 'light' ? ' act' : ''}`} onClick={() => setTheme('light')}>☀️ Light</button>
                <button className={`wc-theme-btn${theme === 'dark' ? ' act' : ''}`} onClick={() => setTheme('dark')}>🌙 Dark</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="wc-preview">
        <div className="wc-preview-head">
          <div className="wc-preview-title">Live Preview</div>
          <div className="wc-device-toggle">
            <button className={`wc-device-btn${device === 'desktop' ? ' act' : ''}`} onClick={() => setDevice('desktop')}>🖥</button>
            <button className={`wc-device-btn${device === 'mobile' ? ' act' : ''}`} onClick={() => setDevice('mobile')}>📱</button>
          </div>
        </div>
        <div className="wc-preview-area">
          {PreviewComp ? (
            <div className="wc-preview-widget" style={device === 'mobile' ? { maxWidth: 320 } : undefined}>
              <PreviewComp />
            </div>
          ) : (
            <div className="wc-preview-empty">
              <div className="wc-preview-empty-icon">🧩</div>
              <div className="wc-preview-empty-text">Select a template to see preview</div>
            </div>
          )}
        </div>
        {step3Ready && (
          <div className="wc-preview-actions">
            <button className="wg-btn secondary" onClick={() => setCodeModal(true)}>Get Code</button>
            <button className="wg-btn primary" onClick={() => setCodeModal(true)}>Publish</button>
          </div>
        )}
      </div>

      {/* Code Modal */}
      {codeModal && (
        <div className="wc-code-overlay" onClick={(e) => { if (e.target === e.currentTarget) setCodeModal(false) }}>
          <div className="wc-code-modal">
            <div className="wc-code-head">
              <div className="wc-code-title">📋 Embed Code</div>
              <button className="wc-code-close" onClick={() => setCodeModal(false)}>✕</button>
            </div>
            <div className="wc-code-body">
              <textarea className="wc-code-textarea" rows={4} readOnly value={embedCode} />
              <button className="wc-code-copy" onClick={handleCopy}>
                {copied ? '✅ Copied!' : '📋 Copy to Clipboard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
