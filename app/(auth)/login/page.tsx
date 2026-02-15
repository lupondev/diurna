'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
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
      router.push('/')
      router.refresh()
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
