import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Role hierarchy for route access
const ROLE_ACCESS: Record<string, string[]> = {
  '/admin': ['OWNER', 'ADMIN'],
  '/copilot': ['OWNER', 'ADMIN', 'EDITOR'],
  '/calendar': ['OWNER', 'ADMIN', 'EDITOR'],
}

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host') || ''
  const { pathname } = req.nextUrl

  // ─── Auth check for platform routes ───
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/onboarding')
  const isMarketingPage = pathname === '/landing'
  const isEmbedRoute = pathname.startsWith('/api/embed')
  const isPublicRoute = pathname.startsWith('/api/auth') || pathname.startsWith('/api/public') || pathname.startsWith('/api/onboarding') || pathname.startsWith('/api/social/facebook/callback') || pathname.startsWith('/site') || isAuthPage || isMarketingPage || isEmbedRoute

  if (!isPublicRoute) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Redirect non-onboarded users to onboarding (skip API routes)
    if (!token.onboardingCompleted && !pathname.startsWith('/onboarding') && !pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }

    // ─── Role-based route protection ───
    const userRole = (token.role as string) || 'JOURNALIST'
    for (const [routePrefix, allowedRoles] of Object.entries(ROLE_ACCESS)) {
      if (pathname.startsWith(routePrefix) && !allowedRoles.includes(userRole)) {
        const url = new URL('/newsroom', req.url)
        url.searchParams.set('error', 'unauthorized')
        return NextResponse.redirect(url)
      }
    }
  }

  // ─── Org slug detection ───
  let orgSlug: string | null = null

  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
    const parts = host.split('.')
    if (parts.length > 1 && !parts[0].startsWith('localhost')) {
      orgSlug = parts[0]
    } else {
      orgSlug = process.env.DEFAULT_ORG_SLUG || null
    }
  } else {
    const subdomain = host.split('.')[0]
    if (subdomain !== 'www' && subdomain !== 'app') {
      orgSlug = subdomain
    }
  }

  const requestHeaders = new Headers(req.headers)
  if (orgSlug) {
    requestHeaders.set('x-org-slug', orgSlug)
  }
  requestHeaders.delete('x-org-id')

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|static).*)'],
}
