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
  if (invite.usedAt) return { label: 'Used', cls: 'used' }
  if (new Date(invite.expiresAt) < new Date()) return { label: 'Expired', cls: 'expired' }
  return { label: 'Pending', cls: 'pending' }
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
      if (res.ok) setInvites(await res.json())
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
      const data = await res.json()
      if (res.ok) {
        setLastInviteUrl(`${window.location.origin}${data.inviteUrl}`)
        setEmail('')
        setRole('JOURNALIST')
        fetchInvites()
      } else {
        alert(data.error || 'Failed to create invite')
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
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--g900)' }}>Team Invites</div>
          <div style={{ fontSize: 12, color: 'var(--g500)' }}>Invite team members to join your organization</div>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={() => { setShowModal(true); setLastInviteUrl(null) }}>
          + Invite Member
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--g400)' }}>Loading invites...</div>
      ) : invites.length === 0 ? (
        <div className="adm-card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✉️</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--g900)', marginBottom: 4 }}>No invites yet</div>
          <div style={{ fontSize: 12, color: 'var(--g400)' }}>Invite your first team member to get started</div>
        </div>
      ) : (
        <div className="adm-table">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Expires</th>
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
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--g400)', fontFamily: 'var(--mono)' }}>
                      {new Date(inv.expiresAt).toLocaleDateString()}
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
            <div className="adm-modal-title">Invite Team Member</div>

            {lastInviteUrl ? (
              <>
                <div style={{ fontSize: 13, color: 'var(--g700)', marginBottom: 12 }}>
                  Invite created! Share this link:
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
                    {copied ? '✅ Copied!' : '📋 Copy Link'}
                  </button>
                  <button className="adm-btn adm-btn-secondary" onClick={() => { setShowModal(false); setLastInviteUrl(null) }}>
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="adm-field">
                  <label className="adm-label">Email Address</label>
                  <input
                    className="adm-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    autoFocus
                  />
                </div>

                <div className="adm-field">
                  <label className="adm-label">Role</label>
                  <select className="adm-select" value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', padding: '10px 14px' }}>
                    <option value="ADMIN">Admin — Full access + user management</option>
                    <option value="EDITOR">Editor — Content creation + calendar</option>
                    <option value="JOURNALIST">Journalist — Write articles only</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                  <button
                    className="adm-btn adm-btn-primary"
                    onClick={createInvite}
                    disabled={submitting || !email.trim()}
                    style={{ opacity: submitting || !email.trim() ? 0.5 : 1 }}
                  >
                    {submitting ? 'Creating...' : 'Send Invite'}
                  </button>
                  <button className="adm-btn adm-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
