'use client'

import React, { useMemo } from 'react'

export type WidgetTheme = 'light' | 'dark' | 'glass' | 'custom'
export type MatchPreview = { homeName: string; awayName: string; homeAbbr?: string; awayAbbr?: string }
export type MiniWidgetProps = { theme?: WidgetTheme; accentColor?: string; className?: string; match?: MatchPreview }

const defaultAccent = '#00D4AA'

function getThemeStyles(theme?: WidgetTheme): { card: React.CSSProperties; body: React.CSSProperties; footer: React.CSSProperties } {
  if (theme === 'dark') return {
    card: { background: '#0D1117', color: '#fff' },
    body: { color: 'rgba(255,255,255,0.85)' },
    footer: { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' },
  }
  if (theme === 'glass') return {
    card: { background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(0,0,0,0.08)' },
    body: {},
    footer: { background: 'rgba(0,0,0,0.04)' },
  }
  return { card: {}, body: {}, footer: {} }
}

function WidgetFooter({ accentColor, theme }: { theme?: WidgetTheme; accentColor?: string }) {
  const ac = accentColor || defaultAccent
  const styles = getThemeStyles(theme)
  return (
    <div className="wg-mini-footer" style={styles.footer}>
      <span className="wg-mini-footer-text">Powered by </span>
      <span className="wg-mini-footer-brand" style={{ color: ac }}>Diurna</span>
    </div>
  )
}

function abbrev(name: string, fallback: string): string {
  if (!name) return fallback
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 3)
  return name.slice(0, 3).toUpperCase() || fallback
}

export function MiniLiveScore({ theme, accentColor, className, match }: MiniWidgetProps) {
  const ac = accentColor || defaultAccent
  const themeStyles = getThemeStyles(theme)
  const homeName = match?.homeName ?? 'Man City'
  const awayName = match?.awayName ?? 'Liverpool'
  const homeAbbr = match?.homeAbbr ?? abbrev(homeName, 'MCI')
  const awayAbbr = match?.awayAbbr ?? abbrev(awayName, 'LIV')
  return (
    <div className={`wg-mini wg-mini-ls ${className || ''}`} style={themeStyles.card}>
      <div className="wg-mini-bar wg-mini-bar-dark">
        <span>Premier League</span>
        <span className="wg-mini-live"><span className="wg-mini-dot" />LIVE</span>
      </div>
      <div className="wg-mini-body" style={themeStyles.body}>
        <div className="wg-mini-ls-teams">
          <div className="wg-mini-ls-team">
            <div className="wg-mini-logo" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.2)' : '#6C5CE7', color: '#fff' }}>{homeAbbr}</div>
            <span>{homeName}</span>
          </div>
          <div className="wg-mini-ls-center">
            <span className="wg-mini-score">2 – 1</span>
            <span className="wg-mini-minute">67&apos;</span>
          </div>
          <div className="wg-mini-ls-team">
            <div className="wg-mini-logo" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.2)' : '#E17055', color: '#fff' }}>{awayAbbr}</div>
            <span>{awayName}</span>
          </div>
        </div>
      </div>
      <WidgetFooter theme={theme} accentColor={ac} />
    </div>
  )
}

export function MiniStandings({ theme, accentColor, className }: MiniWidgetProps) {
  const ac = accentColor || defaultAccent
  const themeStyles = getThemeStyles(theme)
  const rows = [
    { pos: 1, name: 'Arsenal', pts: 73 },
    { pos: 2, name: 'Man City', pts: 70 },
    { pos: 3, name: 'Liverpool', pts: 68 },
    { pos: 4, name: 'Chelsea', pts: 55 },
  ]
  return (
    <div className={`wg-mini wg-mini-st ${className || ''}`} style={themeStyles.card}>
      <div className="wg-mini-bar wg-mini-bar-dark">Premier League 25/26</div>
      <div className="wg-mini-body" style={themeStyles.body}>
        {rows.map((r) => (
          <div key={r.pos} className="wg-mini-st-row">
            <span className={`wg-mini-pos ${r.pos <= 3 ? 'brand' : 'grey'}`}>{r.pos}</span>
            <span className="wg-mini-st-name">{r.name}</span>
            <span className="wg-mini-st-pts">{r.pts}</span>
          </div>
        ))}
      </div>
      <WidgetFooter theme={theme} accentColor={ac} />
    </div>
  )
}

