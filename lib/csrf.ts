import type { NextRequest } from 'next/server'

const ALLOWED_ORIGINS = new Set(
  [
    process.env.NEXTAUTH_URL,
    'https://sportba.ba',
    'https://www.sportba.ba',
    'https://diurna.vercel.app',
    'http://localhost:3000',
  ]
    .filter(Boolean)
    .map((url) => {
      try {
        return new URL(url!).origin
      } catch {
        return null
      }
    })
    .filter(Boolean) as string[]
)

export function validateOrigin(req: NextRequest | Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true
  try {
    return ALLOWED_ORIGINS.has(new URL(origin).origin)
  } catch {
    return false
  }
}
