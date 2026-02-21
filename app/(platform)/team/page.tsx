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
  OWNER: { icon: '\u{1F451}', cls: 'owner', label: 'Vlasnik' },
  ADMIN: { icon: '\u{1F6E1}\uFE0F', cls: 'admin', label: 'Admin' },
  EDITOR: { icon: '\u{1F4DD}', cls: 'editor', label: 'Urednik' },
  JOURNALIST: { icon: '\u270D\uFE0F', cls: 'journalist', label: 'Novinar' },
}

const permissionsData = [
  { section: 'Sadržaj' },
  { perm: 'Kreiranje članaka', owner: 'yes', admin: 'yes', editor: 'yes', journalist: 'yes' },
  { perm: 'Uređivanje svojih članaka', owner: 'yes', admin: 'yes', editor: 'yes', journalist: 'yes' },
  { perm: 'Uređivanje svih članaka', owner: 'yes', admin: 'yes', editor: 'yes', journalist: 'no' },
  { perm: 'Objavljivanje članaka', owner: 'yes', admin: 'yes', editor: 'yes', journalist: 'no' },
  { perm: 'Brisanje članaka', owner: 'yes', admin: 'yes', editor: 'limited', journalist: 'no' },
  { perm: 'Korištenje AI Co-Pilota', owner: 'yes', admin: 'yes', editor: 'yes', journalist: 'yes' },
  { section: 'Distribucija' },
  { perm: 'Upravljanje kalendarom', owner: 'yes', admin: 'yes', editor: 'yes', journalist: 'no' },
  { perm: 'Društvena distribucija', owner: 'yes', admin: 'yes', editor: 'yes', journalist: 'limited' },
  { perm: 'Autopilot postavke', owner: 'yes', admin: 'yes', editor: 'no', journalist: 'no' },
  { section: 'Administracija' },
  { perm: 'Upravljanje članovima tima', owner: 'yes', admin: 'yes', editor: 'no', journalist: 'no' },
  { perm: 'Postavke platforme', owner: 'yes', admin: 'yes', editor: 'no', journalist: 'no' },
  { perm: 'Naplata i pretplata', owner: 'yes', admin: 'no', editor: 'no', journalist: 'no' },
  { perm: 'Brisanje sajta', owner: 'yes', admin: 'no', editor: 'no', journalist: 'no' },
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
    return new Date(date).toLocaleDateString('bs-BA', {
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
    if (!confirm('Da li ste sigurni da želite ukloniti ovog člana tima?')) return
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
    { label: 'Članovi tima', value: members.length, icon: '\u{1F465}', cls: 'members' },
    { label: 'Online', value: members.length > 0 ? Math.min(members.length, Math.ceil(members.length * 0.6)) : 0, icon: '\u{1F7E2}', cls: 'active' },
    { label: 'Pozivnice na čekanju', value: 0, icon: '\u{1F4E7}', cls: 'pending' },
    { label: 'Članaka ovog mjeseca', value: articlesThisMonth, icon: '\u{1F4DD}', cls: 'articles' },
  ]

  return (
    <div className="tm-page">
      <div className="tm-header">
        <div className="tm-header-left">
          <h1>Upravljanje timom</h1>
          <p>{members.length} {members.length === 1 ? 'član' : 'članova'} u vašem timu</p>
        </div>
        <button className="tm-invite-btn" onClick={() => setShowInvite(true)}>+ Dodaj člana</button>
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
        <button className={`tm-tab${activeTab === 'members' ? ' act' : ''}`} onClick={() => setActiveTab('members')}>Članovi</button>
        <button className={`tm-tab${activeTab === 'permissions' ? ' act' : ''}`} onClick={() => setActiveTab('permissions')}>Dozvole</button>
      </div>

      {activeTab === 'members' && (
        <div className="member-list">
          <div className="ml-head">
            <span>Član</span>
            <span>Uloga</span>
            <span>Status</span>
            <span>Pridružen</span>
            <span></span>
          </div>

          {loading ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--g400)', fontSize: 13 }}>
              Učitavanje članova tima...
            </div>
          ) : members.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{'\u{1F465}'}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--g900)', marginBottom: 4 }}>Još nema članova tima</div>
              <div style={{ fontSize: 12, color: 'var(--g400)' }}>Pozovite prvog člana tima da započnete saradnju</div>
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
                      <div className="ml-name">{m.user.name || 'Bez imena'}</div>
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
                        <option value="EDITOR">{'\u{1F4DD}'} Urednik</option>
                        <option value="JOURNALIST">{'\u270D\uFE0F'} Novinar</option>
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
                      <button className="ml-act" title="Postavke">{'\u2699\uFE0F'}</button>
                    ) : (
                      <>
                        <button className="ml-act" title="Uredi">{'\u270F\uFE0F'}</button>
                        <button className="ml-act danger" title="Ukloni" onClick={() => handleRemove(m.id)}>{'\u{1F5D1}\uFE0F'}</button>
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
              <div className="pm-head-cell">Dozvola</div>
              <div className="pm-head-cell"><span className="pm-head-role" style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#7C2D12' }}>Vlasnik</span></div>
              <div className="pm-head-cell"><span className="pm-head-role" style={{ background: 'var(--elec-l)', color: 'var(--elec)' }}>Admin</span></div>
              <div className="pm-head-cell"><span className="pm-head-role" style={{ background: 'var(--mint-l)', color: 'var(--mint-d)' }}>Urednik</span></div>
              <div className="pm-head-cell"><span className="pm-head-role" style={{ background: 'var(--gold-l)', color: 'var(--gold)' }}>Novinar</span></div>
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
            <span className="pm-legend-item"><span className="pm-check yes">{'\u2713'}</span> Potpuni pristup</span>
            <span className="pm-legend-item"><span className="pm-check limited">{'\u25D0'}</span> Ograničen pristup</span>
            <span className="pm-legend-item"><span className="pm-check no">{'\u2014'}</span> Bez pristupa</span>
          </div>
        </>
      )}

      {showInvite && (
        <div className="tm-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowInvite(false) }}>
          <div className="tm-modal">
            <div className="tm-modal-head">
              <div className="tm-modal-title">{'\u{1F4E7}'} Pozovi člana tima</div>
              <button className="tm-modal-close" onClick={() => setShowInvite(false)}>{'\u2715'}</button>
            </div>
            <div className="tm-modal-body">
              <div className="tm-form-group">
                <label className="tm-form-label">Email adresa</label>
                <input
                  className="tm-form-input"
                  type="email"
                  placeholder="kolega@firma.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="tm-form-group">
                <label className="tm-form-label">Ime i prezime (opciono)</label>
                <input
                  className="tm-form-input"
                  type="text"
                  placeholder="Ime Prezime"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
              <div className="tm-form-group">
                <label className="tm-form-label">Uloga</label>
                <div className="role-cards">
                  {[
                    { role: 'ADMIN', icon: '\u{1F6E1}\uFE0F', name: 'Admin', desc: 'Potpuni pristup osim naplate' },
                    { role: 'EDITOR', icon: '\u{1F4DD}', name: 'Urednik', desc: 'Pisanje, uređivanje, objavljivanje' },
                    { role: 'JOURNALIST', icon: '\u270D\uFE0F', name: 'Novinar', desc: 'Pisanje i uređivanje svojih članaka' },
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
                <label className="tm-form-label">Lična poruka (opciono)</label>
                <textarea
                  className="tm-form-input"
                  rows={2}
                  placeholder="Hej! Pridruži se našem timu na Diurna..."
                  style={{ resize: 'none' }}
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                />
              </div>
            </div>
            <div className="tm-modal-foot">
              <button className="tm-cancel-btn" onClick={() => setShowInvite(false)}>Otkaži</button>
              <button className="tm-send-btn" onClick={handleInvite}>{'\u{1F4E7}'} Pošalji pozivnicu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
