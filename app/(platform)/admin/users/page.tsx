'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

type UserRow = {
  id: string
  membershipId: string
  name: string | null
  email: string | null
  role: string
  joinedAt: string
  createdAt: string
}

const ROLE_OPTIONS = ['OWNER', 'ADMIN', 'EDITOR', 'JOURNALIST']

function roleBadge(role: string) {
  return `adm-badge ${role.toLowerCase()}`
}

export default function AdminUsersPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [changing, setChanging] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) setUsers(await res.json() as UserRow[])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const changeRole = async (userId: string, newRole: string) => {
    setChanging(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u))
      } else {
        const data = await res.json() as { error?: string }
        alert(data.error || 'Failed to change role')
      }
    } finally {
      setChanging(null)
    }
  }

  const deactivateUser = async (userId: string, name: string | null) => {
    if (!confirm(`Deactivate ${name || 'this user'}? They will lose access.`)) return
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deactivate: true }),
      })
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId))
      }
    } catch {}
  }

  const isOwner = session?.user?.role === 'OWNER'

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--g900)' }}>Team Members</div>
          <div style={{ fontSize: 12, color: 'var(--g500)' }}>{users.length} member{users.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--g400)' }}>Loading users...</div>
      ) : (
        <div className="adm-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                {isOwner && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: 'var(--mint-l)', color: 'var(--mint-d)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 800,
                      }}>
                        {(user.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--g900)', fontSize: 13 }}>
                          {user.name || 'Unnamed'}
                          {user.id === session?.user?.id && (
                            <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--g400)', marginLeft: 6 }}>YOU</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{user.email}</td>
                  <td>
                    {isOwner && user.id !== session?.user?.id ? (
                      <select
                        className="adm-select"
                        value={user.role}
                        onChange={(e) => changeRole(user.id, e.target.value)}
                        disabled={changing === user.id}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={roleBadge(user.role)}>{user.role}</span>
                    )}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--g400)', fontFamily: 'var(--mono)' }}>
                    {new Date(user.joinedAt).toLocaleDateString()}
                  </td>
                  {isOwner && (
                    <td>
                      {user.id !== session?.user?.id && (
                        <button
                          className="adm-btn adm-btn-danger"
                          onClick={() => deactivateUser(user.id, user.name)}
                          style={{ fontSize: 11, padding: '4px 10px' }}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
