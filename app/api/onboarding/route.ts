import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const TIMEOUT_MS = 30_000

const OnboardingSchema = z.object({
  siteName: z.string().min(1).max(100),
  leagues: z.array(z.string()),
  language: z.string().default('en'),
})

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ])
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = OnboardingSchema.parse(body)

    // Step 1: Find org for user
    let orgId: string
    try {
      const membership = await withTimeout(
        prisma.userOnOrganization.findFirst({
          where: { userId: session.user.id, deletedAt: null },
        }),
        TIMEOUT_MS,
        'Find organization'
      )
      if (!membership?.organizationId) {
        return NextResponse.json({ error: 'No organization found' }, { status: 404 })
      }
      orgId = membership.organizationId
    } catch (err) {
      console.error('Onboarding step 1 (find org) failed:', err)
      return NextResponse.json({ error: 'Failed to find organization. Please try again.' }, { status: 500 })
    }

    // Step 2: Create site
    let siteId: string
    try {
      const slug = data.siteName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 50)
      const site = await withTimeout(
        prisma.site.create({
          data: {
            organizationId: orgId,
            name: data.siteName,
            slug: slug || 'my-site',
            language: data.language,
          },
        }),
        TIMEOUT_MS,
        'Create site'
      )
      siteId = site.id
    } catch (err) {
      console.error('Onboarding step 2 (create site) failed:', err)
      return NextResponse.json({ error: 'Failed to create site. Please try again.' }, { status: 500 })
    }

    // Step 3: Create categories from selected leagues
    try {
      const leagueCategories = data.leagues.map((league, i) => ({
        siteId,
        name: league,
        slug: league.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        order: i,
      }))
      if (leagueCategories.length > 0) {
        await withTimeout(
          prisma.category.createMany({ data: leagueCategories }),
          TIMEOUT_MS,
          'Create categories'
        )
      }
    } catch (err) {
      console.error('Onboarding step 3 (create categories) failed:', err)
      return NextResponse.json({ error: 'Failed to create league categories. Please try again.' }, { status: 500 })
    }

    // Step 4: Mark onboarding as completed
    try {
      await withTimeout(
        prisma.user.update({
          where: { id: session.user.id },
          data: { onboardingCompleted: true },
        }),
        TIMEOUT_MS,
        'Update user'
      )
    } catch (err) {
      console.error('Onboarding step 4 (mark completed) failed:', err)
      return NextResponse.json({ error: 'Failed to finalize setup. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, redirectUrl: '/dashboard' }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Onboarding error:', error)
    return NextResponse.json({ error: 'Onboarding failed. Please try again.' }, { status: 500 })
  }
}
