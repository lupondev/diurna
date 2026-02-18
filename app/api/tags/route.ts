import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 50)
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const orgId = session?.user?.organizationId

    let siteId: string | undefined
    if (orgId) {
      const site = await prisma.site.findFirst({
        where: { organizationId: orgId },
        select: { id: true },
      })
      siteId = site?.id
    }

    const tags = await prisma.tag.findMany({
      where: siteId ? { siteId } : undefined,
      orderBy: { name: 'asc' },
      include: { _count: { select: { articles: true } } },
    })

    return NextResponse.json(tags)
  } catch (error) {
    console.error('Get tags error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name } = await req.json() as { name?: string }
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const orgId = session.user.organizationId
    const site = await prisma.site.findFirst({
      where: orgId ? { organizationId: orgId } : undefined,
      select: { id: true },
    })
    if (!site) {
      return NextResponse.json({ error: 'No site found' }, { status: 400 })
    }

    const slug = slugify(name.trim())

    const tag = await prisma.tag.upsert({
      where: { siteId_slug: { siteId: site.id, slug } },
      update: {},
      create: { siteId: site.id, name: name.trim(), slug },
    })

    return NextResponse.json(tag, { status: 201 })
  } catch (error) {
    console.error('Create tag error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
