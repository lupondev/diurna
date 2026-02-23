import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const ROLE_ACCESS: Record<string, string[]> = {
  '/admin': ['OWNER', 'ADMIN'],
  '/copilot': ['OWNER', 'ADMIN', 'EDITOR'],
  '/calendar': ['OWNER', 'ADMIN', 'EDITOR'],
}

// Paths that should skip lowercase normalization (non-HTML assets and internals)
function shouldSkipNormalization(pathname: string): boolean {
  if (pathname.startsWith('/_next')) return true
  if (pathname.startsWith('/api')) return true
  if (pathname.startsWith('/sitemap')) return true
  if (pathname === '/robots.txt') return true
  if (pathname === '/favicon.ico') return true
  if (/\.[a-z0-9]{1,6}$/i.test(pathname)) return true // static files
  return false
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl
  const { pathname } = url
  const host = req.headers.get('host') || ''

  // ── SEO: Lowercase normalization (308) ─────────────────────────────────
  // Runs BEFORE auth check so /VIJESTI gets lowercased before alias redirect fires.
  // Trailing slash handled by trailingSlash:false in next.config.mjs.
  if (!shouldSkipNormalization(pathname)) {
    const lower = pathname.toLowerCase()
    if (lower !== pathname) {
      const next = url.clone()
      next.pathname = lower
      return NextResponse.redirect(next, 308)
    }
  }

  // ── Auth: route protection ──────────────────────────────────────────────
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/onboarding')
  const isMarketingPage = pathname === '/landing'
  const isEmbedRoute = pathname.startsWith('/api/embed')
  const isOgRoute = pathname.startsWith('/api/og')
  const isFeedRoute = pathname.startsWith('/feed')
  const isHealthRoute = pathname.startsWith('/api/health')
  const isWebhookRoute = pathname.startsWith('/api/webhooks')
  const isCronRoute = pathname.startsWith('/api/cron')
  const isSeedRoute = pathname.startsWith('/api/admin/seed-feeds') || pathname.startsWith('/api/admin/seed-entities') || pathname.startsWith('/api/admin/seed-players') || pathname.startsWith('/api/admin/enrich-players') || pathname.startsWith('/api/admin/seed-matches') || pathname.startsWith('/api/admin/sync-players') || pathname.startsWith('/api/admin/scrape-salaries')
  const isNewsroomPublic = pathname.startsWith('/api/newsroom/clusters') || pathname.startsWith('/api/newsroom/fixtures') || pathname.startsWith('/api/newsroom/stats') || pathname.startsWith('/api/newsroom/for-you') || pathname.startsWith('/api/entities/search') || pathname.startsWith('/api/clubs') || pathname.startsWith('/api/fixtures/ticker') || pathname.startsWith('/api/videos')
  const isAdminApiWithBearer = (pathname.startsWith('/api/admin/backfill-images') || pathname.startsWith('/api/admin/seed') || pathname.startsWith('/api/admin/sync') || pathname.startsWith('/api/admin/enrich') || pathname.startsWith('/api/admin/revalidate')) && req.headers.get('authorization')?.startsWith('Bearer ')
  const isSetupRoute = pathname.startsWith('/api/setup/')
  const isDashboardStats = pathname.startsWith('/api/dashboard/stats')
  const isCategoriesRoute = pathname.startsWith('/api/categories')
  const isPublicArticle = /^\/[a-z0-9-]+\/[a-z0-9-]+$/.test(pathname) && !pathname.startsWith('/api') && !pathname.startsWith('/site') && !pathname.startsWith('/feed') && !pathname.startsWith('/landing') && !pathname.startsWith('/login') && !pathname.startsWith('/register') && !pathname.startsWith('/onboarding') && !pathname.startsWith('/admin') && !pathname.startsWith('/editor') && !pathname.startsWith('/newsroom') && !pathname.startsWith('/copilot') && !pathname.startsWith('/dashboard') && !pathname.startsWith('/widgets') && !pathname.startsWith('/widget-creator') && !pathname.startsWith('/media') && !pathname.startsWith('/calendar') && !pathname.startsWith('/analytics') && !pathname.startsWith('/settings') && !pathname.startsWith('/team') && !pathname.startsWith('/templates') && !pathname.startsWith('/export') && !pathname.startsWith('/import') && !pathname.startsWith('/articles')
  const isHomepage = pathname === '/'
  const isStaticPage = ['/o-nama', '/impressum', '/privatnost', '/uslovi', '/kontakt', '/marketing'].includes(pathname)
  const isCategoryPage = ['/vijesti', '/transferi', '/utakmice', '/povrede', '/video', '/igraci', '/tabela'].includes(pathname)
  const isMatchCenter = pathname.startsWith('/utakmica/')
  const isMcpRoute = req.headers.get('x-mcp-secret') === process.env.MCP_SECRET && (
    pathname.startsWith('/api/autopilot') ||
    pathname.startsWith('/api/articles') ||
    pathname.startsWith('/api/site')
  )
  const isPublicRoute = isHomepage || isStaticPage || isCategoryPage || isMatchCenter || pathname.startsWith('/api/auth') || pathname.startsWith('/api/public') || pathname.startsWith('/api/onboarding') || pathname.startsWith('/api/social/facebook/callback') || pathname.startsWith('/site') || isAuthPage || isMarketingPage || isEmbedRoute || isOgRoute || isFeedRoute || isCronRoute || isSeedRoute || isNewsroomPublic || isSetupRoute || isDashboardStats || isCategoriesRoute || isPublicArticle || isHealthRoute || isWebhookRoute || isAdminApiWithBearer || isMcpRoute

  if (!isPublicRoute) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (!token.onboardingCompleted && !pathname.startsWith('/onboarding') && !pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }

    const userRole = (token.role as string) || 'JOURNALIST'
    for (const [routePrefix, allowedRoles] of Object.entries(ROLE_ACCESS)) {
      if (pathname.startsWith(routePrefix) && !allowedRoles.includes(userRole)) {
        const url = new URL('/newsroom', req.url)
        url.searchParams.set('error', 'unauthorized')
        return NextResponse.redirect(url)
      }
    }
  }

  // ── Tenant: org slug resolution ─────────────────────────────────────────
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
  if (orgSlug) requestHeaders.set('x-org-slug', orgSlug)
  requestHeaders.delete('x-org-id')

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|static).*)'],
}
