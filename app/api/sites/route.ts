import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrg } from '@/lib/tenant'

export async function GET() {
  try {
    const org = await getOrg()
    const sites = await prisma.site.findMany({
      where: { organizationId: org.id, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        language: true,
        timezone: true,
        theme: true,
        createdAt: true,
        _count: { select: { articles: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({
      sites: sites.map(({ _count, ...s }) => ({ ...s, articleCount: _count.articles })),
    })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load sites' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const org = await getOrg()
    const body = (await req.json()) as { name?: string; slug?: string; domain?: string; language?: string; timezone?: string }
    const { name, slug, domain, language, timezone } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    const cleanSlug = String(slug)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    const existing = await prisma.site.findFirst({
      where: { organizationId: org.id, slug: cleanSlug, deletedAt: null },
    })
    if (existing) {
      return NextResponse.json({ error: 'A site with this slug already exists' }, { status: 409 })
    }

    const site = await prisma.site.create({
      data: {
        organizationId: org.id,
        name,
        slug: cleanSlug,
        domain: domain || null,
        language: language || 'bs',
        timezone: timezone || 'Europe/Sarajevo',
        theme: 'editorial',
      },
    })

    const defaultCategories = [
      { name: 'Vijesti', slug: 'vijesti', icon: '📰', order: 0 },
      { name: 'Transferi', slug: 'transferi', icon: '🔄', order: 1 },
      { name: 'Aktuelno', slug: 'aktuelno', icon: '🔥', order: 2 },
    ]
    await prisma.category.createMany({
      data: defaultCategories.map((c) => ({ siteId: site.id, name: c.name, slug: c.slug, icon: c.icon, order: c.order })),
    })

    return NextResponse.json({ site }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create site' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const org = await getOrg()
    const body = (await req.json()) as { siteId?: string }
    const { siteId } = body

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 })
    }

    const siteCount = await prisma.site.count({
      where: { organizationId: org.id, deletedAt: null },
    })
    if (siteCount <= 1) {
      return NextResponse.json({ error: 'Cannot delete the last site' }, { status: 400 })
    }

    const site = await prisma.site.findFirst({
      where: { id: siteId, organizationId: org.id, deletedAt: null },
    })
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    await prisma.site.update({
      where: { id: siteId },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 })
  }
}
