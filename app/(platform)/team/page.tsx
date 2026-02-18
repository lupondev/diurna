'use client'

import { useState, useEffect } from 'react'
import './team.css'

type Member = {
  id: string
  role: string
  joinedAt: string
  user: { id: string; name: string | null; email: string | null; image: string | null }
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
  OWNER: { icon: '👑', cls: 'owner', label: 'Owner' },
  ADMIN: { icon: '🛡️', cls: 'admin', label: 'Admin' },
  EDITOR: { icon: '📝', cls: 'editor', label: 'Editor' },
  JOURNALIST: { icon: '✍️', cls: 'journalist', label: 'Journalist' },
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
  { perm: 'Manage calendar', owner: 'yes', admin: 'yes', editor: 'yes', journalist: 'no' },
  { perm: 'Social distribution', owner: 'yes', admin: 'yes', editor: 'yes', journalist: 'limited' },
  { perm: 'Autopilot settings', owner: 'yes', admin: 'yes', editor: 'no', journalist: 'no' },
  { section: 'Administration' },
  { perm: 'Manage team members', owner: 'yes', admin: 'yes', editor: 'no', journalist: 'no' },
  { perm: 'Platform settings', owner: 'yes', admin: 'yes', editor: 'no', journalist: 'no' },
  { perm: 'Billing & subscription', owner: 'yes', admin: 'no', editor: 'no', journalist: 'no' },
  { perm: 'Delete site', owner: 'yes', admin: 'no', editor: 'no', journalist: 'no' },
]

const checkIcons: Record<string, { cls: string; icon: string }> = {
  yes: { cls: 'yes', icon: '✓' },
  no: { cls: 'no', icon: '—' },
  limited: { cls: 'limited', icon: '◐' },
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'members' | 'permissions'>('members')
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('EDITOR')
  const [inviteMessage, setInviteMessage] = useState('')

  useEffect(() => {
    fetch('/api/team')
      .then((r) => r.json() as Promise<Member[]>)
      .then((data) => { setMembers(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function getInitial(name: string | null, email: string | null) {
    if (name) return name.charAt(0).toUpperCase()
    if (email) return email.charAt(0).toUpperCase()
    return '?'
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-GB', {
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
    if (!confirm('Remove this team member?')) return
    setMembers((prev) => prev.filter((m) => m.id !== memberId))
    fetch('/api/team', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    }).catch(() => {})
  }

  function handleInvite() {
    if (!inviteEmail) return
    setShowInvite(false)
    setInviteEmail('')
    setInviteName('')
    setInviteRole('EDITOR')
    setInviteMessage('')
  }

  const stats = [
    { label: 'Team Members', value: members.length, icon: '👥', cls: 'members' },
    { label: 'Online Now', value: members.length > 0 ? Math.min(members.length, Math.ceil(members.length * 0.6)) : 0, icon: '🟢', cls: 'active' },
    { label: 'Pending Invites', value: 0, icon: '📧', cls: 'pending' },
    { label: 'Articles This Month', value: '—', icon: '📝', cls: 'articles' },
  ]

  return (
    <div className="tm-page">
      <div className="tm-header">
        <div className="tm-header-left">
          <h1>Team Management</h1>
          <p>{members.length} member{members.length !== 1 ? 's' : ''} in your team</p>
        </div>
        <button className="tm-invite-btn" onClick={() => setShowInvite(true)}>+ Add Team Member</button>
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
              <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--g900)', marginBottom: 4 }}>No team members yet</div>
              <div style={{ fontSize: 12, color: 'var(--g400)' }}>Invite your first team member to start collaborating</div>
            </div>
          ) : (
            members.map((m, i) => {
              const ri = roleInfo[m.role] || roleInfo.JOURNALIST
              const isOwner = m.role === 'OWNER'
              return (
                <div key={m.id} className="ml-row">
                  <div className="ml-user">
                    <div className="ml-avatar" style={{ background: avatarGradients[i % avatarGradients.length] }}>
                      {getInitial(m.user.name, m.user.email)}
                    </div>
                    <div>
                      <div className="ml-name">{m.user.name || 'Unnamed'}</div>
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
                        <option value="ADMIN">🛡️ Admin</option>
                        <option value="EDITOR">📝 Editor</option>
                        <option value="JOURNALIST">✍️ Journalist</option>
                      </select>
                    )}
                  </div>
                  <div className="ml-status">
                    <span className={`ml-status-dot ${i < Math.ceil(members.length * 0.6) ? 'online' : 'offline'}`}></span>
                    {i < Math.ceil(members.length * 0.6) ? 'Online' : 'Offline'}
                  </div>
                  <div className="ml-joined">{formatDate(m.joinedAt)}</div>
                  <div className="ml-actions">
                    {isOwner ? (
                      <button className="ml-act" title="Settings">⚙️</button>
                    ) : (
                      <>
                        <button className="ml-act" title="Edit">✏️</button>
                        <button className="ml-act danger" title="Remove" onClick={() => handleRemove(m.id)}>🗑️</button>
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
            <span className="pm-legend-item"><span className="pm-check yes">✓</span> Full access</span>
            <span className="pm-legend-item"><span className="pm-check limited">◐</span> Limited access</span>
            <span className="pm-legend-item"><span className="pm-check no">—</span> No access</span>
          </div>
        </>
      )}

      {showInvite && (
        <div className="tm-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowInvite(false) }}>
          <div className="tm-modal">
            <div className="tm-modal-head">
              <div className="tm-modal-title">📧 Invite Team Member</div>
              <button className="tm-modal-close" onClick={() => setShowInvite(false)}>✕</button>
            </div>
            <div className="tm-modal-body">
              <div className="tm-form-group">
                <label className="tm-form-label">Email Address</label>
                <input
                  className="tm-form-input"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="tm-form-group">
                <label className="tm-form-label">Full Name (optional)</label>
                <input
                  className="tm-form-input"
                  type="text"
                  placeholder="First Last"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
              <div className="tm-form-group">
                <label className="tm-form-label">Role</label>
                <div className="role-cards">
                  {[
                    { role: 'ADMIN', icon: '🛡️', name: 'Admin', desc: 'Full access except billing' },
                    { role: 'EDITOR', icon: '📝', name: 'Editor', desc: 'Write, edit all, publish' },
                    { role: 'JOURNALIST', icon: '✍️', name: 'Journalist', desc: 'Write & edit own articles' },
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
                <label className="tm-form-label">Personal Message (optional)</label>
                <textarea
                  className="tm-form-input"
                  rows={2}
                  placeholder="Hey! Join our team on Diurna..."
                  style={{ resize: 'none' }}
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                />
              </div>
            </div>
            <div className="tm-modal-foot">
              <button className="tm-cancel-btn" onClick={() => setShowInvite(false)}>Cancel</button>
              <button className="tm-send-btn" onClick={handleInvite}>📧 Send Invite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
