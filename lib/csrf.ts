import type { NextRequest } from 'next/server'

function buildAllowedOrigins(): Set<string> {
  const origins: string[] = []

  // Static allowed origins
  const staticOrigins = [
    process.env.NEXTAUTH_URL,
    'https://sportba.ba',
    'https://www.sportba.ba',
    'https://diurna.vercel.app',
    'http://localhost:3000',
  ]

  for (const url of staticOrigins) {
    if (!url) continue
    try {
      origins.push(new URL(url).origin)
    } catch { /* skip invalid */ }
  }

  // Dynamic: add all custom domains from CUSTOM_DOMAIN_MAP
  try {
    const domainMap = JSON.parse(process.env.CUSTOM_DOMAIN_MAP || '{}') as Record<string, string>
    for (const domain of Object.keys(domainMap)) {
      origins.push(`https://${domain}`)
      // Also add www variant if not already www
      if (!domain.startsWith('www.')) {
        origins.push(`https://www.${domain}`)
      }
    }
  } catch { /* skip invalid JSON */ }

  // Also add VERCEL_URL if present (preview deploys)
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`)
  }

  return new Set(origins)
}

const ALLOWED_ORIGINS = buildAllowedOrigins()

export function validateOrigin(req: NextRequest | Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true
  try {
    return ALLOWED_ORIGINS.has(new URL(origin).origin)
  } catch {
    return false
  }
}
