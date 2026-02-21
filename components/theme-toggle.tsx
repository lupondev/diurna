'use client'

import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('diurna-theme')
    const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
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
