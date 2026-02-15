'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'

const sections = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', icon: '📊', href: '/', phase: 'mvp' },
      { label: 'Newsroom', icon: '📰', href: '/newsroom', phase: 'mvp', badge: '12' },
      { label: 'AI Co-Pilot', icon: '🤖', href: '/editor', phase: 'mvp' },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Widgets', icon: '🧩', href: '/widgets', phase: '2' },
      { label: 'Widget Creator', icon: '🛠️', href: '/widgets/create', phase: '2' },
      { label: 'Calendar', icon: '📅', href: '/calendar', phase: '2' },
      { label: 'Analytics', icon: '📈', href: '/analytics', phase: '2' },
    ],
  },
  {
    label: 'Templates',
    items: [
      { label: 'Midnight Pro', icon: '🌙', href: '/templates/midnight', phase: '3' },
      { label: 'Clean Editorial', icon: '☀️', href: '/templates/editorial', phase: '3' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Team', icon: '👥', href: '/team', phase: 'mvp' },
      { label: 'Settings', icon: '⚙️', href: '/settings', phase: 'mvp' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const userName = session?.user?.name || 'User'
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <aside className="sb">
      <div className="sb-head">
        <span className="logo">Diurna<b>.</b></span>
      </div>

      <div className="ss">
        <div className="ss-row">
          <div className="ss-icon">⚽</div>
          <div>
            <div className="ss-name">SportNews Pro</div>
            <div className="ss-url">sportnews.com</div>
          </div>
          <span style={{ color: 'var(--g400)', fontSize: 12, marginLeft: 'auto' }}>▼</span>
        </div>
      </div>

      <nav className="sb-nav">
        {sections.map((section) => (
          <div key={section.label} className="ns">
            <div className="nl">{section.label}</div>
            {section.items.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href)
              const isComingSoon = item.phase !== 'mvp'

              if (isComingSoon) {
                return (
                  <span key={item.href} className="ni disabled">
                    <span className="ni-i">{item.icon}</span>
                    {item.label}
                    <span className="ni-soon">SOON</span>
                  </span>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`ni${isActive ? ' act' : ''}`}
                >
                  <span className="ni-i">{item.icon}</span>
                  {item.label}
                  {item.badge && <span className="ni-b">{item.badge}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="sb-ft">
        <div className="sb-u" style={{ cursor: 'default' }}>
          <div className="sb-av">{userInitial}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--g900)' }}>{userName}</div>
            <div style={{ fontSize: 10, color: 'var(--g500)' }}>Pro Plan</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Sign out"
            style={{
              padding: '5px 8px',
              borderRadius: 'var(--rm)',
              fontSize: 14,
              color: 'var(--g400)',
              transition: 'all .12s',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--coral-l)'
              e.currentTarget.style.color = 'var(--coral)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none'
              e.currentTarget.style.color = 'var(--g400)'
            }}
          >
            ↪
          </button>
        </div>
      </div>
    </aside>
  )
}
