'use client'

import { useState } from 'react'

const REACTIONS = [
  { emoji: '\u{1F525}', label: 'Vatreno' },
  { emoji: '\u{1F62E}', label: 'Iznenađenje' },
  { emoji: '\u{1F4AA}', label: 'Jako' },
  { emoji: '\u{1F602}', label: 'Smiješno' },
]

export function Reactions() {
  const [toggled, setToggled] = useState<Record<number, boolean>>({})
  const [counts, setCounts] = useState<Record<number, number>>({
    0: 142,
    1: 58,
    2: 89,
    3: 23,
  })

  const toggle = (idx: number) => {
    const wasActive = toggled[idx]
    setToggled((prev) => ({ ...prev, [idx]: !wasActive }))
    setCounts((prev) => ({
      ...prev,
      [idx]: prev[idx] + (wasActive ? -1 : 1),
    }))
  }

  return (
    <div className="sba-reactions">
      <div className="sba-reactions-group">
        {REACTIONS.map((r, i) => (
          <button
            key={i}
            className={`sba-reaction-btn${toggled[i] ? ' sba-reaction-btn--active' : ''}`}
            onClick={() => toggle(i)}
            aria-pressed={!!toggled[i]}
            aria-label={r.label}
          >
            <span className="sba-reaction-emoji">{r.emoji}</span>
            <span className="sba-reaction-count">{counts[i]}</span>
          </button>
        ))}
      </div>
      <button className="sba-comment-btn">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Komentari
      </button>
    </div>
  )
}
