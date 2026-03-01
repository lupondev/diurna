'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { getMiniWidget } from './shared-mini-widgets'
import './widgets.css'

const FILTER_ALL = 'all'
const FILTER_FOOTBALL = 'football'
const FILTER_ENGAGEMENT = 'engagement'
const FILTER_AI = 'ai'

type Widget = {
  id: string
  name: string
  desc: string
  tag?: { label: string; cls: string }
  embedCode: string
  preview: string
  thumb: string
  filter?: string // football | engagement | ai
}

type PollData = { question: string; options: string[] }
type QuizQuestion = { question: string; options: string[]; correct: number }
type QuizData = { title: string; questions: QuizQuestion[] }
type SurveyQuestion = { question: string; scale: string[] }
type SurveyData = { title: string; questions: SurveyQuestion[] }

const widgets: Widget[] = [
  { id: 'live-score', name: 'Live Score', desc: 'Real-time match scores with live events and minute-by-minute updates.', tag: { label: 'Popular', cls: 'popular' }, embedCode: '<script src="https://cdn.diurna.io/widgets/live-score.js" data-match="auto" data-theme="light"></script>', preview: 'live-score', thumb: 'ls', filter: FILTER_FOOTBALL },
  { id: 'standings', name: 'League Standings', desc: 'Full league table with positions, points, and form indicators.', tag: { label: 'Popular', cls: 'popular' }, embedCode: '<script src="https://cdn.diurna.io/widgets/standings.js" data-league="premier-league" data-theme="light"></script>', preview: 'standings', thumb: 'st', filter: FILTER_FOOTBALL },
  { id: 'h2h', name: 'Head to Head', desc: 'H2H comparison between two teams with historical stats.', tag: { label: 'New', cls: 'new' }, embedCode: '<script src="https://cdn.diurna.io/widgets/h2h.js" data-home="real-madrid" data-away="barcelona" data-theme="light"></script>', preview: 'h2h', thumb: 'h2h', filter: FILTER_FOOTBALL },
  { id: 'poll', name: 'Fan Poll', desc: 'Interactive polls for fan engagement and predictions.', tag: { label: 'AI', cls: 'ai' }, embedCode: '<script src="https://cdn.diurna.io/widgets/poll.js" data-id="auto" data-theme="light"></script>', preview: 'poll', thumb: 'poll', filter: FILTER_ENGAGEMENT },
  { id: 'timeline', name: 'Match Timeline', desc: 'Visual timeline showing goals, cards, and substitutions.', tag: { label: 'New', cls: 'new' }, embedCode: '<script src="https://cdn.diurna.io/widgets/timeline.js" data-match="auto" data-theme="light"></script>', preview: 'timeline', thumb: 'tl', filter: FILTER_FOOTBALL },
  { id: 'player', name: 'Player Card', desc: 'Player stats with season performance and match ratings.', tag: { label: 'Pro', cls: 'pro' }, embedCode: '<script src="https://cdn.diurna.io/widgets/player.js" data-player="vinicius-jr" data-theme="light"></script>', preview: 'player', thumb: 'pl', filter: FILTER_FOOTBALL },
  { id: 'match-center', name: 'Match Center', desc: 'Comprehensive match view with events, lineups, and stats.', tag: { label: 'New', cls: 'new' }, embedCode: '<script src="https://cdn.diurna.io/widgets/match-center.js" data-match="auto" data-theme="light"></script>', preview: 'match-center', thumb: 'mc', filter: FILTER_FOOTBALL },
  { id: 'top-scorers', name: 'Top Scorers', desc: 'League top scorers with goals, assists, and apps.', tag: { label: 'Popular', cls: 'popular' }, embedCode: '<script src="https://cdn.diurna.io/widgets/top-scorers.js" data-league="premier-league" data-theme="light"></script>', preview: 'top-scorers', thumb: 'ts', filter: FILTER_FOOTBALL },
  { id: 'team-form', name: 'Team Form', desc: 'Last 5 match results with W/D/L indicators and scores.', embedCode: '<script src="https://cdn.diurna.io/widgets/team-form.js" data-team="man-city" data-theme="light"></script>', preview: 'team-form', thumb: 'tf', filter: FILTER_FOOTBALL },
  { id: 'player-card', name: 'Player Trading Card', desc: 'Trading card style profile with nationality and stats.', tag: { label: 'Pro', cls: 'pro' }, embedCode: '<script src="https://cdn.diurna.io/widgets/player-card.js" data-player="haaland" data-theme="dark"></script>', preview: 'player-card', thumb: 'pc', filter: FILTER_FOOTBALL },
  { id: 'prediction', name: 'Match Prediction', desc: 'AI-powered match prediction with win probability.', tag: { label: 'AI', cls: 'ai' }, embedCode: '<script src="https://cdn.diurna.io/widgets/prediction.js" data-match="auto" data-theme="light"></script>', preview: 'prediction', thumb: 'pr', filter: FILTER_AI },
  { id: 'quiz', name: 'Sports Quiz', desc: 'AI-generated multiple choice quiz for fan engagement.', tag: { label: 'AI', cls: 'ai' }, embedCode: '<script src="https://cdn.diurna.io/widgets/quiz.js" data-id="auto" data-theme="light"></script>', preview: 'quiz', thumb: 'qz', filter: FILTER_AI },
  { id: 'survey', name: 'Fan Survey', desc: 'AI-generated survey with rating scales for fan feedback.', tag: { label: 'AI', cls: 'ai' }, embedCode: '<script src="https://cdn.diurna.io/widgets/survey.js" data-id="auto" data-theme="light"></script>', preview: 'survey', thumb: 'sv', filter: FILTER_AI },
]

