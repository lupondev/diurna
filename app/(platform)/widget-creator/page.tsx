'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getMiniWidget } from '../widgets/shared-mini-widgets'
import '../widgets/widgets.css'
import './widget-creator.css'

type Template = { id: string; icon: string; name: string; desc: string }
type MatchOption = { id: string; icon: string; name: string; meta: string; type: 'match' | 'league' }
type WidgetTheme = 'light' | 'dark' | 'glass' | 'custom'

type ApiMatch = {
  fixture: { id: number; date: string; status: { short: string } }
  teams: { home: { name: string }; away: { name: string } }
  league: { name: string; country: string }
  goals: { home: number | null; away: number | null }
}

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

const FALLBACK_MATCHES: MatchOption[] = [
  { id: 'fallback-1', icon: '⚽', name: 'No matches available today', meta: 'Check back later', type: 'match' },
]

const STATIC_LEAGUES: MatchOption[] = [
  { id: 'prem', icon: '🏴', name: 'Premier League', meta: 'England · 2025/26', type: 'league' },
  { id: 'laliga', icon: '🇪🇸', name: 'La Liga', meta: 'Spain · 2025/26', type: 'league' },
  { id: 'seriea', icon: '🇮🇹', name: 'Serie A', meta: 'Italy · 2025/26', type: 'league' },
  { id: 'bundes', icon: '🇩🇪', name: 'Bundesliga', meta: 'Germany · 2025/26', type: 'league' },
]

