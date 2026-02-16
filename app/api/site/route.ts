import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDefaultSite, getCategories } from '@/lib/db'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateSiteSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  domain: z.string().max(253).optional(),
  gaId: z.string().max(50).optional().nullable(),
  language: z.string().min(2).max(10).optional(),
  timezone: z.string().max(50).optional(),
  theme: z.enum(['editorial', 'midnight']).optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const site = await getDefaultSite(session.user.organizationId)
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
      theme: site.theme,
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
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const site = await getDefaultSite(session.user.organizationId)
    if (!site) {
      return NextResponse.json({ error: 'No site found' }, { status: 404 })
    }

    const body = await req.json()
    const data = UpdateSiteSchema.parse(body)

    const updated = await prisma.site.update({
      where: { id: site.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.domain !== undefined && { domain: data.domain }),
        ...(data.gaId !== undefined && { gaId: data.gaId || null }),
        ...(data.language !== undefined && { language: data.language }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
        ...(data.theme !== undefined && { theme: data.theme }),
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
      theme: updated.theme,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    console.error('Update site error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
