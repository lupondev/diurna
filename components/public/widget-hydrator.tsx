'use client'

import { useState } from 'react'

/* ═══════════════════════════════════════════════════
   Inline Widget Components (self-contained, no CSS deps)
   ═══════════════════════════════════════════════════ */

const COLORS = {
  bg: '#1a1a2e',
  card: '#16213e',
  accent: '#ff6b35',
  text: '#e2e8f0',
  muted: '#94a3b8',
  border: '#2d3a54',
  success: '#22c55e',
  error: '#ef4444',
}

function WidgetWrapper({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: COLORS.card, borderRadius: 12, padding: 20, margin: '24px 0',
      border: `1px solid ${COLORS.border}`, color: COLORS.text,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: COLORS.accent, fontWeight: 700 }}>
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      {children}
    </div>
  )
}

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
    <WidgetWrapper icon="📊" label="Anketa">
      <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', color: '#fff' }}>{question}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map((opt, i) => {
          const pct = total > 0 ? Math.round((votes[i] / total) * 100) : 0
          return (
            <button
              key={i}
              onClick={() => handleVote(i)}
              disabled={voted !== null}
              style={{
                position: 'relative', padding: '12px 16px', borderRadius: 8, border: `1px solid ${voted === i ? COLORS.accent : COLORS.border}`,
                background: voted === i ? `${COLORS.accent}22` : 'transparent', color: COLORS.text,
                cursor: voted !== null ? 'default' : 'pointer', textAlign: 'left', fontSize: 14, overflow: 'hidden',
                transition: 'all 0.2s',
              }}
            >
              {voted !== null && (
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`,
                  background: voted === i ? `${COLORS.accent}33` : `${COLORS.muted}15`,
                  transition: 'width 0.5s ease', borderRadius: 8,
                }} />
              )}
              <span style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between' }}>
                <span>{opt}</span>
                {voted !== null && <span style={{ fontWeight: 700, color: voted === i ? COLORS.accent : COLORS.muted }}>{pct}%</span>}
              </span>
            </button>
          )
        })}
      </div>
      {voted !== null && (
        <div style={{ marginTop: 12, fontSize: 12, color: COLORS.muted, textAlign: 'center' }}>{total} glasova</div>
      )}
    </WidgetWrapper>
  )
}

function QuizWidget({ title, questions }: { title?: string; questions: { q: string; options: string[]; correct: number }[] }) {
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)

  if (!questions || questions.length === 0) return null
  const q = questions[current]

  function handleSelect(idx: number) { if (!revealed) setSelected(idx) }
  function handleCheck() {
    if (selected === null) return
    setRevealed(true)
    if (selected === q.correct) setScore((s) => s + 1)
  }
  function handleNext() {
    if (current < questions.length - 1) { setCurrent((c) => c + 1); setSelected(null); setRevealed(false) }
    else setFinished(true)
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100)
    return (
      <WidgetWrapper icon="🧠" label={title || 'Kviz — Rezultat'}>
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: COLORS.accent }}>{score}/{questions.length}</div>
          <div style={{ fontSize: 16, color: COLORS.muted, marginTop: 8 }}>{pct}% tačno</div>
          <div style={{ height: 8, background: COLORS.border, borderRadius: 4, marginTop: 16, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: COLORS.accent, borderRadius: 4, transition: 'width 0.5s' }} />
          </div>
        </div>
      </WidgetWrapper>
    )
  }

  return (
    <WidgetWrapper icon="🧠" label={`${title || 'Kviz'} — Pitanje ${current + 1}/${questions.length}`}>
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: '#fff' }}>{q.q}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {q.options.map((opt, i) => {
          let bg = 'transparent'
          let borderColor = COLORS.border
          if (selected === i && !revealed) { bg = `${COLORS.accent}22`; borderColor = COLORS.accent }
          if (revealed && i === q.correct) { bg = `${COLORS.success}22`; borderColor = COLORS.success }
          if (revealed && selected === i && i !== q.correct) { bg = `${COLORS.error}22`; borderColor = COLORS.error }
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={revealed}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 8,
                border: `1px solid ${borderColor}`, background: bg, color: COLORS.text,
                cursor: revealed ? 'default' : 'pointer', textAlign: 'left', fontSize: 14, transition: 'all 0.2s',
              }}
            >
              <span style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: COLORS.border, fontWeight: 700, fontSize: 12, flexShrink: 0,
              }}>{String.fromCharCode(65 + i)}</span>
              <span>{opt}</span>
            </button>
          )
        })}
      </div>
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {!revealed ? (
          <button
            onClick={handleCheck}
            disabled={selected === null}
            style={{
              padding: '10px 24px', borderRadius: 8, border: 'none', background: selected !== null ? COLORS.accent : COLORS.border,
              color: '#fff', fontWeight: 600, cursor: selected !== null ? 'pointer' : 'default', fontSize: 14,
            }}
          >Provjeri odgovor</button>
        ) : (
          <>
            <span style={{ color: selected === q.correct ? COLORS.success : COLORS.error, fontWeight: 600, fontSize: 14 }}>
              {selected === q.correct ? 'Tačno!' : `Netačno! Odgovor: ${q.options[q.correct]}`}
            </span>
            <button
              onClick={handleNext}
              style={{
                padding: '10px 24px', borderRadius: 8, border: 'none', background: COLORS.accent,
                color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14,
              }}
            >{current < questions.length - 1 ? 'Sljedeće pitanje →' : 'Vidi rezultat →'}</button>
          </>
        )}
      </div>
    </WidgetWrapper>
  )
}

function MatchWidget({ home, away, score, date, league, status }: {
  home: string; away: string; score: string; date: string; league: string; status: string
}) {
  const [h, a] = score.split('-').map((s) => s.trim())
  return (
    <WidgetWrapper icon="⚽" label={league || 'Utakmica'}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '16px 0' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: COLORS.border, display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontWeight: 800, fontSize: 14, color: COLORS.accent,
          }}>{home.slice(0, 3).toUpperCase()}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{home}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: 4 }}>{h} — {a}</div>
          <div style={{ fontSize: 11, color: COLORS.accent, fontWeight: 600, marginTop: 4 }}>{status || 'FT'}</div>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: COLORS.border, display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontWeight: 800, fontSize: 14, color: COLORS.accent,
          }}>{away.slice(0, 3).toUpperCase()}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{away}</div>
        </div>
      </div>
      {date && <div style={{ textAlign: 'center', fontSize: 12, color: COLORS.muted }}>{date}</div>}
    </WidgetWrapper>
  )
}

function StatsTableWidget({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return (
    <WidgetWrapper icon="📈" label="Statistika">
      {title && <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px', color: '#fff' }}>{title}</h3>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          {headers.length > 0 && (
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} style={{
                    padding: '10px 12px', textAlign: i === 0 ? 'left' : 'center', color: COLORS.accent,
                    borderBottom: `2px solid ${COLORS.border}`, fontWeight: 700, fontSize: 12, textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : `${COLORS.border}33` }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{
                    padding: '10px 12px', textAlign: ci === 0 ? 'left' : 'center',
                    borderBottom: `1px solid ${COLORS.border}33`, color: ci === 0 ? '#fff' : COLORS.text,
                    fontWeight: ci === 0 ? 600 : 400,
                  }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetWrapper>
  )
}

function PlayerCardWidget({ name, team, position, rating, goals, assists, marketValue }: {
  name: string; team: string; position: string; rating?: string; goals?: string; assists?: string; marketValue?: string
}) {
  const stats: { label: string; value: string }[] = []
  if (rating) stats.push({ label: 'Ocjena', value: rating })
  if (goals) stats.push({ label: 'Golovi', value: goals })
  if (assists) stats.push({ label: 'Asistencije', value: assists })
  if (marketValue) stats.push({ label: 'Vrijednost', value: marketValue })

  return (
    <WidgetWrapper icon="👤" label="Profil igrača">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: COLORS.border, display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: COLORS.accent, flexShrink: 0,
        }}>{name.split(' ').map(n => n[0]).join('')}</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{name}</div>
          <div style={{ fontSize: 13, color: COLORS.muted }}>{position} · {team}</div>
        </div>
      </div>
      {stats.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 8 }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: 12, background: `${COLORS.border}66`, borderRadius: 8,
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.accent }}>{s.value}</div>
              <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </WidgetWrapper>
  )
}

function VideoWidget({ url, caption }: { url: string; caption: string }) {
  const [playing, setPlaying] = useState(false)

  let embedUrl = url
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`

  return (
    <WidgetWrapper icon="🎬" label="Video">
      {caption && <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#fff' }}>{caption}</h3>}
      <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
        {!playing ? (
          <button
            onClick={() => setPlaying(true)}
            style={{
              position: 'absolute', inset: 0, width: '100%', border: 'none', background: 'linear-gradient(135deg, #1a1a2e, #0f3460)',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff',
            }}
          >
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: COLORS.accent, display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 28,
            }}>▶</div>
            <div style={{ marginTop: 12, fontSize: 13, color: COLORS.muted }}>Klikni za reprodukciju</div>
          </button>
        ) : (
          <iframe
            src={`${embedUrl}?autoplay=1`}
            title={caption}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          />
        )}
      </div>
    </WidgetWrapper>
  )
}

function GalleryWidget({ images }: { images: { url: string; caption: string }[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null)

  return (
    <WidgetWrapper icon="🖼️" label="Galerija">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setLightbox(i)}
            style={{
              border: 'none', padding: 0, cursor: 'pointer', borderRadius: 8, overflow: 'hidden',
              background: COLORS.border, aspectRatio: '4/3', position: 'relative',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.caption || `Image ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            {img.caption && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 8px 6px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', fontSize: 11, color: '#fff',
              }}>{img.caption}</div>
            )}
          </button>
        ))}
      </div>
      {lightbox !== null && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 20,
          }}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: '50%',
              border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 20, cursor: 'pointer',
            }}
          >✕</button>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '80vh' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[lightbox].url} alt={images[lightbox].caption || ''} style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: 8 }} />
            {images[lightbox].caption && (
              <div style={{ textAlign: 'center', marginTop: 12, color: '#fff', fontSize: 14 }}>{images[lightbox].caption}</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
            <button
              disabled={lightbox === 0}
              onClick={(e) => { e.stopPropagation(); setLightbox((p) => Math.max(0, (p ?? 0) - 1)) }}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none', color: '#fff', cursor: lightbox === 0 ? 'default' : 'pointer',
                background: lightbox === 0 ? 'rgba(255,255,255,0.1)' : COLORS.accent, fontSize: 13,
              }}
            >← Prethodna</button>
            <span style={{ color: COLORS.muted, fontSize: 13, display: 'flex', alignItems: 'center' }}>{lightbox + 1} / {images.length}</span>
            <button
              disabled={lightbox === images.length - 1}
              onClick={(e) => { e.stopPropagation(); setLightbox((p) => Math.min(images.length - 1, (p ?? 0) + 1)) }}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none', color: '#fff', fontSize: 13,
                cursor: lightbox === images.length - 1 ? 'default' : 'pointer',
                background: lightbox === images.length - 1 ? 'rgba(255,255,255,0.1)' : COLORS.accent,
              }}
            >Sljedeća →</button>
          </div>
        </div>
      )}
    </WidgetWrapper>
  )
}

function SocialEmbedWidget({ platform, text, author, timestamp }: {
  platform: string; text: string; author: string; timestamp: string
}) {
  const icon = platform === 'twitter' || platform === 'x' ? '𝕏' : platform === 'instagram' ? '📷' : '💬'
  const platformLabel = platform === 'twitter' || platform === 'x' ? 'X (Twitter)' : platform
  return (
    <WidgetWrapper icon={icon} label={platformLabel}>
      <div style={{
        padding: 16, background: `${COLORS.border}66`, borderRadius: 8,
        borderLeft: `3px solid ${COLORS.accent}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: COLORS.accent, display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 16,
          }}>{(author || 'U').charAt(0).toUpperCase()}</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{author}</div>
          </div>
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.6, color: COLORS.text, whiteSpace: 'pre-wrap' }}>{text}</div>
        {timestamp && <div style={{ marginTop: 12, fontSize: 12, color: COLORS.muted }}>{timestamp}</div>}
      </div>
    </WidgetWrapper>
  )
}

