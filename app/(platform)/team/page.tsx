'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import './team.css'

type Member = {
  id: string
  role: string
  joinedAt: string
  user: { id: string; name: string | null; email: string | null; image: string | null }
}

type InviteResult = {
  success: boolean
  inviteUrl?: string
  error?: string
}

const avatarGradients = [
  'linear-gradient(135deg, #5B5FFF, #8B5CF6)',
  'linear-gradient(135deg, #F59E0B, #EF4444)',
  'linear-gradient(135deg, #00D4AA, #059669)',
  'linear-gradient(135deg, #3B82F6, #1D4ED8)',
  'linear-gradient(135deg, #8B5CF6, #6D28D9)',
  'linear-gradient(135deg, #EC4899, #BE185D)',
  'linear-gradient(135deg, #F97316, #DC2626)',
  'linear-gradient(135deg, #06B6D4, #0284C7)',
]

const roleInfo: Record<string, { icon: string; cls: string; label: string }> = {
  OWNER: { icon: '\u{1F451}', cls: 'owner', label: 'Owner' },
  ADMIN: { icon: '\u{1F6E1}\uFE0F', cls: 'admin', label: 'Admin' },
  EDITOR: { icon: '\u{1F4DD}', cls: 'editor', label: 'Editor' },
  JOURNALIST: { icon: '\u270D\uFE0F', cls: 'journalist', label: 'Journalist' },
}

const permissionsData = [
  { section: 'Content' },
  { perm: 'Create articles', owner: 'yes', admin: 'yes', editor: 'yes', journalist: 'yes' },
  { perm: 'Edit own articles', owner: 'yes', admin: 'yes', editor: 'yes', journalist: 'yes' },
  { perm: 'Edit all articles', owner: 'yes', admin: 'yes', editor: 'yes', journalist: 'no' },
  { perm: 'Publish articles', owner: 'yes', admin: 'yes', editor: 'yes', journalist: 'no' },
  { perm: 'Delete articles', owner: 'yes', admin: 'yes', editor: 'limited', journalist: 'no' },
  { perm: 'Use AI Co-Pilot', owner: 'yes', admin: 'yes', editor: 'yes', journalist: 'yes' },
  { section: 'Distribution' },
  { perm: 'Calendar management', owner: 'yes', admin: 'yes', editor: 'yes', journalist: 'no' },
  { perm: 'Social distribution', owner: 'yes', admin: 'yes', editor: 'yes', journalist: 'limited' },
  { perm: 'Autopilot settings', owner: 'yes', admin: 'yes', editor: 'no', journalist: 'no' },
  { section: 'Administration' },
  { perm: 'Team member management', owner: 'yes', admin: 'yes', editor: 'no', journalist: 'no' },
  { perm: 'Platform settings', owner: 'yes', admin: 'yes', editor: 'no', journalist: 'no' },
  { perm: 'Billing & subscription', owner: 'yes', admin: 'no', editor: 'no', journalist: 'no' },
  { perm: 'Delete site', owner: 'yes', admin: 'no', editor: 'no', journalist: 'no' },
]

const checkIcons: Record<string, { cls: string; icon: string }> = {
  yes: { cls: 'yes', icon: '\u2713' },
  no: { cls: 'no', icon: '\u2014' },
  limited: { cls: 'limited', icon: '\u25D0' },
}

