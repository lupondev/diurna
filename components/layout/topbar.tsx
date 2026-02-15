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
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div>
        <h1 className="text-sm font-semibold">{meta.title}</h1>
        <p className="text-xs text-muted-foreground">{meta.description}</p>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative rounded-lg p-2 hover:bg-gray-50 transition-colors">
          <span className="text-lg">🔔</span>
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-coral" />
        </button>
      </div>
    </header>
  )
}
