'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/* ═══════════════════════════════════════════════════
   Widget Components
   ═══════════════════════════════════════════════════ */

function PollWidget({ question, options }: { question: string; options: string[] }) {
  const [voted, setVoted] = useState<number | null>(null)
  const [votes, setVotes] = useState<number[]>(() => options.map(() => Math.floor(Math.random() * 20) + 5))

  function handleVote(idx: number) {
    if (voted !== null) return
    setVoted(idx)
    setVotes((prev) => prev.map((v, i) => (i === idx ? v + 1 : v)))
  }

  const total = votes.reduce((a, b) => a + b, 0)

  return (
    <div className="aw-widget aw-poll">
      <div className="aw-widget-header">
        <span className="aw-widget-icon">📊</span>
        <span className="aw-widget-label">Anketa</span>
      </div>
      <h3 className="aw-widget-question">{question}</h3>
      <div className="aw-poll-options">
        {options.map((opt, i) => {
          const pct = total > 0 ? Math.round((votes[i] / total) * 100) : 0
          return (
            <button
              key={i}
              className={`aw-poll-option ${voted === i ? 'selected' : ''} ${voted !== null ? 'voted' : ''}`}
              onClick={() => handleVote(i)}
              disabled={voted !== null}
            >
              <span className="aw-poll-option-text">{opt}</span>
              {voted !== null && (
                <span className="aw-poll-option-pct">{pct}%</span>
              )}
              {voted !== null && (
                <div className="aw-poll-bar" style={{ width: `${pct}%` }} />
              )}
            </button>
          )
        })}
      </div>
      {voted !== null && (
        <div className="aw-poll-total">{total} glasova</div>
      )}
    </div>
  )
}

function QuizWidget({ questions }: { questions: { q: string; options: string[]; correct: number }[] }) {
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)

  const q = questions[current]

  function handleSelect(idx: number) {
    if (revealed) return
    setSelected(idx)
  }

  function handleCheck() {
    if (selected === null) return
    setRevealed(true)
    if (selected === q.correct) setScore((s) => s + 1)
  }

  function handleNext() {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1)
      setSelected(null)
      setRevealed(false)
    } else {
      setFinished(true)
    }
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100)
    return (
      <div className="aw-widget aw-quiz">
        <div className="aw-widget-header">
          <span className="aw-widget-icon">🧠</span>
          <span className="aw-widget-label">Kviz — Rezultat</span>
        </div>
        <div className="aw-quiz-result-final">
          <div className="aw-quiz-score">{score}/{questions.length}</div>
          <div className="aw-quiz-score-pct">{pct}% tačno</div>
          <div className="aw-quiz-score-bar">
            <div className="aw-quiz-score-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="aw-widget aw-quiz">
      <div className="aw-widget-header">
        <span className="aw-widget-icon">🧠</span>
        <span className="aw-widget-label">Kviz — Pitanje {current + 1}/{questions.length}</span>
      </div>
      <h3 className="aw-widget-question">{q.q}</h3>
      <div className="aw-quiz-options">
        {q.options.map((opt, i) => {
          let cls = ''
          if (selected === i && !revealed) cls = 'selected'
          if (revealed && i === q.correct) cls = 'correct'
          if (revealed && selected === i && i !== q.correct) cls = 'wrong'
          return (
            <button
              key={i}
              className={`aw-quiz-option ${cls}`}
              onClick={() => handleSelect(i)}
              disabled={revealed}
            >
              <span className="aw-quiz-letter">{String.fromCharCode(65 + i)}</span>
              <span>{opt}</span>
            </button>
          )
        })}
      </div>
      {!revealed ? (
        <button className="aw-quiz-check" onClick={handleCheck} disabled={selected === null}>
          Provjeri odgovor
        </button>
      ) : (
        <div className="aw-quiz-answer-row">
          <div className={`aw-quiz-result ${selected === q.correct ? 'correct' : 'wrong'}`}>
            {selected === q.correct ? 'Tačno!' : `Netačno! Odgovor: ${q.options[q.correct]}`}
          </div>
          <button className="aw-quiz-next" onClick={handleNext}>
            {current < questions.length - 1 ? 'Sljedeće pitanje →' : 'Vidi rezultat →'}
          </button>
        </div>
      )}
    </div>
  )
}

