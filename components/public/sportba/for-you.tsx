'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const ALL_TEAMS = [
  'Arsenal',
  'Chelsea',
  'Barcelona',
  'Real Madrid',
  'Man City',
  'Liverpool',
  'Bayern',
  'Juventus',
  'Inter',
  'PSG',
  'Dortmund',
  'Napoli',
]

const STORAGE_KEY = 'sportba-foryou-teams'

type TeamArticle = {
  title: string
  cat: string
  time: string
  href: string
  team: string
}

export function ForYou() {
  const [followed, setFollowed] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)
  const [articles, setArticles] = useState<TeamArticle[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setFollowed(JSON.parse(stored))
    } catch {}
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || followed.length === 0) {
      setArticles([])
      return
    }

    fetch(`/api/newsroom/for-you?teams=${encodeURIComponent(followed.join(','))}`)
      .then(r => r.json() as Promise<{ articles?: TeamArticle[] }>)
      .then((data) => {
        if (data.articles) setArticles(data.articles)
      })
      .catch(() => {})
  }, [followed, mounted])

  const toggle = (team: string) => {
    setFollowed((prev) => {
      const next = prev.includes(team)
        ? prev.filter((t) => t !== team)
        : [...prev, team]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <section className="sba-section-module">
      <div className="sba-section-head">
        <h2 className="sba-section-title">Za tebe</h2>
      </div>
      <div
        className="sba-foryou-chips"
        role="group"
        aria-label="Odaberi timove"
      >
        {ALL_TEAMS.map((team) => (
          <button
            key={team}
            className={`sba-foryou-chip${followed.includes(team) ? ' sba-foryou-chip--active' : ''}`}
            onClick={() => toggle(team)}
            aria-pressed={followed.includes(team)}
          >
            {team}
          </button>
        ))}
      </div>

      {mounted && followed.length === 0 && (
        <div className="sba-foryou-empty">
          Odaberi timove iznad za personalizirane vijesti
        </div>
      )}

      {articles.length > 0 && (
        <div className="sba-foryou-content">
          {articles.map((item, i) => (
            <Link key={i} href={item.href} className="sba-foryou-card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="sba-foryou-card-cat">{item.cat}</div>
              <div className="sba-foryou-card-title">{item.title}</div>
              <div className="sba-foryou-card-meta">
                {item.team} &middot; {item.time}
              </div>
            </Link>
          ))}
        </div>
      )}

      {mounted && followed.length > 0 && articles.length === 0 && (
        <div className="sba-foryou-empty">
          Nema novih vijesti za odabrane timove
        </div>
      )}
    </section>
  )
}
