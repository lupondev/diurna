'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await signIn('credentials', { email, password, redirect: false })

    if (res?.error) {
      setError('Invalid email or password')
      setLoading(false)
    } else {
      // Full reload to /newsroom — middleware will redirect to /onboarding if needed
      window.location.href = '/newsroom'
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
          <p className="text-sm mt-1" style={{ color: '#71717A' }}>Sign in to your newsroom</p>
        </div>

        <div className="rounded-2xl border p-6" style={{ background: '#fff', borderColor: '#E4E4E7' }}>
          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl: '/newsroom' })}
            style={{
              width: '100%', padding: '12px', fontSize: 14, fontWeight: 600,
              border: '1px solid #E4E4E7', borderRadius: 12, cursor: 'pointer',
              background: '#fff', color: '#18181B', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Continue with Google
          </button>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0',
            color: '#A1A1AA', fontSize: 12,
          }}>
            <div style={{ flex: 1, height: 1, background: '#E4E4E7' }} />
            or
            <div style={{ flex: 1, height: 1, background: '#E4E4E7' }} />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#52525B' }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" required
                className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[#00D4AA] focus:ring-2 focus:ring-[#00D4AA]/10"
              />
            </div>
            <div className="mb-5">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#52525B' }}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[#00D4AA] focus:ring-2 focus:ring-[#00D4AA]/10"
              />
            </div>
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600 mb-4">{error}</div>
            )}
            <button type="submit" disabled={loading}
              className="w-full rounded-xl py-2.5 text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #00D4AA, #00A888)' }}>
              {loading ? '⏳ Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-4" style={{ color: '#71717A' }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold" style={{ color: '#00A888' }}>Create one</Link>
        </p>
      </div>
    </div>
  )
}
