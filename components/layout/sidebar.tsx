'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const sections = [
  {
    label: 'MAIN',
    items: [
      { label: 'Dashboard', icon: '📊', href: '/', phase: 'mvp' },
      { label: 'Newsroom', icon: '📰', href: '/newsroom', phase: 'mvp' },
      { label: 'AI Co-Pilot', icon: '🤖', href: '/editor', phase: 'mvp' },
    ],
  },
  {
    label: 'CONTENT',
    items: [
      { label: 'Widgets', icon: '🧩', href: '/widgets', phase: '2' },
      { label: 'Widget Creator', icon: '🛠️', href: '/widgets/create', phase: '2' },
      { label: 'Calendar', icon: '📅', href: '/calendar', phase: '2' },
      { label: 'Analytics', icon: '📈', href: '/analytics', phase: '2' },
    ],
  },
  {
    label: 'TEMPLATES',
    items: [
      { label: 'Midnight Pro', icon: '🌙', href: '/templates/midnight', phase: '3' },
      { label: 'Clean Editorial', icon: '☀️', href: '/templates/editorial', phase: '3' },
    ],
  },
  {
    label: 'SETTINGS',
    items: [
      { label: 'Team', icon: '👥', href: '/team', phase: 'mvp' },
      { label: 'Settings', icon: '⚙️', href: '/settings', phase: 'mvp' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex w-[260px] flex-col border-r bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-sm font-bold"
          style={{ background: 'linear-gradient(135deg, #00D4AA, #00A888)' }}>
          D
        </div>
        <div>
          <p className="text-sm font-extrabold tracking-tight text-gray-900" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>
            Diurna
          </p>
          <p className="text-[10px] text-gray-400 font-medium">by Lupon Media</p>
        </div>
      </div>

      {/* Site switcher */}
      <div className="mx-4 my-2 rounded-xl bg-gray-50 border p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
            style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.15), rgba(0,168,136,0.1))' }}>
            ⚽
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">Demo Sport News</p>
            <p className="text-[10px] text-gray-400 truncate">demo.diurna.app</p>
          </div>
          <span className="text-gray-300 text-[10px]">▼</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {sections.map((section) => (
          <div key={section.label} className="mb-2">
            <p className="px-3 pt-3 pb-1.5 text-[10px] font-bold tracking-[0.1em] text-gray-300 uppercase">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href)
                const isComingSoon = item.phase !== 'mvp'

                return (
                  <li key={item.href}>
                    {isComingSoon ? (
                      <span className="sidebar-nav-item opacity-40 cursor-not-allowed">
                        <span className="nav-icon-wrap bg-gray-100">
                          <span>{item.icon}</span>
                        </span>
                        <span className="flex-1">{item.label}</span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold text-gray-400">
                          SOON
                        </span>
                      </span>
                    ) : (
                      <Link
                        href={item.href}
                        className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : 'text-gray-600'}`}
                      >
                        <span className={`nav-icon-wrap ${isActive ? '' : 'bg-gray-100'}`}>
                          <span>{item.icon}</span>
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t px-4 py-3">
        <Link href="/settings" className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-gray-50 transition-colors">
          <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #5B5FFF, #8B5CF6)' }}>
            H
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">Harun</p>
            <p className="text-[10px] text-gray-400 truncate">Pro Plan</p>
          </div>
          <span className="text-[10px] text-gray-300">⚙️</span>
        </Link>
      </div>
    </aside>
  )
}