function SurveyWidget({ question }: { question: string }) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [submitted, setSubmitted] = useState(false)

  return (
    <div className="aw-widget aw-survey">
      <div className="aw-widget-header">
        <span className="aw-widget-icon">📋</span>
        <span className="aw-widget-label">Anketa</span>
      </div>
      <h3 className="aw-widget-question">{question}</h3>
      {!submitted ? (
        <>
          <div className="aw-survey-stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className={`aw-survey-star ${star <= (hovered || rating) ? 'active' : ''}`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
              >
                ★
              </button>
            ))}
            {rating > 0 && <span className="aw-survey-rating-text">{rating}/5</span>}
          </div>
          <textarea
            className="aw-survey-feedback"
            placeholder="Ostavite komentar (opcionalno)..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
          />
          <button className="aw-survey-submit" onClick={() => { if (rating > 0) setSubmitted(true) }} disabled={rating === 0}>
            Pošalji
          </button>
        </>
      ) : (
        <div className="aw-survey-thanks">Hvala na povratnoj informaciji!</div>
      )}
    </div>
  )
}

function StatsTableWidget({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return (
    <div className="aw-widget aw-stats-table">
      <div className="aw-widget-header">
        <span className="aw-widget-icon">📈</span>
        <span className="aw-widget-label">Statistika</span>
      </div>
      {title && <h3 className="aw-widget-question">{title}</h3>}
      <div className="aw-stats-table-wrap">
        <table className="aw-stats-table-el">
          {headers.length > 0 && (
            <thead>
              <tr>
                {headers.map((h, i) => <th key={i}>{h}</th>)}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => <td key={ci}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PlayerCardWidget({ name, team, position, number, nationality, image, stats }: {
  name: string; team: string; position: string; number: string; nationality: string; image: string
  stats: { label: string; value: string }[]
}) {
  return (
    <div className="aw-widget aw-player-card">
      <div className="aw-player-card-top">
        <div className="aw-player-card-photo" style={{ backgroundImage: image ? `url(${image})` : undefined }}>
          {!image && <span className="aw-player-card-initials">{name.split(' ').map(n => n[0]).join('')}</span>}
        </div>
        <div className="aw-player-card-info">
          <div className="aw-player-card-number">#{number}</div>
          <h3 className="aw-player-card-name">{name}</h3>
          <div className="aw-player-card-meta">{position} · {team}</div>
          <div className="aw-player-card-nat">{nationality}</div>
        </div>
      </div>
      <div className="aw-player-card-stats">
        {stats.map((s, i) => (
          <div key={i} className="aw-player-card-stat">
            <div className="aw-player-card-stat-value">{s.value}</div>
            <div className="aw-player-card-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function VideoWidget({ src, title }: { src: string; title: string }) {
  const [playing, setPlaying] = useState(false)

  // Convert YouTube watch URL to embed URL
  let embedSrc = src
  const ytMatch = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  if (ytMatch) embedSrc = `https://www.youtube.com/embed/${ytMatch[1]}`

  return (
    <div className="aw-widget aw-video">
      <div className="aw-widget-header">
        <span className="aw-widget-icon">🎬</span>
        <span className="aw-widget-label">Video</span>
      </div>
      {title && <h3 className="aw-widget-question">{title}</h3>}
      <div className="aw-video-container">
        {!playing ? (
          <button className="aw-video-thumb" onClick={() => setPlaying(true)}>
            <div className="aw-video-play">▶</div>
            <div className="aw-video-caption">Klikni za reprodukciju</div>
          </button>
        ) : (
          <iframe
            src={`${embedSrc}?autoplay=1`}
            title={title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
    </div>
  )
}

function GalleryWidget({ images }: { images: { src: string; caption: string }[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null)

  return (
    <div className="aw-widget aw-gallery">
      <div className="aw-widget-header">
        <span className="aw-widget-icon">🖼️</span>
        <span className="aw-widget-label">Galerija</span>
      </div>
      <div className="aw-gallery-grid">
        {images.map((img, i) => (
          <button key={i} className="aw-gallery-item" onClick={() => setLightbox(i)}>
            <div className="aw-gallery-img" style={{ backgroundImage: `url(${img.src})` }}>
              {!img.src && <span className="aw-gallery-placeholder">{i + 1}</span>}
            </div>
            {img.caption && <div className="aw-gallery-caption">{img.caption}</div>}
          </button>
        ))}
      </div>
      {lightbox !== null && (
        <div className="aw-lightbox" onClick={() => setLightbox(null)}>
          <div className="aw-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <button className="aw-lightbox-close" onClick={() => setLightbox(null)}>✕</button>
            <div className="aw-lightbox-img" style={{ backgroundImage: `url(${images[lightbox].src})` }}>
              {!images[lightbox].src && <span className="aw-gallery-placeholder">{lightbox + 1}</span>}
            </div>
            {images[lightbox].caption && (
              <div className="aw-lightbox-caption">{images[lightbox].caption}</div>
            )}
            <div className="aw-lightbox-nav">
              <button
                disabled={lightbox === 0}
                onClick={() => setLightbox((p) => Math.max(0, (p ?? 0) - 1))}
              >
                ← Prethodna
              </button>
              <span>{lightbox + 1} / {images.length}</span>
              <button
                disabled={lightbox === images.length - 1}
                onClick={() => setLightbox((p) => Math.min(images.length - 1, (p ?? 0) + 1))}
              >
                Sljedeća →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MatchWidget({ home, away, score, date, competition, stadium }: {
  home: string; away: string; score: string; date: string; competition: string; stadium: string
}) {
  const [h, a] = score.split('-').map((s) => s.trim())
  return (
    <div className="aw-widget aw-match">
      <div className="aw-widget-header">
        <span className="aw-widget-icon">⚽</span>
        <span className="aw-widget-label">{competition}</span>
      </div>
      <div className="aw-match-body">
        <div className="aw-match-team">
          <div className="aw-match-team-crest">{home.slice(0, 3).toUpperCase()}</div>
          <div className="aw-match-team-name">{home}</div>
        </div>
        <div className="aw-match-score">
          <div className="aw-match-score-num">{h} — {a}</div>
          <div className="aw-match-status">FT</div>
        </div>
        <div className="aw-match-team">
          <div className="aw-match-team-crest">{away.slice(0, 3).toUpperCase()}</div>
          <div className="aw-match-team-name">{away}</div>
        </div>
      </div>
      <div className="aw-match-meta">
        {date && <span>{date}</span>}
        {stadium && <span>· {stadium}</span>}
      </div>
    </div>
  )
}

function SocialEmbedWidget({ platform, author, handle, text, date }: {
  platform: string; author: string; handle: string; text: string; date: string
}) {
  const icon = platform === 'twitter' || platform === 'x' ? '𝕏' : platform === 'instagram' ? '📷' : '💬'
  return (
    <div className="aw-widget aw-social-embed">
      <div className="aw-widget-header">
        <span className="aw-widget-icon">{icon}</span>
        <span className="aw-widget-label">{platform === 'twitter' || platform === 'x' ? 'X (Twitter)' : platform}</span>
      </div>
      <div className="aw-social-embed-card">
        <div className="aw-social-embed-author">
          <div className="aw-social-embed-avatar">{author.charAt(0)}</div>
          <div>
            <div className="aw-social-embed-name">{author}</div>
            <div className="aw-social-embed-handle">{handle}</div>
          </div>
        </div>
        <div className="aw-social-embed-text">{text}</div>
        {date && <div className="aw-social-embed-date">{date}</div>}
      </div>
    </div>
  )
}

function SourcesWidget({ sources }: { sources: { name: string; url: string }[] }) {
  return (
    <div className="aw-widget aw-sources">
      <div className="aw-widget-header">
        <span className="aw-widget-icon">📰</span>
        <span className="aw-widget-label">Izvori</span>
      </div>
      <ul className="aw-sources-list">
        {sources.map((s, i) => (
          <li key={i} className="aw-sources-item">
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="aw-sources-link">
              {s.name}
              <span className="aw-sources-arrow">↗</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Helper
   ═══════════════════════════════════════════════════ */

function safeParseJson<T>(json: string | undefined, fallback: T): T {
  if (!json) return fallback
  try { return JSON.parse(json) } catch { return fallback }
}

/** Normalize gallery images — accept { url, caption } or { src, caption } */
function normalizeGalleryImages(raw: unknown[]): { src: string; caption: string }[] {
  return raw.map((img: unknown) => {
    const o = img as Record<string, string>
    return { src: o.src || o.url || '', caption: o.caption || '' }
  })
}

/** Normalize sources — accept string[] or { name, url }[] */
function normalizeSources(raw: unknown[]): { name: string; url: string }[] {
  if (raw.length === 0) return []
  if (typeof raw[0] === 'string') {
    return (raw as string[]).map((name) => ({ name, url: '#' }))
  }
  return raw as { name: string; url: string }[]
}

/** Build player stats from individual data attributes */
function buildPlayerStats(data: Record<string, string>): { label: string; value: string }[] {
  // Try parsed JSON stats first
  const parsed = safeParseJson<{ label: string; value: string }[]>(data.stats, [])
  if (parsed.length > 0) return parsed
  // Build from individual attributes
  const stats: { label: string; value: string }[] = []
  if (data.rating) stats.push({ label: 'Ocjena', value: data.rating })
  if (data.goals) stats.push({ label: 'Golovi', value: data.goals })
  if (data.assists) stats.push({ label: 'Asistencije', value: data.assists })
  if (data['market-value']) stats.push({ label: 'Vrijednost', value: data['market-value'] })
  return stats
}

/* ═══════════════════════════════════════════════════
   Portal — replaces placeholder element with React
   ═══════════════════════════════════════════════════ */

function WidgetPortal({ element, children }: { element: Element; children: React.ReactNode }) {
  const [container] = useState(() => {
    const div = document.createElement('div')
    div.className = 'aw-portal'
    return div
  })

  useEffect(() => {
    element.replaceWith(container)
    return () => {}
  }, [element, container])

  return createPortal(children, container)
}

/* ═══════════════════════════════════════════════════
   Main Renderer
   ═══════════════════════════════════════════════════ */

export function ArticleRenderer({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [widgets, setWidgets] = useState<Array<{ id: string; type: string; el: Element; data: Record<string, string> }>>([])

  useEffect(() => {
    if (!containerRef.current) return

    const found: typeof widgets = []
    const els = containerRef.current.querySelectorAll('[data-widget]')
    els.forEach((el, i) => {
      const type = el.getAttribute('data-widget') || ''
      const data: Record<string, string> = {}
      for (const attr of Array.from(el.attributes)) {
        if (attr.name.startsWith('data-') && attr.name !== 'data-widget') {
          data[attr.name.replace('data-', '')] = attr.value
        }
      }
      found.push({ id: `widget-${i}`, type, el, data })
    })
    setWidgets(found)
  }, [html])

  return (
    <>
      <div
        ref={containerRef}
        className="pub-article-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {widgets.map((w) => (
        <WidgetPortal key={w.id} element={w.el}>
          {w.type === 'poll' && (
            <PollWidget
              question={w.data.question || 'Poll'}
              options={safeParseJson<string[]>(w.data.options, [])}
            />
          )}
          {w.type === 'quiz' && (
            <QuizWidget
              questions={safeParseJson<{ q: string; options: string[]; correct: number }[]>(w.data.questions, [])}
            />
          )}
          {w.type === 'survey' && (
            <SurveyWidget question={w.data.question || 'Survey'} />
          )}
          {w.type === 'stats-table' && (
            <StatsTableWidget
              title={w.data.title || ''}
              headers={safeParseJson<string[]>(w.data.headers, [])}
              rows={safeParseJson<string[][]>(w.data.rows, [])}
            />
          )}
          {w.type === 'player-card' && (
            <PlayerCardWidget
              name={w.data.name || ''}
              team={w.data.team || ''}
              position={w.data.position || ''}
              number={w.data.number || ''}
              nationality={w.data.nationality || ''}
              image={w.data.image || ''}
              stats={buildPlayerStats(w.data)}
            />
          )}
          {w.type === 'video' && (
            <VideoWidget
              src={w.data.src || w.data.url || ''}
              title={w.data.title || w.data.caption || ''}
            />
          )}
          {w.type === 'gallery' && (
            <GalleryWidget
              images={normalizeGalleryImages(safeParseJson<unknown[]>(w.data.images, []))}
            />
          )}
          {w.type === 'match' && (
            <MatchWidget
              home={w.data.home || ''}
              away={w.data.away || ''}
              score={w.data.score || '0-0'}
              date={w.data.date || ''}
              competition={w.data.competition || w.data.league || ''}
              stadium={w.data.stadium || ''}
            />
          )}
          {w.type === 'social-embed' && (
            <SocialEmbedWidget
              platform={w.data.platform || 'twitter'}
              author={w.data.author || ''}
              handle={w.data.handle || w.data.author || ''}
              text={w.data.text || ''}
              date={w.data.date || w.data.timestamp || ''}
            />
          )}
          {w.type === 'sources' && (
            <SourcesWidget
              sources={normalizeSources(safeParseJson<unknown[]>(w.data.sources, []))}
            />
          )}
        </WidgetPortal>
      ))}
    </>
  )
}
