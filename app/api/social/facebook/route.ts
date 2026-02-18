import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDefaultSite } from '@/lib/db'
import { getAuthUrl } from '@/lib/facebook'
import { prisma } from '@/lib/prisma'

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

    const connection = await prisma.socialConnection.findUnique({
      where: { siteId_provider: { siteId: site.id, provider: 'facebook' } },
      include: { pages: { orderBy: { pageName: 'asc' } } },
    })

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const redirectUri = `${baseUrl}/api/social/facebook/callback`
    const authUrl = getAuthUrl(redirectUri)

    return NextResponse.json({
      authUrl,
      connected: !!connection && connection.pages.length > 0,
      pages: connection?.pages.map((p) => ({
        id: p.id,
        pageId: p.pageId,
        pageName: p.pageName,
        isActive: p.isActive,
      })) || [],
    })
  } catch (error) {
    console.error('FB status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { pageId, isActive } = await req.json() as { pageId?: string; isActive?: boolean }
    if (!pageId || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Missing pageId or isActive' }, { status: 400 })
    }

    await prisma.socialPage.update({
      where: { id: pageId },
      data: { isActive },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('FB toggle error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
