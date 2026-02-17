'use client'

import { useState, useCallback } from 'react'

const TOPICS = [
  'Opšti upit',
  'Sadržaj i ispravke',
  'Marketing i oglašavanje',
  'Tehnička podrška',
  'Privatnost i podaci',
]

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }, [])

  if (submitted) {
    return (
      <div className="sba-sp-form-success">
        Hvala na poruci! Odgovorit \u0107emo u najkra\u0107em roku.
      </div>
    )
  }

  return (
    <form className="sba-sp-form" onSubmit={handleSubmit}>
      <div className="sba-sp-form-row">
        <label className="sba-sp-label" htmlFor="cf-name">
          Ime i prezime
        </label>
        <input
          id="cf-name"
          type="text"
          className="sba-sp-input"
          required
          autoComplete="name"
        />
      </div>
      <div className="sba-sp-form-row">
        <label className="sba-sp-label" htmlFor="cf-email">
          Email
        </label>
        <input
          id="cf-email"
          type="email"
          className="sba-sp-input"
          required
          autoComplete="email"
        />
      </div>
      <div className="sba-sp-form-row">
        <label className="sba-sp-label" htmlFor="cf-topic">
          Tema
        </label>
        <select id="cf-topic" className="sba-sp-select" required>
          <option value="">Odaberi temu</option>
          {TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="sba-sp-form-row">
        <label className="sba-sp-label" htmlFor="cf-msg">
          Poruka
        </label>
        <textarea
          id="cf-msg"
          className="sba-sp-textarea"
          rows={5}
          required
        />
      </div>
      <button type="submit" className="sba-sp-submit">
        Po\u0161alji poruku
      </button>
    </form>
  )
}
