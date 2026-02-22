'use client'

import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    // Read persisted preference; fall back to OS preference
    const saved = localStorage.getItem('diurna-theme')
    const isDark =
      saved === 'dark' ||
      (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setDark(isDark)
    applyTheme(isDark)
  }, [])

  function applyTheme(isDark: boolean) {
    const html = document.documentElement
    html.classList.toggle('dark', isDark)
    // Prevent white flash — set background immediately at CSS-var level
    html.style.backgroundColor = isDark ? '#0A0A0A' : ''
  }

  function toggle() {
    const next = !dark
    setDark(next)
    applyTheme(next)
    localStorage.setItem('diurna-theme', next ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggle}
      className="tb-btn"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{ fontSize: 14, width: 36, height: 36 }}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  )
}
