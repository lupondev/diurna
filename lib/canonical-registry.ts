// lib/canonical-registry.ts
// Central canonical path authority for TodayFootballMatch / Diurna.
//
// THREE CLASSES:
//   1. SAFE exact aliases (no params)     → auto-map EXACT_ALIASES
//   2. SAFE prefix aliases (numeric ID)   → auto-map PREFIX_ALIASES (ID-validated)
//   3. UNSAFE prefix aliases (slug)       → no-op; smart route.ts + DB decides
//
// USAGE:
//   sitemap builder   → assertCanonicalForSitemap()   (strict, throws in dev)
//   redirect handler  → toCanonicalPath(normalized)   (pre-normalized input)
//   raw input         → toCanonicalPathFromRaw(raw)   (normalizes first)
//   metadata builder  → resolveCanonicalForMetadata() (lenient, never throws)
//
// INVARIANT: toCanonicalPath() does NOT call normalizePath() internally.
// Reason: prevents 3-hop chains — middleware already handles normalization.

import { normalizePath } from './seo'

const has = (obj: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key)

const ID_RE = /^\d+$/
const isNumericId = (s: string) => ID_RE.test(s)

const BASE_PREFIXES = [
  '/vijesti', '/utakmica', '/igraci', '/transferi', '/povrede',
  '/utakmice', '/tabela', '/video', '/legende', '/organizacije',
] as const

// O(1) lookup. Add leagues/static pages here only.
const CANONICAL_EXACT_PAGES = new Set([
  '/',
  '/premier-league', '/la-liga', '/serie-a', '/bundesliga',
  '/ligue-1', '/champions-league',
  '/o-nama', '/kontakt', '/privatnost', '/uslovi', '/impressum', '/marketing',
])

const EXACT_ALIASES: Record<string, string> = {
  '/injuries':  '/povrede',
  '/matches':   '/utakmice',
  '/transfers': '/transferi',  // listing only; /transfers/:slug is UNSAFE
  '/standings': '/tabela',
  '/players':   '/igraci',
  '/news':      '/vijesti',    // listing only; /news/:slug is UNSAFE
}

type PrefixAlias = { fromSlash: string; to: string }
const PREFIX_ALIASES: PrefixAlias[] = [
  { fromSlash: '/players/', to: '/igraci'   },
  { fromSlash: '/match/',   to: '/utakmica' },
]

// /utakmice/ child paths are UNSAFE — /utakmice (listing) remains canonical.
const UNSAFE_PREFIXES = ['/news/', '/transfers/', '/utakmice/']

function isUnderCanonicalSpace(path: string): boolean {
  if (CANONICAL_EXACT_PAGES.has(path)) return true
  return (BASE_PREFIXES as readonly string[]).some(
    p => path === p || path.startsWith(`${p}/`)
  )
}

export function toCanonicalPath(pathNormalized: string): string {
  if (UNSAFE_PREFIXES.some(p => pathNormalized.startsWith(p))) return pathNormalized
  if (has(EXACT_ALIASES, pathNormalized)) return EXACT_ALIASES[pathNormalized]
  for (const { fromSlash, to } of PREFIX_ALIASES) {
    if (pathNormalized.startsWith(fromSlash)) {
      const param = pathNormalized.slice(fromSlash.length)
      return isNumericId(param) ? `${to}/${param}` : pathNormalized
    }
  }
  return pathNormalized
}

export function toCanonicalPathFromRaw(rawPath: string): string {
  return toCanonicalPath(normalizePath(rawPath))
}

export function isCanonicalPath(rawPath: string): boolean {
  const normalized = normalizePath(rawPath)
  if (normalized !== rawPath) return false
  if (UNSAFE_PREFIXES.some(p => normalized.startsWith(p))) return false
  if (has(EXACT_ALIASES, normalized)) return false
  for (const { fromSlash } of PREFIX_ALIASES) {
    if (normalized.startsWith(fromSlash)) return false
  }
  return isUnderCanonicalSpace(normalized)
}

export function assertCanonicalForSitemap(path: string): void {
  if (!isCanonicalPath(path)) {
    const suggestion = toCanonicalPath(path)
    const hint = suggestion !== path
      ? ` Canonical form: "${suggestion}".`
      : ' Requires smart route handler + DB lookup.'
    const msg = `[canonical-registry] Non-canonical path in sitemap: "${path}".${hint}`
    if (process.env.NODE_ENV === 'production') console.error(msg)
    else throw new Error(msg)
  }
}

export function resolveCanonicalForMetadata(
  rawPath: string,
  resolvedPath?: string | null
): string {
  if (resolvedPath) return normalizePath(resolvedPath)
  return toCanonicalPath(normalizePath(rawPath))
}
