'use client'

import { useState, useCallback } from 'react'

export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!email) return
      setSubmitted(true)
    },
    [email]
  )

  return (
    <div className="sba-newsletter">
      <div className="sba-newsletter-head">Newsletter</div>
      <p className="sba-newsletter-desc">
        Primaj najnovije vijesti direktno u inbox. Bez spama.
      </p>
      {submitted ? (
        <div className="sba-newsletter-success">
          Hvala! Provjerite email za potvrdu.
        </div>
      ) : (
        <form className="sba-newsletter-form" onSubmit={handleSubmit}>
          <input
            type="email"
            className="sba-newsletter-input"
            placeholder="Email adresa"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-label="Email adresa"
          />
          <button type="submit" className="sba-newsletter-submit">
            Pretplati se
          </button>
        </form>
      )}
    </div>
  )
}
