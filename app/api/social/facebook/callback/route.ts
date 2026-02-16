import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDefaultSite } from '@/lib/db'
import { exchangeCodeForToken, getUserPages } from '@/lib/facebook'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/settings?fb=error', req.url))
  }

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/settings?fb=error', req.url))
    }

    const orgId = session.user.organizationId || undefined
    const site = await getDefaultSite(orgId)
    if (!site) {
      return NextResponse.redirect(new URL('/settings?fb=error', req.url))
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const redirectUri = `${baseUrl}/api/social/facebook/callback`

    const userToken = await exchangeCodeForToken(code, redirectUri)

    const pages = await getUserPages(userToken)

    if (pages.length === 0) {
      return NextResponse.redirect(new URL('/settings?fb=no-pages', req.url))
    }

    const connection = await prisma.socialConnection.upsert({
      where: { siteId_provider: { siteId: site.id, provider: 'facebook' } },
      create: {
        siteId: site.id,
        provider: 'facebook',
        accessToken: userToken,
      },
      update: {
        accessToken: userToken,
      },
    })

    for (const page of pages) {
      await prisma.socialPage.upsert({
        where: { connectionId_pageId: { connectionId: connection.id, pageId: page.id } },
        create: {
          connectionId: connection.id,
          pageId: page.id,
          pageName: page.name,
          pageToken: page.access_token,
          isActive: true,
        },
        update: {
          pageName: page.name,
          pageToken: page.access_token,
        },
      })
    }

    return NextResponse.redirect(new URL('/settings?fb=success', req.url))
  } catch (err) {
    console.error('FB callback error:', err)
    return NextResponse.redirect(new URL('/settings?fb=error', req.url))
  }
}
