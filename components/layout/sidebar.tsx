'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { LanguageSelector } from '@/components/language-selector'
import { useLanguage } from '@/hooks/use-language'

type NavItem = { label: string; icon: string; href: string; badge?: string }
type NavSection = { label: string; items: NavItem[]; roles?: string[] }

const sections: NavSection[] = [
  {
    label: 'Main',
    items: [
      { label: 'Newsroom', icon: '\ud83d\udcf0', href: '/newsroom' },
      { label: 'Editor', icon: '\u270d\ufe0f', href: '/editor' },
      { label: 'Calendar', icon: '\ud83d\udcc5', href: '/calendar' },
      { label: 'Articles', icon: '\ud83d\udcc4', href: '/articles' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      // Bug C fix: add AI Co-Pilot to sidebar
      { label: 'AI Co-Pilot', icon: '\ud83e\udd16', href: '/copilot' },
      { label: 'Analytics', icon: '\ud83d\udcca', href: '/analytics' },
    ],
  },
  {
    label: 'Sport',
    items: [
      { label: 'Football Hub', icon: '\u26bd', href: '/football' },
      // Bug D fix: use different icon for Fixtures vs Calendar
      { label: 'Fixtures', icon: '\ud83d\udd22', href: '/football/fixtures' },
      { label: 'Leagues & Tables', icon: '\ud83c\udfc6', href: '/football/leagues' },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Widgets', icon: '\ud83e\udde9', href: '/widgets' },
      { label: 'Widget Creator', icon: '\ud83d\udee0\ufe0f', href: '/widget-creator' },
      { label: 'Media', icon: '\ud83d\uddbc\ufe0f', href: '/media' },
    ],
  },
  {
    label: 'Templates',
    items: [
      { label: 'Midnight Pro', icon: '\ud83c\udf19', href: '/templates/midnight' },
      { label: 'Clean Editorial', icon: '\ud83d\udcf0', href: '/templates/editorial' },
    ],
  },
  {
    label: 'Admin',
    roles: ['OWNER', 'ADMIN'],
    items: [
      { label: 'Settings', icon: '\u2699\ufe0f', href: '/settings' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const userName = session?.user?.name || 'User'
  const userInitial = userName.charAt(0).toUpperCase()
  const userRole = (session?.user as { role?: string } | undefined)?.role || ''
  const { locale, setLocale } = useLanguage()

  // Bug E fix: derive plan label from role instead of hardcoding 'Pro Plan'
  const planLabel = userRole === 'OWNER' ? 'Owner' : userRole === 'ADMIN' ? 'Admin' : userRole === 'EDITOR' ? 'Editor' : userRole === 'WRITER' ? 'Writer' : 'Member'

  return (
    <aside className="sb">
      <div className="sb-head">
        <span className="logo">Diurna<b>.</b></span>
      </div>

      <div className="ss">
        <div className="ss-row">
          <div className="ss-icon">\u26bd</div>
          <div>
            <div className="ss-name">Diurna</div>
            <div className="ss-url">Publishing Platform</div>
          </div>
          <span style={{ color: 'var(--g400)', fontSize: 12, marginLeft: 'auto' }}>\u25bc</span>
        </div>
      </div>

      <nav className="sb-nav">
        {sections.filter((s) => !s.roles || s.roles.includes(userRole)).map((section) => (
          <div key={section.label} className="ns">
            <div className="nl">{section.label}</div>
            {section.items.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href)

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
        <div style={{ padding: '0 12px 8px', display: 'flex', justifyContent: 'flex-end' }}>
          <LanguageSelector locale={locale} onChange={setLocale} compact />
        </div>
        <div className="sb-u" style={{ cursor: 'default' }}>
          <div className="sb-av">{userInitial}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--g900)' }}>{userName}</div>
            {/* Bug E fix: show actual role instead of hardcoded 'Pro Plan' */}
            <div style={{ fontSize: 10, color: 'var(--g500)' }}>{planLabel}</div>
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
            \u21aa
          </button>
        </div>
      </div>
    </aside>
  )
}
