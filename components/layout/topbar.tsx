'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  SUPPORTED_LANGUAGES,
  getClientLanguage,
  setClientLanguage,
  getLangFlag,
  LANG_CHANGE_EVENT,
  type LangCode,
} from '@/lib/languages'
import { ThemeToggle } from '@/components/theme-toggle'

const pageMeta: Record<string, { icon: string; title: string }> = {
  '/': { icon: '📊', title: 'Dashboard' },
  '/newsroom': { icon: '📰', title: 'Newsroom' },
  '/editor': { icon: '✍️', title: 'Editor' },
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

const notifications = [
  { icon: '📰', text: 'New article published', detail: '"El Clásico Preview" is now live', time: '2m ago', unread: true },
  { icon: '🤖', text: 'AI Co-Pilot finished generating', detail: 'Match report ready for review', time: '18m ago', unread: true },
  { icon: '👥', text: 'Team member joined', detail: 'Sarah K. accepted your invite', time: '1h ago', unread: false },
  { icon: '📊', text: 'Weekly analytics ready', detail: 'Widget impressions up 24% this week', time: '3h ago', unread: false },
]

export function Topbar() {
  const pathname = usePathname()
  const meta = getMeta(pathname)
  const [showNotifs, setShowNotifs] = useState(false)
  const [showLang, setShowLang] = useState(false)
  const [lang, setLang] = useState<LangCode>('en')
  const ref = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLang(getClientLanguage())

    // Listen for language changes from other components (sidebar, settings)
    function handleLangChange(e: Event) {
      const code = (e as CustomEvent).detail as LangCode
      setLang(code)
    }
    window.addEventListener(LANG_CHANGE_EVENT, handleLangChange)
    return () => window.removeEventListener(LANG_CHANGE_EVENT, handleLangChange)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowNotifs(false)
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setShowLang(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <header className="tb">
      <h1 className="tb-title">{meta.icon} {meta.title}</h1>
      <div className="tb-right">
        <div className="tb-lang-wrap" ref={langRef}>
          <button className="tb-btn tb-lang-btn" onClick={() => setShowLang(!showLang)}>
            {getLangFlag(lang)}
          </button>
          {showLang && (
            <div className="tb-lang-dropdown">
              <div className="tb-lang-head">Language</div>
              {SUPPORTED_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  className={`tb-lang-item${lang === l.code ? ' active' : ''}`}
                  onClick={() => {
                    setLang(l.code)
                    setClientLanguage(l.code)
                    setShowLang(false)
                  }}
                >
                  <span className="tb-lang-flag">{l.flag}</span>
                  <span className="tb-lang-label">{l.label}</span>
                  {lang === l.code && <span className="tb-lang-check">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="tb-notif-wrap" ref={ref}>
          <button className="tb-btn" onClick={() => setShowNotifs(!showNotifs)}>
            🔔<span className="dot" />
          </button>
          {showNotifs && (
            <div className="tb-notif-dropdown">
              <div className="tb-notif-head">
                <span className="tb-notif-title">Notifications</span>
                <span className="tb-notif-count">{notifications.filter(n => n.unread).length} new</span>
              </div>
              {notifications.map((n, i) => (
                <div key={i} className={`tb-notif-item${n.unread ? ' unread' : ''}`}>
                  <div className="tb-notif-icon">{n.icon}</div>
                  <div className="tb-notif-body">
                    <div className="tb-notif-text">{n.text}</div>
                    <div className="tb-notif-detail">{n.detail}</div>
                    <div className="tb-notif-time">{n.time}</div>
                  </div>
                  {n.unread && <div className="tb-notif-dot" />}
                </div>
              ))}
              <div className="tb-notif-footer">View all notifications</div>
            </div>
          )}
        </div>
        <ThemeToggle />
        <Link href="/editor" className="btn-m">✨ New Article</Link>
      </div>
    </header>
  )
}
