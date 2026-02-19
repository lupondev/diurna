'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { LanguageCode } from '@/lib/ai-engine/language-config'

const STORAGE_KEY = 'diurna_language'
const LANG_CHANGE_EVENT = 'diurna-language-change'

const DEFAULT_LANGUAGE: LanguageCode = 'bs'

interface LanguageStore {
  selectedLanguage: LanguageCode
  setLanguage: (code: LanguageCode) => void
}

const LanguageContext = createContext<LanguageStore>({
  selectedLanguage: DEFAULT_LANGUAGE,
  setLanguage: () => {},
})

function getStoredLanguage(): LanguageCode {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE
  const stored = localStorage.getItem(STORAGE_KEY)
  const validCodes: LanguageCode[] = ['bs', 'hr', 'sr-cyrl', 'sr-latn', 'cnj', 'en', 'ar', 'tr']
  if (stored && validCodes.includes(stored as LanguageCode)) return stored as LanguageCode
  return DEFAULT_LANGUAGE
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE)

  useEffect(() => {
    setSelectedLanguage(getStoredLanguage())

    function handleLangChange(e: Event) {
      const code = (e as CustomEvent).detail as LanguageCode
      setSelectedLanguage(code)
    }
    window.addEventListener(LANG_CHANGE_EVENT, handleLangChange)
    return () => window.removeEventListener(LANG_CHANGE_EVENT, handleLangChange)
  }, [])

  const setLanguage = useCallback((code: LanguageCode) => {
    setSelectedLanguage(code)
    localStorage.setItem(STORAGE_KEY, code)
    document.cookie = `diurna-lang=${code};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`
    document.documentElement.lang = code
    window.dispatchEvent(new CustomEvent(LANG_CHANGE_EVENT, { detail: code }))
  }, [])

  return (
    <LanguageContext.Provider value={{ selectedLanguage, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguageStore(): LanguageStore {
  return useContext(LanguageContext)
}

export { LANG_CHANGE_EVENT, STORAGE_KEY, DEFAULT_LANGUAGE }
