'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import './admin.css'

const adminNav = [
  { label: 'Invites', href: '/admin/invites', icon: '✉️' },
  { label: 'Audit Log', href: '/admin/audit-log', icon: '📋' },
  { label: 'Site Settings', href: '/admin/site', icon: '⚙️' },
  { label: 'Data Sync', href: '/admin/sync', icon: '🔄' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="adm">
      <div className="adm-hd">
        <h1>🔒 Admin Panel</h1>
        <p>Manage your team, invites, and organization settings</p>
      </div>

      <div className="adm-nav">
        {adminNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname === item.href ? 'act' : ''}
          >
            {item.icon} {item.label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  )
}
