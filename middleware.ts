import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || ''

  let orgSlug: string | null = null

  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
    // DEV MODE: org1.localhost:3000 or fallback to DEFAULT_ORG_SLUG
    const parts = host.split('.')
    if (parts.length > 1 && !parts[0].startsWith('localhost')) {
      orgSlug = parts[0]
    } else {
      orgSlug = process.env.DEFAULT_ORG_SLUG || null
    }
  } else {
    // PRODUCTION: {slug}.diurna.app
    const subdomain = host.split('.')[0]
    if (subdomain !== 'www' && subdomain !== 'app') {
      orgSlug = subdomain
    }
  }

  // Forward slug via REQUEST headers (not response!)
  const requestHeaders = new Headers(req.headers)
  if (orgSlug) {
    requestHeaders.set('x-org-slug', orgSlug)
  }
  // Delete any client-spoofed header
  requestHeaders.delete('x-org-id')

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: ['/((?!_next|api/auth|api/public|embed|favicon.ico|static).*)'],
}
