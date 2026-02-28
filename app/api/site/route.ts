import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDefaultSite, getCategories } from '@/lib/db'
import { prisma } from '@/lib/prisma'
import { validateOrigin } from '@/lib/csrf'
import { z } from 'zod'

const UpdateSiteSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  domain: z.string().max(253).optional(),
  gaId: z.string().max(50).optional().nullable(),
  language: z.string().min(2).max(10).optional(),
  timezone: z.string().max(50).optional(),
  theme: z.enum(['editorial', 'midnight']).optional(),
  wpSiteUrl: z.string().max(500).optional().nullable(),
  wpApiKey: z.string().max(500).optional().nullable(),
  competitorFeeds: z.array(z.string().url().max(500)).max(10).optional(),
  // Publication identity
  description: z.string().max(500).optional().nullable(),
  // SEO defaults
  metaTitle: z.string().max(200).optional().nullable(),
  metaDescription: z.string().max(500).optional().nullable(),
  ogImage: z.string().max(500).optional().nullable(),
  // Social links
  twitterHandle: z.string().max(100).optional().nullable(),
  facebookUrl: z.string().max(500).optional().nullable(),
  instagramHandle: z.string().max(100).optional().nullable(),
  youtubeUrl: z.string().max(500).optional().nullable(),
  brandColor: z.string().max(20).optional().nullable(),
  logo: z.string().url().max(500).optional().nullable(),
  favicon: z.string().url().max(500).optional().nullable(),
})

const CreateSiteSchema = z.object({
  name: z.string().min(1).max(100),
  domain: z.string().max(253).optional(),
  language: z.string().min(2).max(10).optional(),
  timezone: z.string().max(50).optional(),
})

export async function GET(req: NextRequest) {
  try {
    let orgId: string | undefined

    const mcpSecret = req.headers.get('x-mcp-secret')
    if (mcpSecret && mcpSecret === process.env.MCP_SECRET) {
      const headerOrgId = req.headers.get('x-org-id')
      if (headerOrgId) {
        orgId = headerOrgId
      } else {
        const firstOrg = await prisma.organization.findFirst()
        orgId = firstOrg?.id
      }
    } else {
      const session = await getServerSession(authOptions)
      if (!session?.user?.organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      orgId = session.user.organizationId
    }

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const all = searchParams.get('all')

    if (all === 'true') {
      const sites = await prisma.site.findMany({
        where: { organizationId: orgId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        include: {
          categories: { select: { id: true, name: true, slug: true } },
          _count: { select: { articles: true } },
        },
      })

      return NextResponse.json({
        sites: sites.map(s => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          domain: s.domain,
          language: s.language,
          timezone: s.timezone,
          theme: s.theme,
          categories: s.categories,
          articleCount: s._count.articles,
          createdAt: s.createdAt,
        })),
        total: sites.length,
      })
    }

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
      theme: site.theme,
      wpSiteUrl: site.wpSiteUrl,
      wpApiKey: site.wpApiKey,
      competitorFeeds: site.competitorFeeds,
      description: site.description,
      metaTitle: site.metaTitle,
      metaDescription: site.metaDescription,
      ogImage: site.ogImage,
      twitterHandle: site.twitterHandle,
      facebookUrl: site.facebookUrl,
      instagramHandle: site.instagramHandle,
      youtubeUrl: site.youtubeUrl,
      brandColor: (site as { brandColor?: string }).brandColor ?? null,
      logo: (site as { logo?: string }).logo ?? null,
      favicon: (site as { favicon?: string }).favicon ?? null,
      categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    })
  } catch (error) {
    console.error('Get site error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    let orgId: string | undefined

    const mcpSecret = req.headers.get('x-mcp-secret')
    if (mcpSecret && mcpSecret === process.env.MCP_SECRET) {
      const headerOrgId = req.headers.get('x-org-id')
      if (headerOrgId) {
        orgId = headerOrgId
      } else {
        const firstOrg = await prisma.organization.findFirst()
        orgId = firstOrg?.id
      }
    } else {
      const session = await getServerSession(authOptions)
      if (!session?.user?.organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      orgId = session.user.organizationId
    }

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = CreateSiteSchema.parse(body)

    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const existing = await prisma.site.findFirst({
      where: { organizationId: orgId, slug },
    })
    if (existing) {
      return NextResponse.json({ error: 'A site with this name already exists' }, { status: 409 })
    }

    const site = await prisma.site.create({
      data: {
        organizationId: orgId,
        name: data.name,
        slug,
        domain: data.domain || null,
        language: data.language || 'en',
        timezone: data.timezone || 'UTC',
      },
    })

    return NextResponse.json({
      id: site.id,
      name: site.name,
      slug: site.slug,
      domain: site.domain,
      language: site.language,
      timezone: site.timezone,
      theme: site.theme,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Create site error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    let orgId: string | undefined

    const mcpSecret = req.headers.get('x-mcp-secret')
    if (mcpSecret && mcpSecret === process.env.MCP_SECRET) {
      const headerOrgId = req.headers.get('x-org-id')
      if (headerOrgId) {
        orgId = headerOrgId
      } else {
        const firstOrg = await prisma.organization.findFirst()
        orgId = firstOrg?.id
      }
    } else {
      const session = await getServerSession(authOptions)
      if (!session?.user?.organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      orgId = session.user.organizationId
    }

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const site = await getDefaultSite(orgId)
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
        ...(data.wpSiteUrl !== undefined && { wpSiteUrl: data.wpSiteUrl || null }),
        ...(data.wpApiKey !== undefined && { wpApiKey: data.wpApiKey || null }),
        ...(data.competitorFeeds !== undefined && { competitorFeeds: data.competitorFeeds }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.metaTitle !== undefined && { metaTitle: data.metaTitle || null }),
        ...(data.metaDescription !== undefined && { metaDescription: data.metaDescription || null }),
        ...(data.ogImage !== undefined && { ogImage: data.ogImage || null }),
        ...(data.twitterHandle !== undefined && { twitterHandle: data.twitterHandle || null }),
        ...(data.facebookUrl !== undefined && { facebookUrl: data.facebookUrl || null }),
        ...(data.instagramHandle !== undefined && { instagramHandle: data.instagramHandle || null }),
        ...(data.youtubeUrl !== undefined && { youtubeUrl: data.youtubeUrl || null }),
        ...(data.brandColor !== undefined && { brandColor: data.brandColor || null }),
        ...(data.logo !== undefined && { logo: data.logo || null }),
        ...(data.favicon !== undefined && { favicon: data.favicon || null }),
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
      wpSiteUrl: updated.wpSiteUrl,
      wpApiKey: updated.wpApiKey,
      competitorFeeds: updated.competitorFeeds,
      description: updated.description,
      metaTitle: updated.metaTitle,
      metaDescription: updated.metaDescription,
      ogImage: updated.ogImage,
      twitterHandle: updated.twitterHandle,
      facebookUrl: updated.facebookUrl,
      instagramHandle: updated.instagramHandle,
      youtubeUrl: updated.youtubeUrl,
      brandColor: (updated as { brandColor?: string }).brandColor ?? null,
      logo: (updated as { logo?: string }).logo ?? null,
      favicon: (updated as { favicon?: string }).favicon ?? null,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    console.error('Update site error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
