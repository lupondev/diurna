import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const ROLE_ACCESS: Record<string, string[]> = {
  '/admin': ['OWNER', 'ADMIN'],
  '/copilot': ['OWNER', 'ADMIN', 'EDITOR'],
  '/calendar': ['OWNER', 'ADMIN', 'EDITOR'],
}

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host') || ''
  const { pathname } = req.nextUrl

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/onboarding')
  const isMarketingPage = pathname === '/landing'
  const isEmbedRoute = pathname.startsWith('/api/embed')
  const isOgRoute = pathname.startsWith('/api/og')
  const isFeedRoute = pathname.startsWith('/feed')
  const isHealthRoute = pathname.startsWith('/api/health')
  const isWebhookRoute = pathname.startsWith('/api/webhooks')
  const isCronRoute = pathname.startsWith('/api/cron')
  const isSeedRoute = pathname.startsWith('/api/admin/seed-feeds') || pathname.startsWith('/api/admin/seed-entities') || pathname.startsWith('/api/admin/seed-players') || pathname.startsWith('/api/admin/enrich-players') || pathname.startsWith('/api/admin/seed-matches') || pathname.startsWith('/api/admin/sync-players') || pathname.startsWith('/api/admin/scrape-salaries')
  const isNewsroomPublic = pathname.startsWith('/api/newsroom/clusters') || pathname.startsWith('/api/newsroom/fixtures') || pathname.startsWith('/api/newsroom/stats') || pathname.startsWith('/api/newsroom/for-you') || pathname.startsWith('/api/entities/search') || pathname.startsWith('/api/clubs') || pathname.startsWith('/api/fixtures/ticker')
  const isAdminApiWithBearer = (pathname.startsWith('/api/admin/backfill-images') || pathname.startsWith('/api/admin/seed') || pathname.startsWith('/api/admin/sync') || pathname.startsWith('/api/admin/enrich') || pathname.startsWith('/api/admin/revalidate') || pathname.startsWith('/api/debug/')) && req.headers.get('authorization')?.startsWith('Bearer ')
  const isSetupRoute = pathname.startsWith('/api/setup/')
  const isDashboardStats = pathname.startsWith('/api/dashboard/stats')
  const isCategoriesRoute = pathname.startsWith('/api/categories')
  const isPublicArticle = /^\/[a-z0-9-]+\/[a-z0-9-]+$/.test(pathname) && !pathname.startsWith('/api') && !pathname.startsWith('/site') && !pathname.startsWith('/feed') && !pathname.startsWith('/landing') && !pathname.startsWith('/login') && !pathname.startsWith('/register') && !pathname.startsWith('/onboarding') && !pathname.startsWith('/admin') && !pathname.startsWith('/editor') && !pathname.startsWith('/newsroom') && !pathname.startsWith('/copilot') && !pathname.startsWith('/dashboard') && !pathname.startsWith('/widgets') && !pathname.startsWith('/widget-creator') && !pathname.startsWith('/media') && !pathname.startsWith('/calendar') && !pathname.startsWith('/analytics') && !pathname.startsWith('/settings') && !pathname.startsWith('/team') && !pathname.startsWith('/templates') && !pathname.startsWith('/export') && !pathname.startsWith('/import') && !pathname.startsWith('/articles')
  const isHomepage = pathname === '/'
  const isStaticPage = ['/o-nama', '/impressum', '/privatnost', '/uslovi', '/kontakt', '/marketing'].includes(pathname)
  const isCategoryPage = ['/vijesti', '/transferi', '/utakmice', '/povrede', '/video', '/igraci', '/tabela'].includes(pathname)
  const isMatchCenter = pathname.startsWith('/utakmica/')
  const isPublicRoute = isHomepage || isStaticPage || isCategoryPage || isMatchCenter || pathname.startsWith('/api/auth') || pathname.startsWith('/api/public') || pathname.startsWith('/api/onboarding') || pathname.startsWith('/api/social/facebook/callback') || pathname.startsWith('/site') || isAuthPage || isMarketingPage || isEmbedRoute || isOgRoute || isFeedRoute || isCronRoute || isSeedRoute || isNewsroomPublic || isSetupRoute || isDashboardStats || isCategoriesRoute || isPublicArticle || isHealthRoute || isWebhookRoute || isAdminApiWithBearer

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
