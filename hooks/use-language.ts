'use client'

import { useState, useEffect, useCallback } from 'react'
import { type Locale, type TranslationKey, t as translate } from '@/lib/i18n'

const STORAGE_KEY = 'diurna-locale'

export function useLanguage() {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (stored) setLocaleState(stored)
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem(STORAGE_KEY, newLocale)
  }, [])

  const t = useCallback((key: TranslationKey) => {
    return translate(key, locale)
  }, [locale])

  return { locale, setLocale, t }
}
