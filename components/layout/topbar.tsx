'use client'

import { usePathname } from 'next/navigation'

const pageMeta: Record<string, { title: string; description: string }> = {
  '/': { title: 'Dashboard', description: 'Your newsroom overview' },
  '/newsroom': { title: 'Newsroom', description: 'Manage your articles' },
  '/editor': { title: 'AI Co-Pilot', description: 'Create with AI or write manually' },
  '/team': { title: 'Team', description: 'Manage your team members' },
  '/settings': { title: 'Settings', description: 'Configure your publication' },
}

export function Topbar() {
  const pathname = usePathname()
  const meta = pageMeta[pathname] || { title: 'Diurna', description: '' }

  return (
    <header className="topbar">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-sm font-bold text-gray-900">{meta.title}</h1>
          <p className="text-[11px] text-gray-400">{meta.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="flex items-center gap-2 rounded-xl border bg-gray-50/80 px-3 py-1.5 text-gray-400 transition-all focus-within:border-mint focus-within:ring-2 focus-within:ring-mint/10">
          <span className="text-xs">🔍</span>
          <input
            type="text"
            placeholder="Search articles..."
            className="bg-transparent text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none w-40"
          />
          <kbd className="hidden sm:inline text-[9px] font-mono bg-white border rounded px-1 py-0.5 text-gray-300">⌘K</kbd>
        </div>

        {/* Notifications */}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
          <span className="text-sm">🔔</span>
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-coral ring-2 ring-white" />
        </button>

        {/* Quick action */}
        <button className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-sm">
          ⚡
        </button>
      </div>
    </header>
  )
}
