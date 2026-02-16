'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const leagues = [
  { id: 'premier-league', name: 'Premier League', icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', country: 'England' },
  { id: 'la-liga', name: 'La Liga', icon: '🇪🇸', country: 'Spain' },
  { id: 'bundesliga', name: 'Bundesliga', icon: '🇩🇪', country: 'Germany' },
  { id: 'serie-a', name: 'Serie A', icon: '🇮🇹', country: 'Italy' },
  { id: 'ligue-1', name: 'Ligue 1', icon: '🇫🇷', country: 'France' },
  { id: 'champions-league', name: 'Champions League', icon: '⭐', country: 'Europe' },
]

const languages = [
  { code: 'en', name: 'English' },
  { code: 'bs', name: 'Bosnian' },
  { code: 'hr', name: 'Croatian' },
  { code: 'sr', name: 'Serbian' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'it', name: 'Italian' },
]

function Confetti() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; color: string; delay: number; size: number }>>([])

  useEffect(() => {
    const p = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: ['#00D4AA', '#5B5FFF', '#FFB800', '#FF6B6B', '#8B5CF6', '#10B981'][Math.floor(Math.random() * 6)],
      delay: Math.random() * 2,
      size: 4 + Math.random() * 6,
    }))
    setParticles(p)
  }, [])

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 100, overflow: 'hidden' }}>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: -10,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.size > 7 ? '50%' : '1px',
            animation: `confettiFall 3s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [siteName, setSiteName] = useState('')
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([])
  const [language, setLanguage] = useState('en')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleLeague(id: string) {
    setSelectedLeagues((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    )
  }

  const handleFinish = useCallback(async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteName,
          leagues: selectedLeagues.map((id) => leagues.find((l) => l.id === id)?.name || id),
          language,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Setup failed')
      }
      setTimeout(() => {
        router.push(data.redirectUrl || '/dashboard')
        router.refresh()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed')
      setSaving(false)
    }
  }, [siteName, selectedLeagues, language, router])

  useEffect(() => {
    if (step === 4) {
      handleFinish()
    }
  }, [step, handleFinish])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8F9FB',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      {step === 4 && <Confetti />}

      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 16, margin: '0 auto 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 800, color: '#fff',
            background: 'linear-gradient(135deg, #00D4AA, #00A888)',
          }}>D</div>
          <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28, color: '#18181B' }}>
            Welcome to Diurna<span style={{ color: '#00D4AA' }}>.</span>
          </h1>
          <p style={{ fontSize: 14, color: '#71717A', marginTop: 4 }}>Let&apos;s set up your newsroom</p>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
          {[1, 2, 3, 4].map((s) => (
            <div key={s} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: s <= step ? '#00D4AA' : '#E4E4E7',
              transition: 'background .3s',
            }} />
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: '#fff',
          border: '1px solid #E4E4E7',
          borderRadius: 16,
          padding: 32,
        }}>

          {/* Step 1: Site Name */}
          {step === 1 && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📰</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#18181B', marginBottom: 4 }}>Name your publication</h2>
                <p style={{ fontSize: 13, color: '#71717A' }}>This will be your site&apos;s display name</p>
              </div>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. SportNews Pro"
                style={{
                  width: '100%', padding: '14px 16px', fontSize: 16, fontWeight: 600,
                  border: '2px solid #E4E4E7', borderRadius: 12, outline: 'none',
                  fontFamily: 'inherit', textAlign: 'center',
                  transition: 'border-color .15s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#00D4AA'}
                onBlur={(e) => e.target.style.borderColor = '#E4E4E7'}
                autoFocus
              />
              <button
                disabled={!siteName.trim()}
                onClick={() => setStep(2)}
                style={{
                  width: '100%', marginTop: 20, padding: '12px',
                  fontSize: 14, fontWeight: 700, color: '#fff', border: 'none',
                  borderRadius: 12, cursor: siteName.trim() ? 'pointer' : 'not-allowed',
                  background: siteName.trim() ? 'linear-gradient(135deg, #00D4AA, #00A888)' : '#D4D4D8',
                  transition: 'all .15s', fontFamily: 'inherit',
                  opacity: siteName.trim() ? 1 : 0.6,
                }}
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Leagues */}
          {step === 2 && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>⚽</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#18181B', marginBottom: 4 }}>Choose your leagues</h2>
                <p style={{ fontSize: 13, color: '#71717A' }}>Select the leagues you&apos;ll cover</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {leagues.map((l) => {
                  const sel = selectedLeagues.includes(l.id)
                  return (
                    <div
                      key={l.id}
                      onClick={() => toggleLeague(l.id)}
                      style={{
                        padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                        border: `2px solid ${sel ? '#00D4AA' : '#E4E4E7'}`,
                        background: sel ? 'rgba(0,212,170,.06)' : '#fff',
                        transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 12,
                      }}
                    >
                      <span style={{ fontSize: 24 }}>{l.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#18181B' }}>{l.name}</div>
                        <div style={{ fontSize: 11, color: '#71717A' }}>{l.country}</div>
                      </div>
                      {sel && <span style={{ marginLeft: 'auto', color: '#00D4AA', fontWeight: 800 }}>✓</span>}
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => setStep(1)} style={{
                  flex: 1, padding: 12, fontSize: 14, fontWeight: 600, color: '#52525B',
                  background: '#F4F4F5', border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                }}>Back</button>
                <button
                  disabled={selectedLeagues.length === 0}
                  onClick={() => setStep(3)}
                  style={{
                    flex: 2, padding: 12, fontSize: 14, fontWeight: 700, color: '#fff', border: 'none',
                    borderRadius: 12, cursor: selectedLeagues.length > 0 ? 'pointer' : 'not-allowed',
                    background: selectedLeagues.length > 0 ? 'linear-gradient(135deg, #00D4AA, #00A888)' : '#D4D4D8',
                    fontFamily: 'inherit', opacity: selectedLeagues.length > 0 ? 1 : 0.6,
                  }}
                >Continue ({selectedLeagues.length} selected)</button>
              </div>
            </div>
          )}

          {/* Step 3: Language */}
          {step === 3 && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🌍</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#18181B', marginBottom: 4 }}>Set your language</h2>
                <p style={{ fontSize: 13, color: '#71717A' }}>Choose the primary language for your content</p>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{
                  width: '100%', padding: '14px 16px', fontSize: 15, fontWeight: 600,
                  border: '2px solid #E4E4E7', borderRadius: 12, outline: 'none',
                  fontFamily: 'inherit', background: '#fff', cursor: 'pointer',
                  appearance: 'none',
                }}
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>{l.name}</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => setStep(2)} style={{
                  flex: 1, padding: 12, fontSize: 14, fontWeight: 600, color: '#52525B',
                  background: '#F4F4F5', border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                }}>Back</button>
                <button
                  onClick={() => setStep(4)}
                  style={{
                    flex: 2, padding: 12, fontSize: 14, fontWeight: 700, color: '#fff', border: 'none',
                    borderRadius: 12, cursor: 'pointer',
                    background: 'linear-gradient(135deg, #00D4AA, #00A888)',
                    fontFamily: 'inherit',
                  }}
                >Finish Setup</button>
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#18181B', marginBottom: 8 }}>You&apos;re all set!</h2>
              <p style={{ fontSize: 14, color: '#71717A', marginBottom: 4 }}>
                <strong style={{ color: '#18181B' }}>{siteName}</strong> is ready to go
              </p>
              <p style={{ fontSize: 13, color: '#A1A1AA' }}>
                {selectedLeagues.length} league{selectedLeagues.length !== 1 ? 's' : ''} configured
              </p>
              {error && (
                <div style={{
                  marginTop: 16, padding: '10px 14px', borderRadius: 12,
                  border: '1px solid #FCA5A5', background: '#FEF2F2',
                  fontSize: 13, color: '#DC2626',
                }}>
                  {error}
                  <button
                    onClick={() => { setError(''); handleFinish() }}
                    style={{
                      display: 'block', width: '100%', marginTop: 10, padding: '10px',
                      fontSize: 13, fontWeight: 700, color: '#fff', border: 'none',
                      borderRadius: 8, cursor: 'pointer',
                      background: 'linear-gradient(135deg, #00D4AA, #00A888)',
                      fontFamily: 'inherit',
                    }}
                  >
                    Try Again
                  </button>
                </div>
              )}
              <div style={{
                marginTop: 20, fontSize: 13, color: '#A1A1AA',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {saving && !error && (
                  <>
                    <div style={{
                      width: 16, height: 16, border: '2px solid #E4E4E7',
                      borderTopColor: '#00D4AA', borderRadius: '50%',
                      animation: 'spin .6s linear infinite',
                    }} />
                    Setting up your newsroom...
                  </>
                )}
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 10, color: '#D4D4D8' }}>
          Diurna v1.0 &bull; Powered by Lupon Media SSP
        </p>
      </div>
    </div>
  )
}