export function MiniH2H({ theme, accentColor, className, match }: MiniWidgetProps) {
  const ac = accentColor || defaultAccent
  const themeStyles = getThemeStyles(theme)
  const homeName = match?.homeName ?? 'Real Madrid'
  const awayName = match?.awayName ?? 'Barcelona'
  const homeAbbr = match?.homeAbbr ?? abbrev(homeName, 'RMA')
  const awayAbbr = match?.awayAbbr ?? abbrev(awayName, 'FCB')
  return (
    <div className={`wg-mini wg-mini-h2h ${className || ''}`} style={themeStyles.card}>
      <div className="wg-mini-bar wg-mini-bar-mint" style={{ background: ac }}>Head to Head</div>
      <div className="wg-mini-body" style={themeStyles.body}>
        <div className="wg-mini-h2h-teams">
          <div className="wg-mini-h2h-team">
            <div className="wg-mini-logo" style={{ background: '#FDCB6E', color: '#2d3436' }}>{homeAbbr}</div>
            <span>{homeName}</span>
          </div>
          <span className="wg-mini-vs">VS</span>
          <div className="wg-mini-h2h-team">
            <div className="wg-mini-logo" style={{ background: '#A29BFE', color: '#2d3436' }}>{awayAbbr}</div>
            <span>{awayName}</span>
          </div>
        </div>
        <div className="wg-mini-h2h-bar">
          <div className="wg-mini-h2h-seg home" style={{ width: '41%' }} />
          <div className="wg-mini-h2h-seg draw" style={{ width: '20%' }} />
          <div className="wg-mini-h2h-seg away" style={{ width: '39%' }} />
        </div>
      </div>
      <WidgetFooter theme={theme} accentColor={ac} />
    </div>
  )
}

function seededInt(seed: number, min: number, max: number): number {
  const s = (seed * 1664525 + 1013904223) & 0x7fffffff
  return min + (s % (max - min + 1))
}

export function MiniFanPoll({ theme, accentColor, className }: MiniWidgetProps) {
  const ac = accentColor || defaultAccent
  const themeStyles = getThemeStyles(theme)
  const options = useMemo(() => ['Real Madrid', 'Barcelona', 'Draw'], [])
  const fakeVotes = useMemo(() => options.map((o, i) => seededInt(o.charCodeAt(0) * 31 + i * 97, 1000, 6000)), [options])
  const total = fakeVotes.reduce((a, b) => a + b, 0)
  const pcts = fakeVotes.map((v) => Math.round((v / total) * 100))
  return (
    <div className={`wg-mini wg-mini-poll ${className || ''}`} style={themeStyles.card}>
      <div className="wg-mini-bar wg-mini-bar-purple">Fan Poll</div>
      <div className="wg-mini-body" style={themeStyles.body}>
        <div className="wg-mini-poll-q">Who will win El Clásico?</div>
        {options.map((opt, i) => (
          <div key={i} className="wg-mini-poll-row">
            <div className="wg-mini-poll-bar-wrap">
              <div className="wg-mini-poll-bar" style={{ width: `${pcts[i]}%` }} />
            </div>
            <span className="wg-mini-poll-opt">{opt}</span>
            <span className="wg-mini-poll-pct">{pcts[i]}%</span>
          </div>
        ))}
        <div className="wg-mini-poll-total">12,847 votes</div>
      </div>
      <WidgetFooter theme={theme} accentColor={ac} />
    </div>
  )
}

export function MiniMatchTimeline({ theme, accentColor, className }: MiniWidgetProps) {
  const ac = accentColor || defaultAccent
  const themeStyles = getThemeStyles(theme)
  const events = [
    { min: "12'", type: 'goal', text: 'Haaland — City 1-0' },
    { min: "34'", type: 'yellow', text: 'Robertson' },
    { min: "45'", type: 'goal', text: 'Salah — 1-1' },
    { min: "67'", type: 'goal', text: 'Foden — City 2-1' },
  ]
  return (
    <div className={`wg-mini wg-mini-tl ${className || ''}`} style={themeStyles.card}>
      <div className="wg-mini-bar wg-mini-bar-dark">Match Timeline</div>
      <div className="wg-mini-body" style={themeStyles.body}>
        {events.map((e, i) => (
          <div key={i} className="wg-mini-tl-row">
            <span className="wg-mini-tl-min">{e.min}</span>
            <span className={`wg-mini-tl-icon ${e.type}`}>{e.type === 'goal' ? 'G' : 'Y'}</span>
            <span className="wg-mini-tl-text">{e.text}</span>
          </div>
        ))}
      </div>
      <WidgetFooter theme={theme} accentColor={ac} />
    </div>
  )
}

