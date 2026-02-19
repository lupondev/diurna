'use client'

import { useState, useEffect, useCallback } from 'react'
import { type TranslationKey, t as translate } from '@/lib/i18n'
import {
  getClientLanguage,
  setClientLanguage,
  LANG_CHANGE_EVENT,
  type LangCode,
} from '@/lib/languages'

/**
 * Unified language hook — reads from the same localStorage key as
 * topbar and settings page, and listens for cross-component sync events.
 */
export function useLanguage() {
  const [locale, setLocaleState] = useState<LangCode>('en')

  useEffect(() => {
    // Initialize from shared storage
    setLocaleState(getClientLanguage())

    // Listen for language changes from other components
    function handleLangChange(e: Event) {
      const code = (e as CustomEvent).detail as LangCode
      setLocaleState(code)
    }
    window.addEventListener(LANG_CHANGE_EVENT, handleLangChange)
    return () => window.removeEventListener(LANG_CHANGE_EVENT, handleLangChange)
  }, [])

  const setLocale = useCallback((newLocale: LangCode) => {
    setLocaleState(newLocale)
    setClientLanguage(newLocale)
  }, [])

  // Map extended codes to i18n Locale type for translations
  const i18nLocale = mapToI18nLocale(locale)

  const t = useCallback((key: TranslationKey) => {
    return translate(key, i18nLocale)
  }, [i18nLocale])

  return { locale, setLocale, t }
}

/**
 * Map LangCode to the i18n Locale type (which has fewer variants).
 * sr-Latn and cnr fall back to closest translation set.
 */
function mapToI18nLocale(code: LangCode): 'en' | 'bs' | 'hr' | 'sr' | 'de' | 'ar' | 'fr' | 'es' {
  switch (code) {
    case 'sr-Latn': return 'sr'
    case 'cnr': return 'bs'  // Montenegrin UI closest to Bosnian
    case 'tr': return 'en'   // Turkish fallback to English
    case 'bs':
    case 'hr':
    case 'sr':
    case 'en':
    case 'de':
    case 'ar':
      return code
    default:
      return 'en'
  }
}
