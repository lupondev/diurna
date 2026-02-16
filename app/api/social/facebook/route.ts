import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDefaultSite } from '@/lib/db'
import { getAuthUrl } from '@/lib/facebook'
import { prisma } from '@/lib/prisma'

// GET: return FB auth URL or current connection status
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = session.user.organizationId || undefined
    const site = await getDefaultSite(orgId)
    if (!site) {
      return NextResponse.json({ error: 'No site found' }, { status: 404 })
    }

    // Check existing connection
    const connection = await prisma.socialConnection.findUnique({
      where: { siteId_provider: { siteId: site.id, provider: 'facebook' } },
    })

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const redirectUri = `${baseUrl}/api/social/facebook/callback`
    const authUrl = getAuthUrl(redirectUri)

    return NextResponse.json({
      authUrl,
      connected: !!connection,
      pageName: connection?.pageName || null,
      pageId: connection?.pageId || null,
    })
  } catch (error) {
    console.error('FB status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: disconnect Facebook
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = session.user.organizationId || undefined
    const site = await getDefaultSite(orgId)
    if (!site) {
      return NextResponse.json({ error: 'No site found' }, { status: 404 })
    }

    await prisma.socialConnection.deleteMany({
      where: { siteId: site.id, provider: 'facebook' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('FB disconnect error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: select a page after OAuth (receives pageId from client)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = session.user.organizationId || undefined
    const site = await getDefaultSite(orgId)
    if (!site) {
      return NextResponse.json({ error: 'No site found' }, { status: 404 })
    }

    const { pageId, pageName, pageToken } = await req.json()
    if (!pageId || !pageToken) {
      return NextResponse.json({ error: 'Missing pageId or pageToken' }, { status: 400 })
    }

    await prisma.socialConnection.upsert({
      where: { siteId_provider: { siteId: site.id, provider: 'facebook' } },
      create: {
        siteId: site.id,
        provider: 'facebook',
        accessToken: pageToken,
        pageId,
        pageName: pageName || null,
      },
      update: {
        accessToken: pageToken,
        pageId,
        pageName: pageName || null,
      },
    })

    return NextResponse.json({ success: true, pageName })
  } catch (error) {
    console.error('FB save page error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
