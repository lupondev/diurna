'use client'

import { useState } from 'react'

export function SubscribeWidget({ siteName = 'SportNews Pro' }: { siteName?: string }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json() as { message?: string; error?: string }
      if (res.ok) {
        setStatus('success')
        setMessage(data.message || 'Subscribed!')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to subscribe')
      }
    } catch {
      setStatus('error')
      setMessage('Something went wrong')
    }
  }

  return (
    <div className="sw-widget">
      <div className="sw-icon">📧</div>
      <div className="sw-title">Subscribe to {siteName}</div>
      <div className="sw-desc">Get the latest articles delivered to your inbox</div>
      {status === 'success' ? (
        <div className="sw-success">
          <span className="sw-success-icon">✓</span>
          {message}
        </div>
      ) : (
        <form className="sw-form" onSubmit={handleSubmit}>
          <input
            type="email"
            className="sw-input"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
            required
          />
          <button type="submit" className="sw-btn" disabled={status === 'loading'}>
            {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
          </button>
          {status === 'error' && <div className="sw-error">{message}</div>}
        </form>
      )}
      <div className="sw-footer">
        Powered by <span className="sw-brand">Diurna</span>
      </div>
    </div>
  )
}