function matchToOption(m: ApiMatch): MatchOption {
  const time = new Date(m.fixture.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const isLive = m.fixture.status.short === '1H' || m.fixture.status.short === '2H' || m.fixture.status.short === 'HT'
  const score = isLive && m.goals.home !== null ? ` · ${m.goals.home}-${m.goals.away}` : ''
  return {
    id: String(m.fixture.id),
    icon: isLive ? '🔴' : '⚽',
    name: `${m.teams.home.name} vs ${m.teams.away.name}`,
    meta: `${m.league.name} · ${isLive ? 'LIVE' : time}${score}`,
    type: 'match',
  }
}

const templateToPreviewId: Record<string, string> = {
  'live-score': 'live-score', 'standings': 'standings', 'h2h': 'h2h', 'match-center': 'match-center',
  'top-scorers': 'top-scorers', 'team-form': 'team-form', 'player-card': 'player-card', 'prediction': 'prediction',
  'match-prediction': 'poll', 'motm': 'poll', 'opinion': 'poll', 'rating': 'poll',
  'trivia': 'quiz', 'guess-player': 'quiz', 'predict-score': 'quiz',
  'fan-survey': 'survey', 'transfer-pick': 'survey',
}

const themeOptions: { id: WidgetTheme; label: string; icon: string }[] = [
  { id: 'light', label: 'Light', icon: '☀' },
  { id: 'dark', label: 'Dark', icon: '🌙' },
  { id: 'glass', label: 'Glass', icon: '◻' },
  { id: 'custom', label: 'Custom', icon: '🎨' },
]

const ACCENT_PRESETS = ['#00D4AA', '#5B5FFF', '#F43F5E', '#F59E0B', '#1877F2']

export default function WidgetCreatorPage() {
  const [category, setCategory] = useState('football')
  const [selectedTpl, setSelectedTpl] = useState<string | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null)
  const [theme, setTheme] = useState<WidgetTheme>('light')
  const [accentColor, setAccentColor] = useState('#00D4AA')
  const [search, setSearch] = useState('')
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [codeModal, setCodeModal] = useState(false)
  const [copied, setCopied] = useState(false)

  // Real match data from API-Football
  const [matchOptions, setMatchOptions] = useState<MatchOption[]>([])
  const [matchesLoading, setMatchesLoading] = useState(true)

  useEffect(() => {
    fetch('/api/football?action=today')
      .then(r => r.ok ? r.json() as Promise<{ response?: ApiMatch[] }> : null)
      .then(data => {
        if (data?.response && data.response.length > 0) {
          setMatchOptions([...data.response.map(matchToOption), ...STATIC_LEAGUES])
        } else {
          setMatchOptions([...FALLBACK_MATCHES, ...STATIC_LEAGUES])
        }
      })
      .catch(() => setMatchOptions([...FALLBACK_MATCHES, ...STATIC_LEAGUES]))
      .finally(() => setMatchesLoading(false))
  }, [])

  const step2Ready = !!selectedTpl
  const step3Ready = step2Ready && !!selectedMatch

  const filteredMatches = matchOptions.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  const embedCode = selectedTpl
    ? `<script src="https://cdn.diurna.io/widgets/${selectedTpl}.js" data-${selectedMatch && matchOptions.find((m) => m.id === selectedMatch)?.type === 'league' ? 'league' : 'match'}="${selectedMatch || 'auto'}" data-theme="${theme}" data-accent="${accentColor}"></script>`
    : ''

  function handleCopy() {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const previewId = selectedTpl ? templateToPreviewId[selectedTpl] : null
  const livePreviewWidget = previewId ? getMiniWidget(previewId, { theme, accentColor }) : null

  return (
    <div className="wc-layout">
      <div className="wc-panel">
        <div className="wc-header">
          <div>
            <Link href="/widgets" className="wc-back">&larr; Back to Widgets</Link>
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

        <div className={`wc-step${!step2Ready ? ' disabled' : ''}`}>
          <div className="wc-step-label">
            <div className={`wc-step-num${selectedMatch ? ' done' : ''}`}>{selectedMatch ? '✓' : '2'}</div>
            <div className="wc-step-title">Select Match or League</div>
          </div>
          <div className="wc-search">
            <span className="wc-search-icon" aria-hidden>🔍</span>
            <input
              className="wc-search-input"
              placeholder="Search matches, leagues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search matches and leagues"
            />
          </div>
          {matchesLoading ? (
            <div className="wc-results-loading">Loading today&apos;s matches...</div>
          ) : (
            <div className="wc-results">
              {filteredMatches.map((m) => (
                <div
                  key={m.id}
                  className={`wc-result${selectedMatch === m.id ? ' sel' : ''}${m.meta.includes('LIVE') ? ' wc-result-live' : ''}`}
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
          )}
        </div>

        <div className={`wc-step${!step2Ready ? ' disabled' : ''}`}>
          <div className="wc-step-label">
            <div className={`wc-step-num${step3Ready ? ' done' : ''}`}>{step3Ready ? '✓' : '3'}</div>
            <div className="wc-step-title">Theme &amp; Style</div>
          </div>
          <div className="wc-config">
            <div className="wc-field">
              <label>Widget Theme</label>
              <div className="wc-theme-grid">
                {themeOptions.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`wc-theme-opt${theme === t.id ? ' act' : ''}`}
                    onClick={() => setTheme(t.id)}
                  >
                    <span className="wc-theme-icon">{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="wc-field">
              <label>Accent Color</label>
              <div className="wc-accent-row">
                <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="wc-color-input" aria-label="Accent color" />
                <span className="wc-color-code">{accentColor}</span>
                <div className="wc-accent-presets">
                  {ACCENT_PRESETS.map((c) => (
                    <button key={c} type="button" className={`wc-accent-dot${accentColor === c ? ' act' : ''}`} style={{ background: c }} onClick={() => setAccentColor(c)} aria-label={`Accent ${c}`} />
                  ))}
                </div>
              </div>
            </div>
            <div className="wc-field">
              <label>Widget Frame</label>
              <div className="wc-frame-info">
                <div className="wc-frame-item"><span className="wc-frame-check">✓</span> Accent bar</div>
                <div className="wc-frame-item"><span className="wc-frame-check">✓</span> Publisher branding</div>
                <div className="wc-frame-item"><span className="wc-frame-check">✓</span> Diurna footer</div>
                <div className="wc-frame-item"><span className="wc-frame-check">✓</span> Related articles + ad slot</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="wc-preview">
        <div className="wc-preview-head">
          <div className="wc-preview-title">Live Preview</div>
          <div className="wc-device-toggle">
            <button type="button" className={`wc-device-btn${device === 'desktop' ? ' act' : ''}`} onClick={() => setDevice('desktop')} aria-pressed={device === 'desktop'}>Desktop</button>
            <button type="button" className={`wc-device-btn${device === 'mobile' ? ' act' : ''}`} onClick={() => setDevice('mobile')} aria-pressed={device === 'mobile'}>Mobile</button>
          </div>
        </div>
        <div className="wc-preview-area">
          {livePreviewWidget ? (
            <div className="wc-preview-widget" style={device === 'mobile' ? { maxWidth: 320 } : undefined}>
              {livePreviewWidget}
            </div>
          ) : (
            <div className="wc-preview-empty">
              <div className="wc-preview-empty-icon">🧩</div>
              <div className="wc-preview-empty-text">Select a template to see preview</div>
            </div>
          )}
        </div>
        <div className="wc-preview-actions">
          <button type="button" className="wg-btn secondary" onClick={() => setCodeModal(true)} disabled={!step3Ready}>Get Code</button>
          <button type="button" className="wg-btn primary" onClick={() => step3Ready && setCodeModal(true)} disabled={!step3Ready}>Publish Widget</button>
        </div>
      </div>

      {codeModal && (
        <div className="wc-code-overlay" onClick={(e) => { if (e.target === e.currentTarget) setCodeModal(false) }}>
          <div className="wc-code-modal">
            <div className="wc-code-head">
              <div className="wc-code-title">Embed Code</div>
              <button className="wc-code-close" onClick={() => setCodeModal(false)}>&times;</button>
            </div>
            <div className="wc-code-body">
              <textarea className="wc-code-textarea" rows={4} readOnly value={embedCode} />
              <button className="wc-code-copy" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
