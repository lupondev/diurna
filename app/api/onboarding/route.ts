import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const OnboardingSchema = z.object({
  siteName: z.string().min(1).max(100),
  leagues: z.array(z.string()),
  language: z.string().default('en'),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = OnboardingSchema.parse(body)

    // Find or create org for user
    const membership = await prisma.userOnOrganization.findFirst({
      where: { userId: session.user.id, deletedAt: null },
    })

    const orgId = membership?.organizationId
    if (!orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Create site for org
    const slug = data.siteName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 50)

    const site = await prisma.site.create({
      data: {
        organizationId: orgId,
        name: data.siteName,
        slug: slug || 'my-site',
        language: data.language,
      },
    })

    // Create default categories from selected leagues
    const leagueCategories = data.leagues.map((league, i) => ({
      siteId: site.id,
      name: league,
      slug: league.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      order: i,
    }))

    if (leagueCategories.length > 0) {
      await prisma.category.createMany({ data: leagueCategories })
    }

    return NextResponse.json({ success: true, siteId: site.id }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Onboarding error:', error)
    return NextResponse.json({ error: 'Onboarding failed' }, { status: 500 })
  }
}
