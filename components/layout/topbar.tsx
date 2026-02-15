'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const pageMeta: Record<string, { icon: string; title: string }> = {
  '/': { icon: '📊', title: 'Dashboard' },
  '/newsroom': { icon: '📰', title: 'Newsroom' },
  '/editor': { icon: '🤖', title: 'AI Co-Pilot' },
  '/widgets': { icon: '🧩', title: 'Widgets' },
  '/widget-creator': { icon: '🛠️', title: 'Widget Creator' },
  '/calendar': { icon: '📅', title: 'Calendar' },
  '/analytics': { icon: '📈', title: 'Analytics' },
  '/team': { icon: '👥', title: 'Team' },
  '/settings': { icon: '⚙️', title: 'Settings' },
  '/templates/midnight': { icon: '🌙', title: 'Midnight Pro Template' },
  '/templates/editorial': { icon: '📰', title: 'Clean Editorial Template' },
}

function getMeta(pathname: string) {
  if (pageMeta[pathname]) return pageMeta[pathname]
  if (pathname.startsWith('/editor')) return pageMeta['/editor']
  if (pathname.startsWith('/templates')) return { icon: '🎨', title: 'Template Preview' }
  return pageMeta['/']
}

export function Topbar() {
  const pathname = usePathname()
  const meta = getMeta(pathname)

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
