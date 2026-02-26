import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { captureApiError } from '@/lib/sentry'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const site = await prisma.site.findFirst({
      where: { organizationId: session.user.organizationId, deletedAt: null },
      select: { id: true },
    })
    if (!site) {
      return NextResponse.json({ error: 'No site found' }, { status: 404 })
    }

    const categories = await prisma.category.findMany({
      where: { siteId: site.id, deletedAt: null },
      orderBy: { order: 'asc' },
      select: { id: true, name: true, slug: true, icon: true },
    })
    return NextResponse.json({ categories })
  } catch (error) {
    captureApiError(error, { route: '/api/categories', method: 'GET' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