export function MiniPlayerCard({ theme, accentColor, className }: MiniWidgetProps) {
  const ac = accentColor || defaultAccent
  const themeStyles = getThemeStyles(theme)
  return (
    <div className={`wg-mini wg-mini-pl ${className || ''}`} style={themeStyles.card}>
      <div className="wg-mini-body wg-mini-pl-top" style={themeStyles.body}>
        <div className="wg-mini-pl-avatar" style={{ background: `linear-gradient(135deg, ${ac}, #00B894)` }}>VJ</div>
        <div>
          <div className="wg-mini-pl-name">Vinicius Jr.</div>
          <div className="wg-mini-pl-meta">LW · Real · #7</div>
        </div>
      </div>
      <div className="wg-mini-pl-stats">
        <div className="wg-mini-pl-stat"><span className="wg-mini-pl-val">18</span><span className="wg-mini-pl-lbl">Goals</span></div>
        <div className="wg-mini-pl-stat"><span className="wg-mini-pl-val">12</span><span className="wg-mini-pl-lbl">Assists</span></div>
        <div className="wg-mini-pl-stat"><span className="wg-mini-pl-val">8.4</span><span className="wg-mini-pl-lbl">Rating</span></div>
      </div>
      <WidgetFooter theme={theme} accentColor={ac} />
    </div>
  )
}

export function MiniSportsQuiz({ theme, accentColor, className }: MiniWidgetProps) {
  const ac = accentColor || defaultAccent
  const themeStyles = getThemeStyles(theme)
  return (
    <div className={`wg-mini wg-mini-quiz ${className || ''}`} style={themeStyles.card}>
      <div className="wg-mini-bar wg-mini-bar-purple">Football Trivia</div>
      <div className="wg-mini-body" style={themeStyles.body}>
        <div className="wg-mini-quiz-progress">Question 1 of 5</div>
        <div className="wg-mini-quiz-q">Who won the 2022 World Cup?</div>
        {['A', 'B', 'C', 'D'].map((letter, i) => (
          <div key={letter} className={`wg-mini-quiz-opt ${letter === 'B' ? 'correct' : ''}`}>
            <span className="wg-mini-quiz-letter">{letter}</span>
            {['Brazil', 'Argentina ✓', 'France', 'Germany'][i]}
          </div>
        ))}
      </div>
      <WidgetFooter theme={theme} accentColor={ac} />
    </div>
  )
}

export function MiniAIPrediction({ theme, accentColor, className, match }: MiniWidgetProps) {
  const ac = accentColor || defaultAccent
  const themeStyles = getThemeStyles(theme)
  const homeAbbr = (match?.homeAbbr ?? abbrev(match?.homeName ?? '', 'MCI')) || 'MCI'
  const awayAbbr = (match?.awayAbbr ?? abbrev(match?.awayName ?? '', 'LIV')) || 'LIV'
  return (
    <div className={`wg-mini wg-mini-pred ${className || ''}`} style={themeStyles.card}>
      <div className="wg-mini-bar wg-mini-bar-mint" style={{ background: ac }}>AI Match Prediction</div>
      <div className="wg-mini-body" style={themeStyles.body}>
        <div className="wg-mini-pred-teams">
          <div className="wg-mini-logo" style={{ background: '#6C5CE7', color: '#fff' }}>{homeAbbr}</div>
          <span className="wg-mini-score wg-mini-pred-score">2 – 1</span>
          <div className="wg-mini-logo" style={{ background: '#E17055', color: '#fff' }}>{awayAbbr}</div>
        </div>
        <div className="wg-mini-pred-bar">
          <div className="wg-mini-pred-seg home" style={{ width: '52%' }} />
          <div className="wg-mini-pred-seg draw" style={{ width: '22%' }} />
          <div className="wg-mini-pred-seg away" style={{ width: '26%' }} />
        </div>
      </div>
      <div className="wg-mini-footer wg-mini-pred-footer" style={getThemeStyles(theme).footer}>
        <span className="wg-mini-footer-text">Powered by </span>
        <span className="wg-mini-footer-brand" style={{ color: ac }}>Diurna AI</span>
      </div>
    </div>
  )
}

