'use client'

import { useEffect, useRef, useState } from 'react'

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
        <span className="aw-widget-label">Poll</span>
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
        <div className="aw-poll-total">{total} votes</div>
      )}
    </div>
  )
}

function QuizWidget({ question, options, correct }: { question: string; options: string[]; correct: number }) {
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)

  function handleSelect(idx: number) {
    if (revealed) return
    setSelected(idx)
  }

  function handleReveal() {
    if (selected === null) return
    setRevealed(true)
  }

  return (
    <div className="aw-widget aw-quiz">
      <div className="aw-widget-header">
        <span className="aw-widget-icon">🧠</span>
        <span className="aw-widget-label">Quiz</span>
      </div>
      <h3 className="aw-widget-question">{question}</h3>
      <div className="aw-quiz-options">
        {options.map((opt, i) => {
          let cls = ''
          if (selected === i && !revealed) cls = 'selected'
          if (revealed && i === correct) cls = 'correct'
          if (revealed && selected === i && i !== correct) cls = 'wrong'
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
        <button className="aw-quiz-check" onClick={handleReveal} disabled={selected === null}>
          Check Answer
        </button>
      ) : (
        <div className={`aw-quiz-result ${selected === correct ? 'correct' : 'wrong'}`}>
          {selected === correct ? 'Correct!' : `Wrong! The answer is: ${options[correct]}`}
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

  function handleSubmit() {
    if (rating === 0) return
    setSubmitted(true)
  }

  return (
    <div className="aw-widget aw-survey">
      <div className="aw-widget-header">
        <span className="aw-widget-icon">📋</span>
        <span className="aw-widget-label">Survey</span>
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
            placeholder="Leave your feedback (optional)..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
          />
          <button className="aw-survey-submit" onClick={handleSubmit} disabled={rating === 0}>
            Submit
          </button>
        </>
      ) : (
        <div className="aw-survey-thanks">
          Thank you for your feedback!
        </div>
      )}
    </div>
  )
}

export function ArticleRenderer({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [widgets, setWidgets] = useState<Array<{ id: string; type: string; el: Element; data: Record<string, string> }>>([])

  useEffect(() => {
    if (!containerRef.current) return

    const found: typeof widgets = []
    const els = containerRef.current.querySelectorAll('.widget-poll, .widget-quiz, .widget-survey')
    els.forEach((el, i) => {
      const type = el.classList.contains('widget-poll') ? 'poll'
        : el.classList.contains('widget-quiz') ? 'quiz'
        : 'survey'
      const data: Record<string, string> = {}
      for (const attr of Array.from(el.attributes)) {
        if (attr.name.startsWith('data-')) {
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
              options={safeParseArray(w.data.options)}
            />
          )}
          {w.type === 'quiz' && (
            <QuizWidget
              question={w.data.question || 'Quiz'}
              options={safeParseArray(w.data.options)}
              correct={parseInt(w.data.correct || '0') || 0}
            />
          )}
          {w.type === 'survey' && (
            <SurveyWidget question={w.data.question || 'Survey'} />
          )}
        </WidgetPortal>
      ))}
    </>
  )
}

function safeParseArray(json: string | undefined): string[] {
  if (!json) return []
  try { return JSON.parse(json) } catch { return [] }
}

import { createPortal } from 'react-dom'

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
