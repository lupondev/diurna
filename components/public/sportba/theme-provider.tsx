'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

const STORAGE_KEY = 'sportba-theme'

type ThemeContextValue = {
  theme: string
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggle: () => {},
})

/** Inline script that runs before first paint to prevent theme flash */
function ThemeScript() {
  const code = `(function(){try{var s=localStorage.getItem("${STORAGE_KEY}");if(!s){s=window.matchMedia("(prefers-color-scheme:light)").matches?"light":"dark"}document.documentElement.setAttribute("data-theme",s)}catch(e){document.documentElement.setAttribute("data-theme","dark")}})()`
  return <script dangerouslySetInnerHTML={{ __html: code }} />
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState('dark')

  // Sync state with the actual attribute set by ThemeScript
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setTheme(stored)
    } else {
      const prefersLight = window.matchMedia(
        '(prefers-color-scheme: light)'
      ).matches
      setTheme(prefersLight ? 'light' : 'dark')
    }
  }, [])

  // Apply theme attribute and lang
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Respond to OS-level theme changes when user has no stored preference
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }
    mql.addEventListener('change', handler)
    return () => {
      mql.removeEventListener('change', handler)
      document.documentElement.removeAttribute('data-theme')
    }
  }, [])

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle])

  return (
    <ThemeContext.Provider value={value}>
      <ThemeScript />
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