export function MiniTopScorers({ theme, accentColor, className }: MiniWidgetProps) {
  const ac = accentColor || defaultAccent
  const themeStyles = getThemeStyles(theme)
  const rows = [
    { rank: 1, gold: true, name: 'Haaland', goals: 22 },
    { rank: 2, name: 'Salah', goals: 19 },
    { rank: 3, name: 'Isak', goals: 17 },
    { rank: 4, name: 'Palmer', goals: 14 },
  ]
  return (
    <div className={`wg-mini wg-mini-ts ${className || ''}`} style={themeStyles.card}>
      <div className="wg-mini-bar wg-mini-bar-navy">Top Scorers · PL</div>
      <div className="wg-mini-body" style={themeStyles.body}>
        {rows.map((r) => (
          <div key={r.rank} className="wg-mini-ts-row">
            <span className={`wg-mini-ts-badge ${r.gold ? 'gold' : ''}`}>{r.rank}{r.gold ? '🥇' : ''}</span>
            <span className="wg-mini-ts-name">{r.name}</span>
            <span className="wg-mini-ts-goals">{r.goals}</span>
          </div>
        ))}
      </div>
      <WidgetFooter theme={theme} accentColor={ac} />
    </div>
  )
}

export function MiniMatchCenter({ theme, accentColor, className, match }: MiniWidgetProps) {
  return <MiniLiveScore theme={theme} accentColor={accentColor} className={className} match={match} />
}

export function MiniTeamForm({ theme, accentColor, className }: MiniWidgetProps) {
  const ac = accentColor || defaultAccent
  const themeStyles = getThemeStyles(theme)
  const results = ['W', 'D', 'W', 'L', 'W']
  return (
    <div className={`wg-mini wg-mini-tf ${className || ''}`} style={themeStyles.card}>
      <div className="wg-mini-bar wg-mini-bar-light">Team Form</div>
      <div className="wg-mini-body wg-mini-tf-body" style={themeStyles.body}>
        <div className="wg-mini-tf-dots">
          {results.map((r, i) => (
            <span key={i} className={`wg-mini-tf-dot ${r.toLowerCase()}`}>{r}</span>
          ))}
        </div>
      </div>
      <WidgetFooter theme={theme} accentColor={ac} />
    </div>
  )
}

export function MiniPlayerTradingCard({ theme, accentColor, className }: MiniWidgetProps) {
  const ac = accentColor || defaultAccent
  const themeStyles = getThemeStyles(theme)
  return (
    <div className={`wg-mini wg-mini-pc ${className || ''}`} style={themeStyles.card}>
      <div className="wg-mini-body wg-mini-pc-top" style={themeStyles.body}>
        <div className="wg-mini-pc-photo" style={{ background: `linear-gradient(135deg, ${ac}, #00B894)` }}>EH</div>
        <div>
          <div className="wg-mini-pc-name">Erling Haaland</div>
          <div className="wg-mini-pc-meta">Norway · ST · #9</div>
        </div>
      </div>
      <div className="wg-mini-pl-stats">
        <div className="wg-mini-pl-stat"><span className="wg-mini-pl-val">22</span><span className="wg-mini-pl-lbl">Goals</span></div>
        <div className="wg-mini-pl-stat"><span className="wg-mini-pl-val">5</span><span className="wg-mini-pl-lbl">Assists</span></div>
        <div className="wg-mini-pl-stat"><span className="wg-mini-pl-val">8.6</span><span className="wg-mini-pl-lbl">Rating</span></div>
      </div>
      <WidgetFooter theme={theme} accentColor={ac} />
    </div>
  )
}

export function MiniSurvey({ theme, accentColor, className }: MiniWidgetProps) {
  const ac = accentColor || defaultAccent
  const themeStyles = getThemeStyles(theme)
  return (
    <div className={`wg-mini wg-mini-survey ${className || ''}`} style={themeStyles.card}>
      <div className="wg-mini-bar wg-mini-bar-purple">Fan Survey</div>
      <div className="wg-mini-body" style={themeStyles.body}>
        <div className="wg-mini-survey-q">Rate the match experience</div>
        <div className="wg-mini-survey-scale">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={`wg-mini-survey-dot ${n === 4 ? 'filled' : ''}`}>{n}</span>
          ))}
        </div>
      </div>
      <WidgetFooter theme={theme} accentColor={ac} />
    </div>
  )
}

const miniWidgetMap: Record<string, React.ComponentType<MiniWidgetProps>> = {
  'live-score': MiniLiveScore,
  'standings': MiniStandings,
  'h2h': MiniH2H,
  'poll': MiniFanPoll,
  'timeline': MiniMatchTimeline,
  'player': MiniPlayerCard,
  'match-center': MiniMatchCenter,
  'top-scorers': MiniTopScorers,
  'team-form': MiniTeamForm,
  'player-card': MiniPlayerTradingCard,
  'prediction': MiniAIPrediction,
  'quiz': MiniSportsQuiz,
  'survey': MiniSurvey,
}

export function getMiniWidget(previewId: string, props: MiniWidgetProps): React.ReactNode {
  const Comp = miniWidgetMap[previewId]
  if (!Comp) return null
  return <Comp {...props} />
}
