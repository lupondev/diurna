import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken, getUserPages } from '@/lib/facebook'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error || !code) {
    // User denied or error occurred — redirect back to settings
    return NextResponse.redirect(new URL('/settings?fb=error', req.url))
  }

  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const redirectUri = `${baseUrl}/api/social/facebook/callback`

    // Exchange code for user token
    const userToken = await exchangeCodeForToken(code, redirectUri)

    // Get user's pages
    const pages = await getUserPages(userToken)

    if (pages.length === 0) {
      return NextResponse.redirect(new URL('/settings?fb=no-pages', req.url))
    }

    // Encode pages data in URL so the Settings page can display a picker
    const pagesParam = encodeURIComponent(JSON.stringify(
      pages.map((p) => ({ id: p.id, name: p.name, token: p.access_token }))
    ))

    return NextResponse.redirect(new URL(`/settings?fb=success&pages=${pagesParam}`, req.url))
  } catch (err) {
    console.error('FB callback error:', err)
    return NextResponse.redirect(new URL('/settings?fb=error', req.url))
  }
}
