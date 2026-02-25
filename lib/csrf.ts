import type { NextRequest } from 'next/server'

const ALLOWED_ORIGINS = [
  process.env.NEXTAUTH_URL,
  'https://sportba.ba',
  'https://www.sportba.ba',
  'https://diurna.vercel.app',
  'http://localhost:3000',
].filter(Boolean)

export function validateOrigin(req: NextRequest | Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true
  return ALLOWED_ORIGINS.some((allowed) => origin.startsWith(allowed!))
}
