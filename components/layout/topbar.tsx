'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const pageMeta: Record<string, { icon: string; title: string }> = {
  '/': { icon: '📊', title: 'Dashboard' },
  '/newsroom': { icon: '📰', title: 'Newsroom' },
  '/editor': { icon: '🤖', title: 'AI Co-Pilot' },
  '/team': { icon: '👥', title: 'Team' },
  '/settings': { icon: '⚙️', title: 'Settings' },
}

export function Topbar() {
  const pathname = usePathname()
  const meta = pageMeta[pathname] ||
    (pathname.startsWith('/editor') ? pageMeta['/editor'] : pageMeta['/'])

  return (
    <header className="tb">
      <h1 className="tb-title">{meta.icon} {meta.title}</h1>
      <div className="tb-right">
        <button className="tb-btn">
          🔔<span className="dot" />
        </button>
        <Link href="/editor" className="btn-m">✨ New Article</Link>
      </div>
    </header>
  )
}
