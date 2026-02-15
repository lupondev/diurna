'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Registration failed')

      // Auto sign in then redirect to onboarding
      const signInRes = await signIn('credentials', { email, password, redirect: false })
      if (signInRes?.error) {
        router.push('/login')
      } else {
        router.push('/onboarding')
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F8F9FB' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center text-xl font-extrabold text-white"
            style={{ background: 'linear-gradient(135deg, #00D4AA, #00A888)' }}>D</div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Instrument Serif', Georgia, serif", color: '#18181B' }}>
            Diurna<span style={{ color: '#00D4AA' }}>.</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: '#71717A' }}>Create your newsroom</p>
        </div>

        <div className="rounded-2xl border p-6" style={{ background: '#fff', borderColor: '#E4E4E7' }}>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#52525B' }}>Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Harun" required
                className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-mint focus:ring-2 focus:ring-mint/10"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#52525B' }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" required
                className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-mint focus:ring-2 focus:ring-mint/10"
              />
            </div>
            <div className="mb-5">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#52525B' }}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters" required minLength={6}
                className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-mint focus:ring-2 focus:ring-mint/10"
              />
            </div>
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600 mb-4">{error}</div>
            )}
            <button type="submit" disabled={loading}
              className="w-full rounded-xl py-2.5 text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #00D4AA, #00A888)' }}>
              {loading ? '⏳ Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-4" style={{ color: '#71717A' }}>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold" style={{ color: '#00A888' }}>Sign in</Link>
        </p>
        <p className="text-center mt-6" style={{ fontSize: 10, color: '#D4D4D8' }}>Diurna v1.0 • Powered by Lupon Media SSP</p>
      </div>
    </div>
  )
}
