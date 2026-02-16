import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDefaultSite, getCategories } from '@/lib/db'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const orgId = session?.user?.organizationId || undefined
    const site = await getDefaultSite(orgId)
    if (!site) {
      return NextResponse.json({ error: 'No site found' }, { status: 404 })
    }

    const categories = await getCategories(site.id)

    return NextResponse.json({
      id: site.id,
      name: site.name,
      slug: site.slug,
      domain: site.domain,
      gaId: site.gaId,
      language: site.language,
      timezone: site.timezone,
      categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    })
  } catch (error) {
    console.error('Get site error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const orgId = session?.user?.organizationId || undefined
    const site = await getDefaultSite(orgId)
    if (!site) {
      return NextResponse.json({ error: 'No site found' }, { status: 404 })
    }

    const body = await req.json()
    const { name, domain, gaId, language, timezone } = body

    const updated = await prisma.site.update({
      where: { id: site.id },
      data: {
        ...(name !== undefined && { name }),
        ...(domain !== undefined && { domain }),
        ...(gaId !== undefined && { gaId: gaId || null }),
        ...(language !== undefined && { language }),
        ...(timezone !== undefined && { timezone }),
      },
    })

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      domain: updated.domain,
      gaId: updated.gaId,
      language: updated.language,
      timezone: updated.timezone,
    })
  } catch (error) {
    console.error('Update site error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
