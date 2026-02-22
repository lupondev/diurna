'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import './widget-creator.css'

type Template = { id: string; icon: string; name: string; desc: string }
type MatchOption = { id: string; icon: string; name: string; meta: string; type: 'match' | 'league' }
type WidgetTheme = 'light' | 'dark' | 'transparent' | 'custom'

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

function LiveScoreWidget({ theme, accentColor }: { theme: WidgetTheme; accentColor: string }) {
  const isDark = theme === 'dark'
  const isTransparent = theme === 'transparent'
  const bg = isDark ? '#1a1a2e' : isTransparent ? 'rgba(255,255,255,.85)' : '#fff'
  const textColor = isDark ? '#fff' : 'var(--g900)'
  return (
    <div style={{ background: bg, borderRadius: 14, overflow: 'hidden', fontFamily: 'var(--sans)', border: isTransparent ? '1px solid rgba(0,0,0,.1)' : 'none' }}>
      <div style={{ height: 3, background: accentColor }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.1)' : 'var(--g100)'}` }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: isDark ? 'rgba(255,255,255,.5)' : 'var(--g400)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Diurna</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', background: 'var(--coral)', borderRadius: 6, fontSize: 9, fontWeight: 700, color: '#fff' }}>LIVE</span>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
            <div style={{ width: 40, height: 40, background: isDark ? 'rgba(255,255,255,.1)' : 'var(--g100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: isDark ? '#fff' : 'var(--g600)' }}>MCI</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: textColor }}>Man City</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 12px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '1.8rem', fontWeight: 800, color: textColor, letterSpacing: 3 }}>2 - 1</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--coral)' }}>67&apos;</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
            <div style={{ width: 40, height: 40, background: isDark ? 'rgba(255,255,255,.1)' : 'var(--g100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: isDark ? '#fff' : 'var(--g600)' }}>LIV</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: textColor }}>Liverpool</div>
          </div>
        </div>
      </div>
      <div style={{ padding: '6px 14px', textAlign: 'center', fontSize: 9, color: isDark ? 'rgba(255,255,255,.3)' : 'var(--g400)', background: isDark ? 'rgba(255,255,255,.03)' : 'var(--g50)' }}>
        Powered by <span style={{ color: accentColor, fontWeight: 700 }}>Diurna</span>
      </div>
    </div>
  )
}

function StandingsWidget({ theme, accentColor }: { theme: WidgetTheme; accentColor: string }) {
  const isDark = theme === 'dark'
  const isTransparent = theme === 'transparent'
  const bg = isDark ? '#1a1a2e' : isTransparent ? 'rgba(255,255,255,.85)' : '#fff'
  const textColor = isDark ? '#fff' : 'var(--g900)'
  const teams = [
    { pos: 1, name: 'Arsenal', pts: 73 },
    { pos: 2, name: 'Man City', pts: 70 },
    { pos: 3, name: 'Liverpool', pts: 68 },
    { pos: 4, name: 'Tottenham', pts: 60 },
    { pos: 5, name: 'Chelsea', pts: 55 },
  ]
  return (
    <div style={{ background: bg, borderRadius: 14, overflow: 'hidden', fontFamily: 'var(--sans)', border: isTransparent ? '1px solid rgba(0,0,0,.1)' : 'none' }}>
      <div style={{ height: 3, background: accentColor }} />
      <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.1)' : 'var(--g100)'}` }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: textColor }}>Premier League 2025/26</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: isDark ? 'rgba(255,255,255,.4)' : 'var(--g400)' }}>Diurna</span>
      </div>
      <div style={{ padding: '4px 0' }}>
        {teams.map((t) => (
          <div key={t.pos} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 36px', gap: 8, padding: '7px 12px', alignItems: 'center', fontSize: 11 }}>
            <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: accentColor, color: '#fff', fontWeight: 800, borderRadius: 4, fontSize: 10 }}>{t.pos}</div>
            <div style={{ fontWeight: 600, color: textColor }}>{t.name}</div>
            <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, color: textColor, textAlign: 'center' }}>{t.pts}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '6px 14px', textAlign: 'center', fontSize: 9, color: isDark ? 'rgba(255,255,255,.3)' : 'var(--g400)', background: isDark ? 'rgba(255,255,255,.03)' : 'var(--g50)' }}>
        Powered by <span style={{ color: accentColor, fontWeight: 700 }}>Diurna</span>
      </div>
    </div>
  )
}

