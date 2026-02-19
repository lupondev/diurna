export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'bs', label: 'Bosanski', flag: '🇧🇦' },
  { code: 'hr', label: 'Hrvatski', flag: '🇭🇷' },
  { code: 'sr', label: 'Srpski (Ćir)', flag: '🇷🇸' },
  { code: 'sr-Latn', label: 'Srpski (Lat)', flag: '🇷🇸' },
  { code: 'cnr', label: 'Crnogorski', flag: '🇲🇪' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
] as const

export type LangCode = typeof SUPPORTED_LANGUAGES[number]['code']

export const DEFAULT_LANGUAGE: LangCode = 'en'

/** Single storage key — ALL language selectors must use this */
const STORAGE_KEY = 'diurna-lang'

/** Custom event name dispatched on language change */
export const LANG_CHANGE_EVENT = 'diurna-language-change'

export function getLangLabel(code: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.label || code
}

export function getLangFlag(code: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.flag || '🌐'
}

export function getClientLanguage(): LangCode {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) return stored as LangCode
  return DEFAULT_LANGUAGE
}

/**
 * Set client language — updates localStorage, cookie, HTML lang attribute,
 * and dispatches a custom event so ALL language selectors sync.
 */
export function setClientLanguage(code: LangCode) {
  localStorage.setItem(STORAGE_KEY, code)
  document.cookie = `diurna-lang=${code};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`
  // Update HTML lang attribute
  document.documentElement.lang = code
  // Dispatch custom event for cross-component sync
  window.dispatchEvent(new CustomEvent(LANG_CHANGE_EVENT, { detail: code }))
}