function badgeClass(tag: Widget['tag']): string {
  if (!tag) return ''
  const m: Record<string, string> = { Popular: 'popular', New: 'new', AI: 'ai', Pro: 'pro' }
  return m[tag.label] || tag.cls
}

function LiveScorePremiumPreview() {
  const [dateOffset, setDateOffset] = useState(0)
  const [matchFilter, setMatchFilter] = useState<'all' | 'live' | 'finished' | 'scheduled'>('all')
  const [collapsedLeagues, setCollapsedLeagues] = useState<Set<string>>(new Set())

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 3 + i + dateOffset)
    return d
  })
  const today = new Date()
  const isToday = (d: Date) => d.toDateString() === today.toDateString()

  const groups = [
    { country: 'England', flag: '🏴', leagues: [{ name: 'Premier League', matches: [{ time: '16:00', status: 'live', minute: "67'", home: 'Man United', homeAbbr: 'MU', homeScore: 2, away: 'Chelsea', awayAbbr: 'CHE', awayScore: 1 }, { time: '13:30', status: 'ft', home: 'Liverpool', homeAbbr: 'LIV', homeScore: 5, away: 'West Ham', awayAbbr: 'WHU', awayScore: 2 }, { time: '20:45', status: 'scheduled', home: 'Arsenal', homeAbbr: 'ARS', away: 'Liverpool', awayAbbr: 'LIV' }] }] },
    { country: 'Spain', flag: '🇪🇸', leagues: [{ name: 'La Liga', matches: [{ time: '16:15', status: 'ft', home: 'Barcelona', homeAbbr: 'FCB', homeScore: 4, away: 'Villarreal', awayAbbr: 'VIL', awayScore: 1 }] }] },
  ]

  const toggleLeague = (key: string) => {
    setCollapsedLeagues((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n })
  }

  return (
    <div className="wg-ls-premium">
      <div className="wg-ls-premium-header">
        <div className="wg-ls-premium-title">Live Scores</div>
      </div>
      <div className="wg-ls-calendar">
        <button type="button" className="wg-ls-cal-arrow" onClick={() => setDateOffset((o) => o - 1)} aria-label="Previous days">‹</button>
        <div className="wg-ls-cal-days">
          {days.map((d, i) => (
            <button type="button" key={d.toISOString()} className={`wg-ls-cal-day ${i === 3 ? 'act' : ''}`}>
              <span className="wg-ls-cal-dow">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()].toUpperCase()}</span>
              <span className="wg-ls-cal-num">{d.getDate()}</span>
              {isToday(d) && <span className="wg-ls-cal-today" />}
            </button>
          ))}
        </div>
        <button type="button" className="wg-ls-cal-arrow" onClick={() => setDateOffset((o) => o + 1)} aria-label="Next days">›</button>
      </div>
      <div className="wg-ls-filters">
        <button type="button" className={`wg-ls-filter ${matchFilter === 'all' ? 'act' : ''}`} onClick={() => setMatchFilter('all')}>All</button>
        <button type="button" className={`wg-ls-filter wg-ls-filter-live ${matchFilter === 'live' ? 'act' : ''}`} onClick={() => setMatchFilter('live')}><span className="wg-ls-dot" />Live (3)</button>
        <button type="button" className={`wg-ls-filter ${matchFilter === 'finished' ? 'act' : ''}`} onClick={() => setMatchFilter('finished')}>Finished</button>
        <button type="button" className={`wg-ls-filter ${matchFilter === 'scheduled' ? 'act' : ''}`} onClick={() => setMatchFilter('scheduled')}>Scheduled</button>
      </div>
      <div className="wg-ls-groups">
        {groups.map((g) => (
          <div key={g.country} className="wg-ls-country">
            <div className="wg-ls-country-name">{g.flag} {g.country.toUpperCase()}</div>
            {g.leagues.map((league) => {
              const key = `${g.country}-${league.name}`
              const isCollapsed = collapsedLeagues.has(key)
              return (
                <div key={key} className="wg-ls-league">
                  <button type="button" className="wg-ls-league-head" onClick={() => toggleLeague(key)}>
                    <span>{league.name}</span>
                    <span className="wg-ls-league-tog">{isCollapsed ? '▸' : '▾'}</span>
                  </button>
                  {!isCollapsed && (
                    <div className="wg-ls-league-matches">
                      {league.matches.map((m, i) => (
                        <div key={i} className={`wg-ls-match-row ${m.status === 'live' ? 'live' : ''}`}>
                          <div className="wg-ls-match-time">
                            <span>{m.time}</span>
                            <span className="wg-ls-match-status">{m.status === 'live' ? m.minute : m.status === 'ft' ? 'FT' : m.status === 'ht' ? 'HT' : '—'}</span>
                          </div>
                          <div className="wg-ls-match-sep" />
                          <div className="wg-ls-match-teams">
                            <div className="wg-ls-match-team">
                              <span className="wg-ls-match-logo" style={{ background: '#6C5CE7', color: '#fff' }}>{m.homeAbbr}</span>
                              <span className="wg-ls-match-name">{m.home}</span>
                              <span className="wg-ls-match-score">{m.homeScore ?? '–'}</span>
                            </div>
                            <div className="wg-ls-match-team">
                              <span className="wg-ls-match-logo" style={{ background: '#E17055', color: '#fff' }}>{m.awayAbbr}</span>
                              <span className="wg-ls-match-name">{m.away}</span>
                              <span className="wg-ls-match-score">{m.awayScore ?? '–'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <div className="wg-ls-premium-footer">Powered by <strong className="wg-ls-premium-brand">Diurna</strong></div>
    </div>
  )
}

function LiveScorePreview() {
  return <LiveScorePremiumPreview />
}
function StandingsPreview() {
  const teams = [
    { pos: 1, cls: 'ucl', name: 'Man City', w: 18, d: 3, pts: 57 },
    { pos: 2, cls: 'ucl', name: 'Arsenal', w: 17, d: 4, pts: 55 },
    { pos: 3, cls: 'ucl', name: 'Liverpool', w: 16, d: 5, pts: 53 },
    { pos: 4, cls: 'ucl', name: 'Chelsea', w: 14, d: 6, pts: 48 },
    { pos: 5, cls: 'uel', name: 'Spurs', w: 13, d: 5, pts: 44 },
  ]
  return (
    <div className="wg-standings">
      <div className="wg-st-header">Premier League 2025/26</div>
      <div className="wg-st-thead"><span>#</span><span>Team</span><span>W</span><span>D</span><span>Pts</span></div>
      {teams.map((t) => (
        <div key={t.pos} className="wg-st-row">
          <span className={`wg-st-pos ${t.cls}`}>{t.pos}</span>
          <div className="wg-st-team">{t.name}</div>
          <span className="wg-st-stat">{t.w}</span><span className="wg-st-stat">{t.d}</span><span className="wg-st-pts">{t.pts}</span>
        </div>
      ))}
    </div>
  )
}
function H2HPreview() {
  return (
    <div className="wg-h2h">
      <div className="wg-h2h-header">Head to Head</div>
      <div className="wg-h2h-teams">
        <div className="wg-h2h-team"><div className="wg-h2h-logo">RMA</div><div className="wg-h2h-name">Real Madrid</div></div>
        <div className="wg-h2h-vs">VS</div>
        <div className="wg-h2h-team"><div className="wg-h2h-logo">FCB</div><div className="wg-h2h-name">Barcelona</div></div>
      </div>
      <div className="wg-h2h-stats">
        <div><div className="wg-h2h-stat-val highlight">105</div><div className="wg-h2h-stat-label">RM Wins</div></div>
        <div><div className="wg-h2h-stat-val">52</div><div className="wg-h2h-stat-label">Draws</div></div>
        <div><div className="wg-h2h-stat-val">100</div><div className="wg-h2h-stat-label">FCB Wins</div></div>
      </div>
      <div className="wg-h2h-bar"><div className="wg-h2h-seg home" style={{ width: '41%' }} /><div className="wg-h2h-seg draw" style={{ width: '20%' }} /><div className="wg-h2h-seg away" style={{ width: '39%' }} /></div>
    </div>
  )
}

/* Stable fake vote counts — seeded so they don't change on re-render */
function seededInt(seed: number, min: number, max: number): number {
  const s = (seed * 1664525 + 1013904223) & 0x7fffffff
  return min + (s % (max - min + 1))
}

function PollPreview({ data }: { data?: PollData }) {
  const [voted, setVoted] = useState<number | null>(null)
  const question = data?.question || 'Who will win El Clasico?'
  const options = data?.options || ['Real Madrid', 'Barcelona', 'Draw']

  // Stable vote counts derived from option text — no Math.random() in render
  const fakeVotes = useMemo(
    () => options.map((opt, i) => seededInt(opt.charCodeAt(0) * 31 + i * 97, 1000, 6000)),
    [options]
  )
  const totalVotes = fakeVotes.reduce((a, b) => a + b, 0)

  return (
    <div className="wg-poll">
      <div className="wg-poll-header">Fan Poll</div>
      <div className="wg-poll-body">
        <div className="wg-poll-q">{question}</div>
        {options.map((opt, i) => (
          <div key={i} className={`wg-poll-opt${voted === i ? ' selected' : ''}`} onClick={() => setVoted(i)}>
            <span className="wg-poll-opt-text">{opt}</span>
            {voted !== null && <div className="wg-poll-bar" style={{ width: `${Math.round(fakeVotes[i] / totalVotes * 100)}%` }} />}
            {voted !== null && <span className="wg-poll-pct">{Math.round(fakeVotes[i] / totalVotes * 100)}%</span>}
          </div>
        ))}
        {voted !== null && <div className="wg-poll-total">{totalVotes.toLocaleString()} votes</div>}
      </div>
    </div>
  )
}
function TimelinePreview() {
  const events = [
    { min: "12'", icon: 'G', text: 'Haaland — Man City 1-0' },
    { min: "34'", icon: 'Y', text: 'Robertson — Yellow Card' },
    { min: "45'", icon: 'G', text: 'Salah — Man City 1-1' },
    { min: "58'", icon: 'S', text: 'De Bruyne > Foden' },
    { min: "67'", icon: 'G', text: 'Foden — Man City 2-1' },
  ]
  return (
    <div className="wg-timeline">
      <div className="wg-tl-header">Match Timeline</div>
      <div className="wg-tl-events">{events.map((e, i) => (
        <div key={i} className="wg-tl-event"><span className="wg-tl-min">{e.min}</span><span className={`wg-tl-badge ${e.icon === 'G' ? 'goal' : e.icon === 'Y' ? 'yellow' : 'sub'}`}>{e.icon}</span><span className="wg-tl-text">{e.text}</span></div>
      ))}</div>
    </div>
  )
}
function PlayerPreview() {
  return (
    <div className="wg-player">
      <div className="wg-pl-header"><div className="wg-pl-avatar">VJ</div><div className="wg-pl-name">Vinicius Jr.</div><div className="wg-pl-pos">LW &middot; Real Madrid &middot; #7</div></div>
      <div className="wg-pl-stats">
        <div className="wg-pl-stat"><div className="wg-pl-stat-val">18</div><div className="wg-pl-stat-label">Goals</div></div>
        <div className="wg-pl-stat"><div className="wg-pl-stat-val">12</div><div className="wg-pl-stat-label">Assists</div></div>
        <div className="wg-pl-stat"><div className="wg-pl-stat-val">8.4</div><div className="wg-pl-stat-label">Rating</div></div>
      </div>
    </div>
  )
}
function MatchCenterPreview() {
  return (
    <div className="wg-mc">
      <div className="wg-mc-header"><span>Premier League</span><span className="wg-mc-live"><span className="wg-ls-dot" />LIVE 67&apos;</span></div>
      <div className="wg-mc-score">
        <div className="wg-mc-team"><div className="wg-mc-logo">MCI</div>Man City</div>
        <div className="wg-mc-result">2 - 1</div>
        <div className="wg-mc-team"><div className="wg-mc-logo">LIV</div>Liverpool</div>
      </div>
      <div className="wg-mc-tabs"><span className="wg-mc-tab act">Events</span><span className="wg-mc-tab">Lineups</span><span className="wg-mc-tab">Stats</span></div>
      <div className="wg-mc-events">
        <div className="wg-mc-evt"><span className="wg-mc-min">12&apos;</span><span>G</span><span>Haaland</span></div>
        <div className="wg-mc-evt"><span className="wg-mc-min">34&apos;</span><span>Y</span><span>Robertson</span></div>
        <div className="wg-mc-evt right"><span>Salah</span><span>G</span><span className="wg-mc-min">45&apos;</span></div>
        <div className="wg-mc-evt"><span className="wg-mc-min">67&apos;</span><span>G</span><span>Foden</span></div>
      </div>
    </div>
  )
}
function TopScorersPreview() {
  const scorers = [
    { rank: 1, name: 'E. Haaland', team: 'Man City', goals: 22, assists: 5, apps: 24 },
    { rank: 2, name: 'M. Salah', team: 'Liverpool', goals: 19, assists: 12, apps: 25 },
    { rank: 3, name: 'A. Isak', team: 'Newcastle', goals: 17, assists: 4, apps: 24 },
    { rank: 4, name: 'B. Saka', team: 'Arsenal', goals: 15, assists: 10, apps: 25 },
    { rank: 5, name: 'C. Palmer', team: 'Chelsea', goals: 14, assists: 8, apps: 23 },
  ]
  return (
    <div className="wg-ts">
      <div className="wg-ts-header">Top Scorers — Premier League</div>
      <div className="wg-ts-thead"><span>#</span><span>Player</span><span>G</span><span>A</span><span>MP</span></div>
      {scorers.map((s, i) => (
        <div key={s.rank} className={`wg-ts-row${i % 2 === 1 ? ' alt' : ''}`}>
          <span className="wg-ts-rank">{s.rank}</span>
          <div className="wg-ts-player"><div><div className="wg-ts-name">{s.name}</div><div className="wg-ts-team">{s.team}</div></div></div>
          <span className="wg-ts-goals">{s.goals}</span><span className="wg-ts-stat">{s.assists}</span><span className="wg-ts-stat">{s.apps}</span>
        </div>
      ))}
    </div>
  )
}
function TeamFormPreview() {
  const results = [
    { opp: 'Arsenal', score: '2-1', result: 'W' },
    { opp: 'Chelsea', score: '1-1', result: 'D' },
    { opp: 'Wolves', score: '4-0', result: 'W' },
    { opp: 'Spurs', score: '0-1', result: 'L' },
    { opp: 'Everton', score: '3-1', result: 'W' },
  ]
  return (
    <div className="wg-tf">
      <div className="wg-tf-header"><div className="wg-tf-team-info"><div className="wg-tf-logo">MCI</div><div><div className="wg-tf-team-name">Manchester City</div><div className="wg-tf-pos">1st in Premier League</div></div></div></div>
      <div className="wg-tf-form">{results.map((r) => (<div key={r.opp} className={`wg-tf-dot ${r.result.toLowerCase()}`}>{r.result}</div>))}</div>
      <div className="wg-tf-matches">{results.map((r) => (
        <div key={r.opp} className="wg-tf-match"><span className={`wg-tf-result ${r.result.toLowerCase()}`}>{r.result}</span><span className="wg-tf-opp">vs {r.opp}</span><span className="wg-tf-score">{r.score}</span></div>
      ))}</div>
    </div>
  )
}
function PlayerCardPreview() {
  return (
    <div className="wg-pc">
      <div className="wg-pc-header"><div className="wg-pc-photo">EH</div><div className="wg-pc-badge">MCI</div></div>
      <div className="wg-pc-info"><div className="wg-pc-name">Erling Haaland</div><div className="wg-pc-detail">Norway &middot; ST &middot; #9</div></div>
      <div className="wg-pc-stats">
        <div className="wg-pc-s"><div className="wg-pc-sv">22</div><div className="wg-pc-sl">Goals</div></div>
        <div className="wg-pc-s"><div className="wg-pc-sv">5</div><div className="wg-pc-sl">Assists</div></div>
        <div className="wg-pc-s"><div className="wg-pc-sv">24</div><div className="wg-pc-sl">Apps</div></div>
        <div className="wg-pc-s"><div className="wg-pc-sv">8.6</div><div className="wg-pc-sl">Rating</div></div>
      </div>
    </div>
  )
}
function PredictionPreview() {
  return (
    <div className="wg-pred">
      <div className="wg-pred-header">AI Match Prediction</div>
      <div className="wg-pred-teams">
        <div className="wg-pred-team"><div className="wg-pred-logo">MCI</div><span>Man City</span></div>
        <div className="wg-pred-score">2 - 1</div>
        <div className="wg-pred-team"><div className="wg-pred-logo">LIV</div><span>Liverpool</span></div>
      </div>
      <div className="wg-pred-bar">
        <div className="wg-pred-seg home" style={{ width: '52%' }}>52%</div>
        <div className="wg-pred-seg draw" style={{ width: '22%' }}>22%</div>
        <div className="wg-pred-seg away" style={{ width: '26%' }}>26%</div>
      </div>
      <div className="wg-pred-factors">
        <div className="wg-pred-factor">City unbeaten in 8 home games</div>
        <div className="wg-pred-factor">Haaland scored in last 5 matches</div>
        <div className="wg-pred-factor">H2H: City lead 3-1 this season</div>
      </div>
      <div className="wg-pred-badge">Powered by Diurna AI</div>
    </div>
  )
}
function QuizPreview({ data }: { data?: QuizData }) {
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)

  const defaultQuestions: QuizQuestion[] = [
    { question: 'Who won the 2022 World Cup?', options: ['Brazil', 'France', 'Argentina', 'Germany'], correct: 2 },
    { question: "How many Ballon d'Ors has Messi won?", options: ['6', '7', '8', '5'], correct: 2 },
    { question: 'Which club has won the most Champions League titles?', options: ['AC Milan', 'Barcelona', 'Bayern Munich', 'Real Madrid'], correct: 3 },
  ]
  const questions = data?.questions || defaultQuestions
  const title = data?.title || 'Football Trivia'

  function handleAnswer(idx: number) {
    if (selected !== null) return
    setSelected(idx)
    if (idx === questions[current].correct) setScore((s) => s + 1)
    setTimeout(() => {
      if (current < questions.length - 1) { setCurrent((c) => c + 1); setSelected(null) }
      else setFinished(true)
    }, 1200)
  }

  if (finished) {
    return (
      <div className="wg-quiz">
        <div className="wg-quiz-header">{title}</div>
        <div className="wg-quiz-body">
          <div className="wg-quiz-done">
            <div className="wg-quiz-score">{score}/{questions.length}</div>
            <div className="wg-quiz-label">Your Score</div>
            <button className="wg-quiz-retry" onClick={() => { setCurrent(0); setSelected(null); setScore(0); setFinished(false) }}>Try Again</button>
          </div>
        </div>
      </div>
    )
  }

  const q = questions[current]
  return (
    <div className="wg-quiz">
      <div className="wg-quiz-header">{title}</div>
      <div className="wg-quiz-body">
        <div className="wg-quiz-progress">Question {current + 1} of {questions.length}</div>
        <div className="wg-quiz-q">{q.question}</div>
        <div className="wg-quiz-opts">
          {q.options.map((opt, i) => (
            <button key={i} className={`wg-quiz-opt${selected === i ? (i === q.correct ? ' correct' : ' wrong') : ''} ${selected !== null && i === q.correct ? ' correct' : ''}`} onClick={() => handleAnswer(i)}>
              <span className="wg-quiz-letter">{String.fromCharCode(65 + i)}</span>
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
function SurveyPreview({ data }: { data?: SurveyData }) {
  const [ratings, setRatings] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)

  const defaultQuestions: SurveyQuestion[] = [
    { question: 'How would you rate the match atmosphere?', scale: ['1', '2', '3', '4', '5'] },
    { question: 'Rate the referee performance', scale: ['1', '2', '3', '4', '5'] },
    { question: 'How likely are you to attend the next match?', scale: ['1', '2', '3', '4', '5'] },
  ]
  const questions = data?.questions || defaultQuestions
  const title = data?.title || 'Fan Survey'

  if (submitted) {
    return (
      <div className="wg-survey">
        <div className="wg-survey-header">{title}</div>
        <div className="wg-survey-body">
          <div className="wg-survey-thanks">
            <div className="wg-survey-thanks-icon">&#10003;</div>
            <div className="wg-survey-thanks-text">Thank you for your feedback!</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="wg-survey">
      <div className="wg-survey-header">{title}</div>
      <div className="wg-survey-body">
        {questions.map((q, qi) => (
          <div key={qi} className="wg-survey-q">
            <div className="wg-survey-q-text">{q.question}</div>
            <div className="wg-survey-scale">
              {q.scale.map((_, si) => (
                <button key={si} className={`wg-survey-dot${ratings[qi] === si ? ' active' : ''}`} onClick={() => setRatings((r) => ({ ...r, [qi]: si }))}>
                  {si + 1}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button className="wg-survey-submit" onClick={() => setSubmitted(true)} disabled={Object.keys(ratings).length < questions.length}>
          Submit Survey
        </button>
      </div>
    </div>
  )
}

function getPreviewComponent(preview: string, aiData?: { poll?: PollData; quiz?: QuizData; survey?: SurveyData }) {
  switch (preview) {
    case 'live-score': return <LiveScorePreview />
    case 'standings': return <StandingsPreview />
    case 'h2h': return <H2HPreview />
    case 'poll': return <PollPreview data={aiData?.poll} />
    case 'timeline': return <TimelinePreview />
    case 'player': return <PlayerPreview />
    case 'match-center': return <MatchCenterPreview />
    case 'top-scorers': return <TopScorersPreview />
    case 'team-form': return <TeamFormPreview />
    case 'player-card': return <PlayerCardPreview />
    case 'prediction': return <PredictionPreview />
    case 'quiz': return <QuizPreview data={aiData?.quiz} />
    case 'survey': return <SurveyPreview data={aiData?.survey} />
    default: return null
  }
}

const interactiveTypes = new Set(['poll', 'quiz', 'survey'])

function AIGenerateForm({ type, onGenerated }: { type: string; onGenerated: (data: PollData | QuizData | SurveyData) => void }) {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGenerate() {
    if (!topic.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai/widget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, topic }),
      })
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        throw new Error(err.error || 'Generation failed')
      }
      const result = await res.json() as { data: PollData | QuizData | SurveyData }
      onGenerated(result.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  const placeholder = type === 'poll' ? 'e.g. El Clasico winner prediction' : type === 'quiz' ? 'e.g. Premier League 2025 season' : 'e.g. Match day experience feedback'

  return (
    <div className="wg-ai-form">
      <div className="wg-ai-form-title">AI Generate {type === 'poll' ? 'Poll' : type === 'quiz' ? 'Quiz' : 'Survey'}</div>
      <div className="wg-ai-form-desc">Enter a topic and let AI create the content for you.</div>
      <div className="wg-ai-form-row">
        <input className="wg-ai-form-input" placeholder={placeholder} value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleGenerate()} />
        <button className="wg-ai-form-btn" onClick={handleGenerate} disabled={loading || !topic.trim()}>
          {loading ? 'Generating...' : 'AI Generate'}
        </button>
      </div>
      {error && <div className="wg-ai-form-error">{error}</div>}
    </div>
  )
}

function buildEmbedCode(widgetScript: string): string {
  return `<div style="display:flex;flex-direction:column;align-items:center;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#fff">
  ${widgetScript}
  <div style="width:100%;height:1px;background:#e5e7eb"></div>
  <div id="diurna-related" style="width:100%;padding:12px 16px">
    <script src="https://cdn.diurna.io/widgets/related.js" data-count="3" data-source="auto"></script>
  </div>
  <div style="width:100%;height:1px;background:#e5e7eb"></div>
  <div style="display:flex;flex-direction:column;align-items:center;padding:12px 20px 20px">
    <div style="font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;margin-bottom:10px">Powered by <strong style="color:#00D4AA">Diurna</strong></div>
    <div id="diurna-ad-300x250">
      <script src="https://cdn.luponmedia.com/ssp/ad-slot.js" data-size="300x250" data-placement="widget-below"></script>
    </div>
  </div>
</div>`
}

export default function WidgetsPage() {
  const [embedModal, setEmbedModal] = useState<{ code: string; name: string } | null>(null)
  const [previewModal, setPreviewModal] = useState<{ widget: Widget } | null>(null)
  const [aiModal, setAiModal] = useState<{ widget: Widget } | null>(null)
  const [aiData, setAiData] = useState<{ poll?: PollData; quiz?: QuizData; survey?: SurveyData }>({})
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(FILTER_ALL)

  useEffect(() => { setMounted(true) }, [])

  const filteredWidgets = useMemo(() => {
    return widgets.filter((w) => {
      const matchSearch = !search.trim() || w.name.toLowerCase().includes(search.toLowerCase()) || w.desc.toLowerCase().includes(search.toLowerCase())
      const matchFilter = filter === FILTER_ALL || w.filter === filter
      return matchSearch && matchFilter
    })
  }, [search, filter])

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  function openEmbed(w: Widget) { setCopied(false); setEmbedModal({ code: buildEmbedCode(w.embedCode), name: w.name }) }

  function openPreview(w: Widget) {
    if (interactiveTypes.has(w.id)) {
      setAiModal({ widget: w })
    } else {
      setPreviewModal({ widget: w })
    }
  }

  function handleAiGenerated(type: string, data: PollData | QuizData | SurveyData) {
    setAiData((prev) => ({ ...prev, [type]: data }))
    if (aiModal) {
      setAiModal(null)
      setPreviewModal({ widget: aiModal.widget })
    }
  }

  return (
    <div className="wg-page">
      <div className="wg-header">
        <div className="wg-badge">WIDGET LIBRARY</div>
        <h1 className="wg-title">Football Widgets</h1>
        <p className="wg-subtitle">Embeddable sports widgets with AI generation. Live scores, standings, polls, quizzes, and more.</p>
      </div>

      <div className="wg-search-row">
        <input
          type="search"
          className="wg-search-input"
          placeholder="Search widgets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search widgets"
        />
        <div className="wg-filter-pills">
          <button type="button" className={`wg-filter-pill ${filter === FILTER_ALL ? 'act' : ''}`} onClick={() => setFilter(FILTER_ALL)}>All</button>
          <button type="button" className={`wg-filter-pill ${filter === FILTER_FOOTBALL ? 'act' : ''}`} onClick={() => setFilter(FILTER_FOOTBALL)}>Football</button>
          <button type="button" className={`wg-filter-pill ${filter === FILTER_ENGAGEMENT ? 'act' : ''}`} onClick={() => setFilter(FILTER_ENGAGEMENT)}>Engagement</button>
          <button type="button" className={`wg-filter-pill ${filter === FILTER_AI ? 'act' : ''}`} onClick={() => setFilter(FILTER_AI)}>AI Powered</button>
        </div>
      </div>

      <div className="wg-grid">
        {filteredWidgets.map((w, i) => (
          <div key={w.id} className="wg-card" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="wg-card-preview">
              {w.tag && <span className={`wg-card-badge ${badgeClass(w.tag)}`}>{w.tag.label}</span>}
              <div className="wg-card-preview-inner">
                {getMiniWidget(w.preview, {})}
              </div>
            </div>
            <div className="wg-card-body">
              <div className="wg-card-name">{w.name}</div>
              <div className="wg-card-desc">{w.desc}</div>
              <div className="wg-card-actions">
                <button type="button" className="wg-btn primary" onClick={() => openEmbed(w)}>Embed</button>
                <button type="button" className="wg-btn secondary" onClick={() => openPreview(w)}>Preview</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {mounted && aiModal && createPortal(
        <div className="wg-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setAiModal(null) }}>
          <div className="wg-modal-sm">
            <div className="wg-modal-head">
              <div className="wg-modal-title">Create {aiModal.widget.name}</div>
              <button className="wg-modal-close" onClick={() => setAiModal(null)}>&times;</button>
            </div>
            <div className="wg-modal-body-ai">
              <AIGenerateForm type={aiModal.widget.id} onGenerated={(data) => handleAiGenerated(aiModal.widget.id, data)} />
              <div className="wg-ai-or">or</div>
              <button className="wg-ai-skip" onClick={() => { setAiModal(null); setPreviewModal({ widget: aiModal.widget }) }}>
                Use Default Preview
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {mounted && previewModal && createPortal(
        <div className="wg-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setPreviewModal(null) }}>
          <div className="wg-preview-modal">
            <div className="wg-modal-head">
              <div className="wg-modal-title">{previewModal.widget.name} — Live Preview</div>
              <button className="wg-modal-close" onClick={() => setPreviewModal(null)}>&times;</button>
            </div>
            <div className="wg-preview-body">
              <div className="wg-preview-frame">
                {getPreviewComponent(previewModal.widget.preview, aiData)}
              </div>
            </div>
            <div className="wg-preview-foot">
              <div className="wg-preview-foot-info">
                Widget renders as one unit on your site with related articles and ad slot below.
              </div>
              <div className="wg-preview-foot-actions">
                <button className="wg-btn secondary" onClick={() => setPreviewModal(null)}>Close</button>
                <button className="wg-btn primary" onClick={() => { setPreviewModal(null); openEmbed(previewModal.widget) }}>Get Embed Code</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {mounted && embedModal && createPortal(
        <div className="wg-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEmbedModal(null) }}>
          <div className="wg-embed-modal">
            <div className="wg-modal-head">
              <div className="wg-modal-title">Embed Code — {embedModal.name}</div>
              <button className="wg-modal-close" onClick={() => setEmbedModal(null)}>&times;</button>
            </div>
            <div className="wg-embed-body">
              <textarea className="wg-embed-code" rows={8} readOnly value={embedModal.code} />
              <button className="wg-embed-copy" onClick={() => handleCopy(embedModal.code)}>
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              <div className="wg-embed-hint">
                <strong>Includes related articles + 300x250 ad slot</strong> powered by Lupon Media SSP.
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