function PollWidget({ theme, accentColor }: { theme: WidgetTheme; accentColor: string }) {
  const isDark = theme === 'dark'
  const isTransparent = theme === 'transparent'
  const bg = isDark ? '#1a1a2e' : isTransparent ? 'rgba(255,255,255,.85)' : '#fff'
  const textColor = isDark ? '#fff' : 'var(--g900)'
  return (
    <div style={{ background: bg, borderRadius: 14, overflow: 'hidden', fontFamily: 'var(--sans)', border: isTransparent ? '1px solid rgba(0,0,0,.1)' : 'none' }}>
      <div style={{ height: 3, background: accentColor }} />
      <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.1)' : 'var(--g100)'}` }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: textColor }}>Fan Poll</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: isDark ? 'rgba(255,255,255,.4)' : 'var(--g400)' }}>Diurna</span>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: textColor, marginBottom: 12 }}>Who will win El Clasico?</div>
        {['Real Madrid — 45%', 'Barcelona — 35%', 'Draw — 20%'].map((o) => (
          <div key={o} style={{ padding: '10px 12px', background: isDark ? 'rgba(255,255,255,.06)' : 'var(--g50)', borderRadius: 'var(--rm)', marginBottom: 8, fontSize: 12, fontWeight: 600, color: isDark ? 'rgba(255,255,255,.8)' : 'var(--g700)' }}>
            {o}
          </div>
        ))}
        <div style={{ textAlign: 'center', fontSize: 11, color: isDark ? 'rgba(255,255,255,.4)' : 'var(--g500)', marginTop: 8 }}>12,847 votes</div>
      </div>
      <div style={{ padding: '6px 14px', textAlign: 'center', fontSize: 9, color: isDark ? 'rgba(255,255,255,.3)' : 'var(--g400)', background: isDark ? 'rgba(255,255,255,.03)' : 'var(--g50)' }}>
        Powered by <span style={{ color: accentColor, fontWeight: 700 }}>Diurna</span>
      </div>
    </div>
  )
}

const previewMap: Record<string, (props: { theme: WidgetTheme; accentColor: string }) => React.JSX.Element> = {
  'live-score': LiveScoreWidget,
  'standings': StandingsWidget,
  'h2h': LiveScoreWidget,
  'match-center': LiveScoreWidget,
  'top-scorers': StandingsWidget,
  'team-form': StandingsWidget,
  'player-card': LiveScoreWidget,
  'prediction': LiveScoreWidget,
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

const themeOptions: { id: WidgetTheme; label: string; icon: string }[] = [
  { id: 'light', label: 'Light', icon: '☀' },
  { id: 'dark', label: 'Dark', icon: '🌙' },
  { id: 'transparent', label: 'Glass', icon: '◻' },
  { id: 'custom', label: 'Custom', icon: '🎨' },
]

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

  const PreviewComp = selectedTpl ? previewMap[selectedTpl] : null

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
            <span className="wc-search-icon">🔍</span>
            <input
              className="wc-search-input"
              placeholder="Search matches, leagues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {matchesLoading ? (
            <div style={{ padding: '16px 20px', fontSize: 13, color: 'var(--g400)' }}>Loading today&apos;s matches...</div>
          ) : (
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
          )}
        </div>

        <div className={`wc-step${!step3Ready ? ' disabled' : ''}`}>
          <div className="wc-step-label">
            <div className="wc-step-num">3</div>
            <div className="wc-step-title">Frame &amp; Theme</div>
          </div>
          <div className="wc-config">
            <div className="wc-field">
              <label>Widget Theme</label>
              <div className="wc-theme-grid">
                {themeOptions.map((t) => (
                  <button
                    key={t.id}
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
                <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="wc-color-input" />
                <span className="wc-color-code">{accentColor}</span>
                <div className="wc-accent-presets">
                  {['#00D4AA', '#5B5FFF', '#F43F5E', '#F59E0B', '#1877F2'].map((c) => (
                    <button key={c} className={`wc-accent-dot${accentColor === c ? ' act' : ''}`} style={{ background: c }} onClick={() => setAccentColor(c)} />
                  ))}
                </div>
              </div>
            </div>
            <div className="wc-field">
              <label>Widget Frame</label>
              <div className="wc-frame-info">
                <div className="wc-frame-item"><span className="wc-frame-check">✓</span> Colored top accent bar</div>
                <div className="wc-frame-item"><span className="wc-frame-check">✓</span> Publisher logo in header</div>
                <div className="wc-frame-item"><span className="wc-frame-check">✓</span> &quot;Powered by Diurna&quot; footer</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="wc-preview" style={theme === 'dark' ? { background: '#0a0a1a' } : theme === 'transparent' ? { background: 'linear-gradient(135deg, #667eea, #764ba2)' } : undefined}>
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
              <PreviewComp theme={theme} accentColor={accentColor} />
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
