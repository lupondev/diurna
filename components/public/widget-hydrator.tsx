'use client'

import { useState } from 'react'

/* ═══════════════════════════════════════════════════
   COLORS
   ═══════════════════════════════════════════════════ */

const C = {
  bg: '#0d1117',
  card: '#161b22',
  surface: '#1c2333',
  accent: '#ff6b35',
  accentSoft: 'rgba(255,107,53,0.15)',
  teal: '#2dd4bf',
  text: '#e6edf3',
  muted: '#8b949e',
  border: '#30363d',
  white: '#ffffff',
  success: '#3fb950',
  error: '#f85149',
  gold: '#f0b429',
}

/* ═══════════════════════════════════════════════════
   Match Widget — SofaScore inspired
   ═══════════════════════════════════════════════════ */

function MatchWidget({ home, away, homeShort, awayShort, score, date, league, status }: {
  home: string; away: string; homeShort?: string; awayShort?: string
  score: string; date: string; league: string; status: string
}) {
  const [h, a] = score.split('-').map(s => s.trim())
  const hCode = homeShort || home.slice(0, 3).toUpperCase()
  const aCode = awayShort || away.slice(0, 3).toUpperCase()

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)',
      borderRadius: 16, padding: '20px 24px', margin: '24px 0',
      border: `1px solid ${C.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
    }}>
      {/* Competition */}
      <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: C.accent, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 20 }}>
        {league}
      </div>

      {/* Teams + Score */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
        {/* Home */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 10px',
            background: 'linear-gradient(135deg, #da1e37, #c71f37)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: C.white,
            boxShadow: '0 2px 12px rgba(218,30,55,0.3)',
          }}>{hCode}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{home}</div>
        </div>

        {/* Score */}
        <div style={{ textAlign: 'center', padding: '0 20px', minWidth: 100 }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: C.white, letterSpacing: 2, lineHeight: 1 }}>
            {h}<span style={{ color: C.muted, margin: '0 4px' }}>:</span>{a}
          </div>
          <div style={{
            display: 'inline-block', marginTop: 8, padding: '3px 12px', borderRadius: 12,
            background: status === 'FT' ? 'rgba(63,185,80,0.15)' : C.accentSoft,
            color: status === 'FT' ? C.success : C.accent, fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
          }}>{status || 'FT'}</div>
        </div>

        {/* Away */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 10px',
            background: 'linear-gradient(135deg, #c4b5fd, #7c3aed)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: C.white,
            boxShadow: '0 2px 12px rgba(124,58,237,0.3)',
          }}>{aCode}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{away}</div>
        </div>
      </div>

      {/* Date */}
      {date && (
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: C.muted }}>{date}</div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Player Card — FIFA-style premium card
   ═══════════════════════════════════════════════════ */

function PlayerCardWidget({ name, team, position, nationality, age, rating, goals, assists, marketValue }: {
  name: string; team: string; position: string; nationality?: string; age?: string
  rating?: string; goals?: string; assists?: string; marketValue?: string
}) {
  const ratingNum = parseFloat(rating || '0')
  const ratingColor = ratingNum >= 8 ? C.success : ratingNum >= 7 ? C.gold : C.accent

  const stats: { label: string; value: string; highlight?: boolean }[] = []
  if (rating) stats.push({ label: 'Ocjena', value: rating, highlight: true })
  if (goals) stats.push({ label: 'Golovi', value: goals })
  if (assists) stats.push({ label: 'Asistencije', value: assists })
  if (marketValue) stats.push({ label: 'Vrijednost', value: marketValue })

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      borderRadius: 16, overflow: 'hidden', margin: '24px 0',
      border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      {/* Top section */}
      <div style={{ padding: '24px 24px 20px', display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Player avatar */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #ff6b35, #ff8f65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 28, color: C.white,
          boxShadow: '0 0 0 3px rgba(255,107,53,0.3), 0 4px 16px rgba(255,107,53,0.2)',
        }}>
          {name.split(' ').map(n => n[0]).join('')}
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.white, lineHeight: 1.2 }}>{name}</div>
          <div style={{ fontSize: 14, color: C.accent, fontWeight: 600, marginTop: 4 }}>{team}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            {position && <span style={{ fontSize: 12, color: C.muted, background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 6 }}>{position}</span>}
            {nationality && <span style={{ fontSize: 12, color: C.muted, background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 6 }}>{nationality}</span>}
            {age && <span style={{ fontSize: 12, color: C.muted, background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 6 }}>{age} god.</span>}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      {stats.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: '16px 8px',
              borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}>
              <div style={{
                fontSize: s.highlight ? 28 : 22, fontWeight: 800, lineHeight: 1,
                color: s.highlight ? ratingColor : C.white,
              }}>{s.value}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Video Widget — Direct YouTube embed
   ═══════════════════════════════════════════════════ */

function VideoWidget({ url, caption }: { url: string; caption: string }) {
  let embedUrl = url
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`

  return (
    <div style={{ margin: '24px 0' }}>
      <div style={{
        position: 'relative', paddingBottom: '56.25%', borderRadius: 12, overflow: 'hidden',
        background: '#000', boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}>
        <iframe
          src={embedUrl}
          title={caption || 'Video'}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        />
      </div>
      {caption && (
        <div style={{ textAlign: 'center', marginTop: 10, fontSize: 13, color: C.muted, fontStyle: 'italic' }}>{caption}</div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Stats Table — Horizontal bar comparison (SofaScore)
   ═══════════════════════════════════════════════════ */

type StatRow = { label: string; home: string; away: string; homeVal: number; awayVal: number }

function StatsTableWidget({ title, home, away, stats, headers, rows }: {
  title: string; home?: string; away?: string; stats?: StatRow[]; headers?: string[]; rows?: string[][]
}) {
  // Support new format (stats JSON array) and legacy format (headers + rows)
  let statRows: StatRow[] = stats || []
  if (statRows.length === 0 && rows && rows.length > 0 && headers && headers.length >= 3) {
    // Convert legacy format: headers=["", "Benfica", "Real Madrid"], rows=[["Posjed lopte", "45%", "55%"], ...]
    const homeName = headers[1] || 'Home'
    const awayName = headers[2] || 'Away'
    statRows = rows.map(row => {
      const hv = parseFloat(row[1]) || 0
      const av = parseFloat(row[2]) || 0
      return { label: row[0], home: row[1], away: row[2], homeVal: hv, awayVal: av }
    })
    if (!home) home = homeName
    if (!away) away = awayName
  }

  return (
    <div style={{
      background: C.card, borderRadius: 16, padding: '20px 24px', margin: '24px 0',
      border: `1px solid ${C.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
    }}>
      {/* Header */}
      {title && (
        <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: C.accent, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>
          Statistika utakmice
        </div>
      )}
      {(home || away) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, padding: '0 4px' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{home}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{away}</span>
        </div>
      )}

      {/* Stat rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {statRows.map((stat, i) => {
          const total = stat.homeVal + stat.awayVal
          const homePct = total > 0 ? (stat.homeVal / total) * 100 : 50
          const awayPct = total > 0 ? (stat.awayVal / total) * 100 : 50
          const homeWins = stat.homeVal > stat.awayVal
          const awayWins = stat.awayVal > stat.homeVal

          return (
            <div key={i}>
              {/* Values + Label */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: homeWins ? C.accent : C.text, minWidth: 40 }}>{stat.home}</span>
                <span style={{ fontSize: 12, color: C.muted, textAlign: 'center', flex: 1 }}>{stat.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: awayWins ? C.teal : C.text, minWidth: 40, textAlign: 'right' }}>{stat.away}</span>
              </div>
              {/* Bar */}
              <div style={{ display: 'flex', gap: 3, height: 6, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  width: `${homePct}%`, borderRadius: '3px 0 0 3px',
                  background: homeWins ? C.accent : 'rgba(255,255,255,0.12)',
                  transition: 'width 0.5s ease',
                }} />
                <div style={{
                  width: `${awayPct}%`, borderRadius: '0 3px 3px 0',
                  background: awayWins ? C.teal : 'rgba(255,255,255,0.12)',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Poll — Clean modern design
   ═══════════════════════════════════════════════════ */

function PollWidget({ question, options }: { question: string; options: string[] }) {
  const [voted, setVoted] = useState<number | null>(null)
  const [votes, setVotes] = useState<number[]>(() => options.map(() => Math.floor(Math.random() * 40) + 10))

  function handleVote(idx: number) {
    if (voted !== null) return
    setVoted(idx)
    setVotes(prev => prev.map((v, i) => (i === idx ? v + 1 : v)))
  }

  const total = votes.reduce((a, b) => a + b, 0)

  return (
    <div style={{
      background: C.card, borderRadius: 16, padding: '24px', margin: '24px 0',
      border: `1px solid ${C.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.accent, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 }}>
        Anketa
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px', color: C.white, lineHeight: 1.4 }}>{question}</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {options.map((opt, i) => {
          const pct = total > 0 ? Math.round((votes[i] / total) * 100) : 0
          const isWinner = voted !== null && pct === Math.max(...options.map((_, j) => total > 0 ? Math.round((votes[j] / total) * 100) : 0))

          return (
            <button
              key={i}
              onClick={() => handleVote(i)}
              disabled={voted !== null}
              style={{
                position: 'relative', padding: '14px 18px', borderRadius: 12, overflow: 'hidden',
                border: voted === i ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
                background: 'transparent', color: C.text, textAlign: 'left', fontSize: 15, fontWeight: 500,
                cursor: voted !== null ? 'default' : 'pointer', transition: 'all 0.2s',
              }}
            >
              {voted !== null && (
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${pct}%`,
                  background: voted === i
                    ? 'linear-gradient(90deg, rgba(255,107,53,0.25), rgba(255,107,53,0.1))'
                    : isWinner
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(255,255,255,0.03)',
                  transition: 'width 0.6s ease',
                  borderRadius: 12,
                }} />
              )}
              <span style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{opt}</span>
                {voted !== null && (
                  <span style={{
                    fontWeight: 800, fontSize: 14, marginLeft: 12,
                    color: voted === i ? C.accent : C.muted,
                  }}>{pct}%</span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {voted !== null && (
        <div style={{ marginTop: 14, fontSize: 12, color: C.muted, textAlign: 'center' }}>
          {total} glasova
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Quiz — Modern card design with step dots
   ═══════════════════════════════════════════════════ */

function QuizWidget({ title, questions }: { title?: string; questions: { q: string; options: string[]; correct: number }[] }) {
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<(boolean | null)[]>(() => questions.map(() => null))
  const [finished, setFinished] = useState(false)

  if (!questions || questions.length === 0) return null
  const q = questions[current]

  function handleSelect(idx: number) { if (!revealed) setSelected(idx) }
  function handleCheck() {
    if (selected === null) return
    setRevealed(true)
    const correct = selected === q.correct
    if (correct) setScore(s => s + 1)
    setAnswers(prev => { const n = [...prev]; n[current] = correct; return n })
  }
  function handleNext() {
    if (current < questions.length - 1) { setCurrent(c => c + 1); setSelected(null); setRevealed(false) }
    else setFinished(true)
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100)
    const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '👏' : pct >= 40 ? '💪' : '📚'
    return (
      <div style={{
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        borderRadius: 16, padding: 32, margin: '24px 0', textAlign: 'center',
        border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{emoji}</div>
        <div style={{ fontSize: 14, color: C.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>
          {title || 'Kviz'} — Rezultat
        </div>
        <div style={{ fontSize: 56, fontWeight: 800, color: C.white, lineHeight: 1 }}>{score}/{questions.length}</div>
        <div style={{ fontSize: 16, color: C.muted, marginTop: 8 }}>{pct}% tačnih odgovora</div>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, marginTop: 24, overflow: 'hidden', maxWidth: 300, margin: '24px auto 0' }}>
          <div style={{
            height: '100%', width: `${pct}%`, borderRadius: 4,
            background: pct >= 60 ? `linear-gradient(90deg, ${C.success}, ${C.teal})` : `linear-gradient(90deg, ${C.accent}, ${C.gold})`,
            transition: 'width 0.8s ease',
          }} />
        </div>
        {/* Answer dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
          {answers.map((a, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: a === true ? C.success : a === false ? C.error : C.border,
            }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: C.card, borderRadius: 16, padding: '24px', margin: '24px 0',
      border: `1px solid ${C.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
    }}>
      {/* Step indicator dots */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
        {questions.map((_, i) => (
          <div key={i} style={{
            width: i === current ? 24 : 8, height: 8, borderRadius: 4,
            background: answers[i] === true ? C.success : answers[i] === false ? C.error : i === current ? C.accent : C.border,
            transition: 'all 0.3s',
          }} />
        ))}
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, color: C.accent, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
        {title || 'Kviz'} — Pitanje {current + 1}/{questions.length}
      </div>

      <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px', color: C.white, lineHeight: 1.4 }}>{q.q}</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {q.options.map((opt, i) => {
          let bg = C.surface
          let borderColor = C.border
          let textColor = C.text
          if (selected === i && !revealed) { bg = 'rgba(255,107,53,0.12)'; borderColor = C.accent }
          if (revealed && i === q.correct) { bg = 'rgba(63,185,80,0.12)'; borderColor = C.success; textColor = C.success }
          if (revealed && selected === i && i !== q.correct) { bg = 'rgba(248,81,73,0.12)'; borderColor = C.error; textColor = C.error }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={revealed}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 12,
                border: `1.5px solid ${borderColor}`, background: bg, color: textColor,
                cursor: revealed ? 'default' : 'pointer', textAlign: 'left', fontSize: 14, fontWeight: 500,
                transition: 'all 0.2s', lineHeight: 1.3,
              }}
            >
              <span style={{
                width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: selected === i || (revealed && i === q.correct) ? borderColor : 'rgba(255,255,255,0.06)',
                fontWeight: 700, fontSize: 12, flexShrink: 0,
                color: selected === i || (revealed && i === q.correct) ? C.white : C.muted,
              }}>{String.fromCharCode(65 + i)}</span>
              <span>{opt}</span>
            </button>
          )
        })}
      </div>

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {!revealed ? (
          <button
            onClick={handleCheck}
            disabled={selected === null}
            style={{
              padding: '12px 28px', borderRadius: 12, border: 'none',
              background: selected !== null ? C.accent : C.border,
              color: C.white, fontWeight: 700, cursor: selected !== null ? 'pointer' : 'default', fontSize: 14,
              boxShadow: selected !== null ? '0 2px 12px rgba(255,107,53,0.3)' : 'none',
            }}
          >Provjeri odgovor</button>
        ) : (
          <>
            <span style={{ color: selected === q.correct ? C.success : C.error, fontWeight: 600, fontSize: 14 }}>
              {selected === q.correct ? '✓ Tačno!' : `✗ Netačno — ${q.options[q.correct]}`}
            </span>
            <button
              onClick={handleNext}
              style={{
                padding: '12px 28px', borderRadius: 12, border: 'none', background: C.accent,
                color: C.white, fontWeight: 700, cursor: 'pointer', fontSize: 14,
                boxShadow: '0 2px 12px rgba(255,107,53,0.3)',
              }}
            >{current < questions.length - 1 ? 'Dalje →' : 'Rezultat →'}</button>
          </>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Tags Widget — Orange pill badges
   ═══════════════════════════════════════════════════ */

function TagsWidget({ tags }: { tags: string[] }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 8, margin: '32px 0 16px',
      paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)',
    }}>
      {tags.map((tag, i) => (
        <span key={i} style={{
          padding: '6px 14px', borderRadius: 20,
          background: C.accentSoft, color: C.accent,
          fontSize: 13, fontWeight: 600, letterSpacing: 0.3,
        }}>{tag}</span>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   JSON parse helper
   ═══════════════════════════════════════════════════ */

function safeJson<T>(raw: string | undefined | null, fallback: T): T {
  if (!raw) return fallback
  try { return JSON.parse(raw) } catch { return fallback }
}

/* ═══════════════════════════════════════════════════
   Widget Renderer — maps data attributes to components
   ═══════════════════════════════════════════════════ */

function renderWidget(type: string, attrs: Record<string, string>) {
  switch (type) {
    case 'match':
      return (
        <MatchWidget
          home={attrs.home || ''}
          away={attrs.away || ''}
          homeShort={attrs['home-short']}
          awayShort={attrs['away-short']}
          score={attrs.score || '0-0'}
          date={attrs.date || ''}
          league={attrs.league || ''}
          status={attrs.status || 'FT'}
        />
      )

    case 'player-card':
      return (
        <PlayerCardWidget
          name={attrs.name || ''}
          team={attrs.team || ''}
          position={attrs.position || ''}
          nationality={attrs.nationality}
          age={attrs.age}
          rating={attrs.rating}
          goals={attrs.goals}
          assists={attrs.assists}
          marketValue={attrs['market-value']}
        />
      )

    case 'video':
      return <VideoWidget url={attrs.url || attrs.src || ''} caption={attrs.caption || ''} />

    case 'stats-table':
      return (
        <StatsTableWidget
          title={attrs.title || ''}
          home={attrs.home}
          away={attrs.away}
          stats={safeJson<StatRow[]>(attrs.stats, [])}
          headers={safeJson<string[]>(attrs.headers, [])}
          rows={safeJson<string[][]>(attrs.rows, [])}
        />
      )

    case 'poll':
      return <PollWidget question={attrs.question || 'Anketa'} options={safeJson<string[]>(attrs.options, [])} />

    case 'quiz':
      return <QuizWidget title={attrs.title} questions={safeJson(attrs.questions, [])} />

    case 'tags':
      return <TagsWidget tags={safeJson<string[]>(attrs.tags, [])} />

    // Removed widgets — return nothing
    case 'gallery':
    case 'social-embed':
    case 'sources':
      return null

    default:
      return null
  }
}

/* ═══════════════════════════════════════════════════
   Main Hydrator — splits HTML + renders widgets inline
   ═══════════════════════════════════════════════════ */

const WIDGET_RE = /<div\s+data-widget="([^"]+)"([^>]*)(?:\/>|><\/div>)/gi

function parseDataAttrs(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const re = /data-([\w-]+)=(?:"([^"]*)"|'([^']*)')/g
  let m: RegExpExecArray | null
  while ((m = re.exec(attrString)) !== null) {
    if (m[1] !== 'widget') {
      attrs[m[1]] = m[2] ?? m[3] ?? ''
    }
  }
  return attrs
}

type Segment =
  | { kind: 'html'; html: string }
  | { kind: 'widget'; type: string; attrs: Record<string, string> }

function splitHtml(html: string): Segment[] {
  const segments: Segment[] = []
  let lastIndex = 0
  WIDGET_RE.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = WIDGET_RE.exec(html)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'html', html: html.slice(lastIndex, match.index) })
    }
    segments.push({ kind: 'widget', type: match[1], attrs: parseDataAttrs(match[0]) })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < html.length) {
    segments.push({ kind: 'html', html: html.slice(lastIndex) })
  }

  return segments
}

export function WidgetHydrator({ html }: { html: string }) {
  const segments = splitHtml(html)

  return (
    <div className="pub-article-body">
      {segments.map((seg, i) => {
        if (seg.kind === 'html') {
          return <div key={i} dangerouslySetInnerHTML={{ __html: seg.html }} />
        }
        const widget = renderWidget(seg.type, seg.attrs)
        if (!widget) return null
        return <div key={i}>{widget}</div>
      })}
    </div>
  )
}
