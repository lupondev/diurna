export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'bs', label: 'Bosanski', flag: '🇧🇦' },
  { code: 'hr', label: 'Hrvatski', flag: '🇭🇷' },
  { code: 'sr', label: 'Srpski', flag: '🇷🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'tr', label: 'Turkce', flag: '🇹🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
] as const

export type LangCode = typeof SUPPORTED_LANGUAGES[number]['code']

export const DEFAULT_LANGUAGE: LangCode = 'en'

export function getLangLabel(code: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.label || code
}

export function getLangFlag(code: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.flag || '🌐'
}

export function getClientLanguage(): LangCode {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE
  const stored = localStorage.getItem('diurna-lang')
  if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) return stored as LangCode
  return DEFAULT_LANGUAGE
}

export function setClientLanguage(code: LangCode) {
  localStorage.setItem('diurna-lang', code)
  document.cookie = `diurna-lang=${code};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`
}
