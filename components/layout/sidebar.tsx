'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  // Phase: MVP
  { label: 'Dashboard', icon: '📊', href: '/', phase: 'mvp' },
  { label: 'Newsroom', icon: '📰', href: '/newsroom', phase: 'mvp' },
  { label: 'AI Co-Pilot', icon: '🤖', href: '/editor', phase: 'mvp' },
  // Phase 2
  { label: 'Widgets', icon: '🧩', href: '/widgets', phase: '2' },
  { label: 'Widget Creator', icon: '🛠️', href: '/widgets/create', phase: '2' },
  { label: 'Calendar', icon: '📅', href: '/calendar', phase: '2' },
  { label: 'Analytics', icon: '📈', href: '/analytics', phase: '2' },
  // Phase 3
  { label: 'Midnight Pro', icon: '🌙', href: '/templates/midnight', phase: '3' },
  { label: 'Clean Editorial', icon: '☀️', href: '/templates/editorial', phase: '3' },
  // MVP (bottom)
  { label: 'Team', icon: '👥', href: '/team', phase: 'mvp' },
  { label: 'Settings', icon: '⚙️', href: '/settings', phase: 'mvp' },
] as const

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex w-[260px] flex-col border-r bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint text-white text-sm font-bold">
          D
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight">Diurna</p>
          <p className="text-[10px] text-muted-foreground">by Lupon Media</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href)
            const isComingSoon = item.phase !== 'mvp'

            return (
              <li key={item.href}>
                {isComingSoon ? (
                  <span className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/50 cursor-not-allowed">
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                    <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-muted-foreground">
                      Soon
                    </span>
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-mint-light text-mint-dark font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom */}
      <div className="border-t px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-mint-light flex items-center justify-center text-xs font-bold text-mint-dark">
            H
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">Harun</p>
            <p className="text-[10px] text-muted-foreground truncate">Owner</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
