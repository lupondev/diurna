'use client'

import { useState, useEffect, useCallback } from 'react'

type InviteRow = {
  id: string
  email: string
  role: string
  token: string
  usedAt: string | null
  createdAt: string
  expiresAt: string
}

function inviteStatus(invite: InviteRow): { label: string; cls: string } {
  if (invite.usedAt) return { label: 'Iskorištena', cls: 'used' }
  if (new Date(invite.expiresAt) < new Date()) return { label: 'Istekla', cls: 'expired' }
  return { label: 'Na čekanju', cls: 'pending' }
}

export default function AdminInvitesPage() {
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('JOURNALIST')
  const [submitting, setSubmitting] = useState(false)
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchInvites = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/invites')
      if (res.ok) setInvites(await res.json() as InviteRow[])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchInvites() }, [fetchInvites])

  const createInvite = async () => {
    if (!email.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })
      const data = await res.json() as { inviteUrl?: string; error?: string }
      if (res.ok) {
        setLastInviteUrl(`${window.location.origin}${data.inviteUrl}`)
        setEmail('')
        setRole('JOURNALIST')
        fetchInvites()
      } else {
        alert(data.error || 'Greška pri kreiranju pozivnice')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const copyLink = () => {
    if (lastInviteUrl) {
      navigator.clipboard?.writeText(lastInviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--g900)' }}>Pozivnice za tim</div>
          <div style={{ fontSize: 12, color: 'var(--g500)' }}>Pozovite članove da se pridruže vašoj organizaciji</div>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={() => { setShowModal(true); setLastInviteUrl(null) }}>
          + Pozovi člana
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--g400)' }}>Učitavanje pozivnica...</div>
      ) : invites.length === 0 ? (
        <div className="adm-card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>{'\u2709\uFE0F'}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--g900)', marginBottom: 4 }}>Nema pozivnica</div>
          <div style={{ fontSize: 12, color: 'var(--g400)' }}>Pozovite prvog člana tima za početak</div>
        </div>
      ) : (
        <div className="adm-table">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Uloga</th>
                <th>Status</th>
                <th>Kreirano</th>
                <th>Ističe</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => {
                const status = inviteStatus(inv)
                return (
                  <tr key={inv.id}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{inv.email}</td>
                    <td><span className={`adm-badge ${inv.role.toLowerCase()}`}>{inv.role}</span></td>
                    <td><span className={`adm-badge ${status.cls}`}>{status.label}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--g400)', fontFamily: 'var(--mono)' }}>
                      {new Date(inv.createdAt).toLocaleDateString('bs-BA')}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--g400)', fontFamily: 'var(--mono)' }}>
                      {new Date(inv.expiresAt).toLocaleDateString('bs-BA')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="adm-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="adm-modal">
            <div className="adm-modal-title">Pozovi člana tima</div>

            {lastInviteUrl ? (
              <>
                <div style={{ fontSize: 13, color: 'var(--g700)', marginBottom: 12 }}>
                  Pozivnica kreirana! Podijelite ovaj link:
                </div>
                <div style={{
                  padding: '10px 14px', background: 'var(--g50)', borderRadius: 10,
                  fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--g600)',
                  wordBreak: 'break-all', marginBottom: 12,
                }}>
                  {lastInviteUrl}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="adm-btn adm-btn-primary" onClick={copyLink}>
                    {copied ? '\u2705 Kopirano!' : '\u{1F4CB} Kopiraj link'}
                  </button>
                  <button className="adm-btn adm-btn-secondary" onClick={() => { setShowModal(false); setLastInviteUrl(null) }}>
                    Gotovo
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="adm-field">
                  <label className="adm-label">Email adresa</label>
                  <input
                    className="adm-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="kolega@primjer.com"
                    autoFocus
                  />
                </div>

                <div className="adm-field">
                  <label className="adm-label">Uloga</label>
                  <select className="adm-select" value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', padding: '10px 14px' }}>
                    <option value="ADMIN">Admin — Potpuni pristup + upravljanje korisnicima</option>
                    <option value="EDITOR">Urednik — Kreiranje sadržaja + kalendar</option>
                    <option value="JOURNALIST">Novinar — Samo pisanje članaka</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                  <button
                    className="adm-btn adm-btn-primary"
                    onClick={createInvite}
                    disabled={submitting || !email.trim()}
                    style={{ opacity: submitting || !email.trim() ? 0.5 : 1 }}
                  >
                    {submitting ? 'Kreiranje...' : 'Pošalji pozivnicu'}
                  </button>
                  <button className="adm-btn adm-btn-secondary" onClick={() => setShowModal(false)}>Otkaži</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