function SourcesWidget({ sources }: { sources: string[] }) {
  return (
    <WidgetWrapper icon="📰" label="Izvori">
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sources.map((s, i) => (
          <li key={i} style={{
            padding: '10px 14px', background: `${COLORS.border}66`, borderRadius: 8,
            fontSize: 14, color: COLORS.text, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ color: COLORS.accent }}>↗</span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </WidgetWrapper>
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
    case 'poll':
      return <PollWidget question={attrs.question || 'Anketa'} options={safeJson<string[]>(attrs.options, [])} />

    case 'quiz':
      return <QuizWidget title={attrs.title} questions={safeJson(attrs.questions, [])} />

    case 'match':
      return (
        <MatchWidget
          home={attrs.home || ''}
          away={attrs.away || ''}
          score={attrs.score || '0-0'}
          date={attrs.date || ''}
          league={attrs.league || ''}
          status={attrs.status || 'FT'}
        />
      )

    case 'stats-table':
      return (
        <StatsTableWidget
          title={attrs.title || ''}
          headers={safeJson<string[]>(attrs.headers, [])}
          rows={safeJson<string[][]>(attrs.rows, [])}
        />
      )

    case 'player-card':
      return (
        <PlayerCardWidget
          name={attrs.name || ''}
          team={attrs.team || ''}
          position={attrs.position || ''}
          rating={attrs.rating}
          goals={attrs.goals}
          assists={attrs.assists}
          marketValue={attrs['market-value']}
        />
      )

    case 'video':
      return <VideoWidget url={attrs.url || attrs.src || ''} caption={attrs.caption || ''} />

    case 'gallery':
      return <GalleryWidget images={safeJson<{ url: string; caption: string }[]>(attrs.images, [])} />

    case 'social-embed':
      return (
        <SocialEmbedWidget
          platform={attrs.platform || 'twitter'}
          text={attrs.text || ''}
          author={attrs.author || ''}
          timestamp={attrs.timestamp || attrs.date || ''}
        />
      )

    case 'sources':
      return <SourcesWidget sources={safeJson<string[]>(attrs.sources, [])} />

    default:
      return null
  }
}

/* ═══════════════════════════════════════════════════
   Main Hydrator — splits HTML + renders widgets inline
   ═══════════════════════════════════════════════════ */

// Regex to match self-closing or open+close data-widget divs
const WIDGET_RE = /<div\s+data-widget="([^"]+)"([^>]*)(?:\/>|><\/div>)/gi

function parseDataAttrs(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  // Match data-foo="value" or data-foo='value'
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

  // Reset regex
  WIDGET_RE.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = WIDGET_RE.exec(html)) !== null) {
    // Add preceding HTML
    if (match.index > lastIndex) {
      segments.push({ kind: 'html', html: html.slice(lastIndex, match.index) })
    }

    const widgetType = match[1]
    const attrString = match[0] // full match for attribute parsing
    segments.push({ kind: 'widget', type: widgetType, attrs: parseDataAttrs(attrString) })

    lastIndex = match.index + match[0].length
  }

  // Trailing HTML
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
        return <div key={i}>{renderWidget(seg.type, seg.attrs)}</div>
      })}
    </div>
  )
}