export default function TeamPage() {
  const { data: session } = useSession()
  const [members, setMembers] = useState<Member[]>([])
  const [articlesThisMonth, setArticlesThisMonth] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'members' | 'permissions'>('members')
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('EDITOR')
  const [inviteMessage, setInviteMessage] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ type: 'success' | 'error'; message: string; url?: string } | null>(null)

  const currentUserId = (session?.user as { id?: string } | undefined)?.id

  useEffect(() => {
    fetch('/api/team')
      .then((r) => r.json() as Promise<{ members: Member[]; articlesThisMonth: number }>)
      .then((data) => {
        setMembers(data.members)
        setArticlesThisMonth(data.articlesThisMonth)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function getInitial(name: string | null, email: string | null) {
    if (name) return name.charAt(0).toUpperCase()
    if (email) return email.charAt(0).toUpperCase()
    return '?'
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  function handleRoleChange(memberId: string, newRole: string) {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    )
    fetch('/api/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, role: newRole }),
    }).catch(() => {})
  }

  function handleRemove(memberId: string) {
    if (!confirm('Are you sure you want to remove this team member?')) return
    setMembers((prev) => prev.filter((m) => m.id !== memberId))
    fetch('/api/team', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    }).catch(() => {})
  }

  async function handleInvite() {
    if (!inviteEmail || inviteSending) return
    setInviteSending(true)
    setInviteResult(null)

    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName || undefined,
          role: inviteRole,
          message: inviteMessage || undefined,
        }),
      })

      const data = await res.json() as InviteResult

      if (!res.ok || !data.success) {
        setInviteResult({ type: 'error', message: data.error || 'Failed to send invite' })
        return
      }

      setInviteResult({
        type: 'success',
        message: `Invite created for ${inviteEmail}`,
        url: data.inviteUrl,
      })

      // Reset form fields but keep modal open to show the invite link
      setInviteEmail('')
      setInviteName('')
      setInviteRole('EDITOR')
      setInviteMessage('')
    } catch {
      setInviteResult({ type: 'error', message: 'Network error — please try again' })
    } finally {
      setInviteSending(false)
    }
  }

  function closeInviteModal() {
    setShowInvite(false)
    setInviteResult(null)
    setInviteEmail('')
    setInviteName('')
    setInviteRole('EDITOR')
    setInviteMessage('')
  }

  const stats = [
    { label: 'Team members', value: members.length, icon: '\u{1F465}', cls: 'members' },
    { label: 'Online', value: members.length > 0 ? Math.min(members.length, Math.ceil(members.length * 0.6)) : 0, icon: '\u{1F7E2}', cls: 'active' },
    { label: 'Pending invites', value: 0, icon: '\u{1F4E7}', cls: 'pending' },
    { label: 'Articles this month', value: articlesThisMonth, icon: '\u{1F4DD}', cls: 'articles' },
  ]

  return (
    <div className="tm-page">
      <div className="tm-header">
        <div className="tm-header-left">
          <h1>Team Management</h1>
          <p>{members.length} {members.length === 1 ? 'member' : 'members'} in your team</p>
        </div>
        <button className="tm-invite-btn" onClick={() => setShowInvite(true)}>+ Add member</button>
      </div>

      <div className="tm-stats">
        {stats.map((s) => (
          <div key={s.label} className="ts-card">
            <div className={`ts-icon ${s.cls}`}>{s.icon}</div>
            <div>
              <div className="ts-val">{s.value}</div>
              <div className="ts-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="tm-tabs">
        <button className={`tm-tab${activeTab === 'members' ? ' act' : ''}`} onClick={() => setActiveTab('members')}>Members</button>
        <button className={`tm-tab${activeTab === 'permissions' ? ' act' : ''}`} onClick={() => setActiveTab('permissions')}>Permissions</button>
      </div>

      {activeTab === 'members' && (
        <div className="member-list">
          <div className="ml-head">
            <span>Member</span>
            <span>Role</span>
            <span>Status</span>
            <span>Joined</span>
            <span></span>
          </div>

          {loading ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--g400)', fontSize: 13 }}>
              Loading team members...
            </div>
          ) : members.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{'\u{1F465}'}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--g900)', marginBottom: 4 }}>No team members yet</div>
              <div style={{ fontSize: 12, color: 'var(--g400)' }}>Invite your first team member to start collaborating</div>
            </div>
          ) : (
            members.map((m, i) => {
              const ri = roleInfo[m.role] || roleInfo.JOURNALIST
              const isOwner = m.role === 'OWNER'
              const isSelf = m.user.id === currentUserId
              return (
                <div key={m.id} className="ml-row">
                  <div className="ml-user">
                    <div className="ml-avatar" style={{ background: avatarGradients[i % avatarGradients.length] }}>
                      {getInitial(m.user.name, m.user.email)}
                    </div>
                    <div>
                      <div className="ml-name">{m.user.name || 'No name'}</div>
                      <div className="ml-email">{m.user.email}</div>
                    </div>
                  </div>
                  <div>
                    {isOwner ? (
                      <span className={`ml-role ${ri.cls}`}>{ri.icon} {ri.label}</span>
                    ) : (
                      <select
                        className="ml-role-select"
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.id, e.target.value)}
                      >
                        <option value="ADMIN">{'\u{1F6E1}\uFE0F'} Admin</option>
                        <option value="EDITOR">{'\u{1F4DD}'} Editor</option>
                        <option value="JOURNALIST">{'\u270D\uFE0F'} Journalist</option>
                      </select>
                    )}
                  </div>
                  <div className="ml-status">
                    <span className={`ml-status-dot ${i < Math.ceil(members.length * 0.6) ? 'online' : 'offline'}`}></span>
                    {i < Math.ceil(members.length * 0.6) ? 'Online' : 'Offline'}
                  </div>
                  <div className="ml-joined">{formatDate(m.joinedAt)}</div>
                  <div className="ml-actions">
                    {isSelf ? (
                      <button className="ml-act" title="Settings">{'\u2699\uFE0F'}</button>
                    ) : (
                      <>
                        <button className="ml-act" title="Edit">{'\u270F\uFE0F'}</button>
                        <button className="ml-act danger" title="Remove" onClick={() => handleRemove(m.id)}>{'\u{1F5D1}\uFE0F'}</button>
                      </>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {activeTab === 'permissions' && (
        <>
          <div className="perm-matrix">
            <div className="pm-head">
              <div className="pm-head-cell">Permission</div>
              <div className="pm-head-cell"><span className="pm-head-role" style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#7C2D12' }}>Owner</span></div>
              <div className="pm-head-cell"><span className="pm-head-role" style={{ background: 'var(--elec-l)', color: 'var(--elec)' }}>Admin</span></div>
              <div className="pm-head-cell"><span className="pm-head-role" style={{ background: 'var(--mint-l)', color: 'var(--mint-d)' }}>Editor</span></div>
              <div className="pm-head-cell"><span className="pm-head-role" style={{ background: 'var(--gold-l)', color: 'var(--gold)' }}>Journalist</span></div>
            </div>
            {permissionsData.map((row, i) => {
              if ('section' in row) {
                return <div key={i} className="pm-section">{row.section}</div>
              }
              const r = row as { perm: string; owner: string; admin: string; editor: string; journalist: string }
              return (
                <div key={i} className="pm-row">
                  <div className="pm-cell">{r.perm}</div>
                  {(['owner', 'admin', 'editor', 'journalist'] as const).map((role) => {
                    const c = checkIcons[r[role]]
                    return (
                      <div key={role} className="pm-cell">
                        <span className={`pm-check ${c.cls}`}>{c.icon}</span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
          <div className="pm-legend">
            <span className="pm-legend-item"><span className="pm-check yes">{'\u2713'}</span> Full access</span>
            <span className="pm-legend-item"><span className="pm-check limited">{'\u25D0'}</span> Limited access</span>
            <span className="pm-legend-item"><span className="pm-check no">{'\u2014'}</span> No access</span>
          </div>
        </>
      )}

      {showInvite && (
        <div className="tm-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeInviteModal() }}>
          <div className="tm-modal">
            <div className="tm-modal-head">
              <div className="tm-modal-title">{'\u{1F4E7}'} Invite team member</div>
              <button className="tm-modal-close" onClick={closeInviteModal}>{'\u2715'}</button>
            </div>
            <div className="tm-modal-body">
              {inviteResult && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  marginBottom: 16,
                  background: inviteResult.type === 'success' ? 'var(--suc-l, #dcfce7)' : 'var(--coral-l, #fee2e2)',
                  border: `1px solid ${inviteResult.type === 'success' ? 'var(--suc, #22c55e)' : 'var(--coral, #ef4444)'}`,
                  fontSize: 13,
                  color: inviteResult.type === 'success' ? 'var(--suc-d, #166534)' : 'var(--coral-d, #991b1b)',
                }}>
                  <div style={{ fontWeight: 700, marginBottom: inviteResult.url ? 6 : 0 }}>
                    {inviteResult.type === 'success' ? '✅ ' : '❌ '}{inviteResult.message}
                  </div>
                  {inviteResult.url && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--g500)', marginBottom: 4 }}>Share this invite link:</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          readOnly
                          value={inviteResult.url}
                          style={{ flex: 1, fontSize: 11, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--brd)', fontFamily: 'var(--mono)', background: 'white' }}
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                        <button
                          onClick={() => navigator.clipboard.writeText(inviteResult.url!)}
                          style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, background: 'var(--elec)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!inviteResult?.type || inviteResult.type === 'error' ? (
                <>
                  <div className="tm-form-group">
                    <label className="tm-form-label">Email address</label>
                    <input
                      className="tm-form-input"
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="tm-form-group">
                    <label className="tm-form-label">Full name (optional)</label>
                    <input
                      className="tm-form-input"
                      type="text"
                      placeholder="Full Name"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                    />
                  </div>
                  <div className="tm-form-group">
                    <label className="tm-form-label">Role</label>
                    <div className="role-cards">
                      {[
                        { role: 'ADMIN', icon: '\u{1F6E1}\uFE0F', name: 'Admin', desc: 'Full access except billing' },
                        { role: 'EDITOR', icon: '\u{1F4DD}', name: 'Editor', desc: 'Write, edit, publish' },
                        { role: 'JOURNALIST', icon: '\u270D\uFE0F', name: 'Journalist', desc: 'Write and edit own articles' },
                      ].map((r) => (
                        <div
                          key={r.role}
                          className={`role-card${inviteRole === r.role ? ' selected' : ''}`}
                          onClick={() => setInviteRole(r.role)}
                        >
                          <div className="role-card-icon">{r.icon}</div>
                          <div className="role-card-name">{r.name}</div>
                          <div className="role-card-desc">{r.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="tm-form-group">
                    <label className="tm-form-label">Personal message (optional)</label>
                    <textarea
                      className="tm-form-input"
                      rows={2}
                      placeholder="Hey! Join our team on Diurna..."
                      style={{ resize: 'none' }}
                      value={inviteMessage}
                      onChange={(e) => setInviteMessage(e.target.value)}
                    />
                  </div>
                </>
              ) : null}
            </div>
            <div className="tm-modal-foot">
              <button className="tm-cancel-btn" onClick={closeInviteModal}>
                {inviteResult?.type === 'success' ? 'Close' : 'Cancel'}
              </button>
              {(!inviteResult || inviteResult.type === 'error') && (
                <button
                  className="tm-send-btn"
                  onClick={handleInvite}
                  disabled={!inviteEmail || inviteSending}
                  style={{ opacity: !inviteEmail || inviteSending ? 0.6 : 1 }}
                >
                  {inviteSending ? '⏳ Sending...' : '\u{1F4E7} Send invite'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
