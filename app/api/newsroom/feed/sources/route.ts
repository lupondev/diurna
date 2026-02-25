import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const site = await prisma.site.findFirst({
    where: { organizationId: session.user.organizationId },
    select: { id: true },
  })
  if (!site) {
    return NextResponse.json([])
  }
  const sources = await prisma.feedSource.findMany({
    where: { siteId: site.id },
    orderBy: [{ tier: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(sources)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const site = await prisma.site.findFirst({
    where: { organizationId: session.user.organizationId },
    select: { id: true },
  })
  if (!site) {
    return NextResponse.json({ error: 'No site found' }, { status: 400 })
  }
  const body = await req.json() as { name?: string; url?: string; tier?: number }
  const { name, url, tier } = body
  if (!name || !url) {
    return NextResponse.json({ error: 'Name and URL required' }, { status: 400 })
  }
  try {
    const source = await prisma.feedSource.create({
      data: {
        name: name.trim(),
        url: url.trim(),
        tier: tier ?? 2,
        active: true,
        category: 'breaking',
        siteId: site.id,
      },
    })
    return NextResponse.json(source)
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'A source with this URL already exists' }, { status: 409 })
    }
    console.error('Feed source create error:', e)
    return NextResponse.json({ error: 'Failed to create source' }, { status: 500 })
  }
}
