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

    const userId = session.user.id

    const body = await req.json()
    const data = OnboardingSchema.parse(body)

    let orgId: string
    try {
      const membership = await withTimeout(
        prisma.userOnOrganization.findFirst({
          where: { userId, deletedAt: null },
        }),
        TIMEOUT_MS,
        'Find organization'
      )
      if (!membership?.organizationId) {
        const user = await prisma.user.findUnique({ where: { id: userId } })
        const baseName = (user?.name || 'My').split(' ')[0] || 'My'
        const baseSlug = baseName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30) || 'newsroom'
        let slug = baseSlug
        let suffix = 1
        while (await prisma.organization.findFirst({ where: { slug } })) {
          slug = `${baseSlug}-${suffix++}`
        }
        const org = await prisma.organization.create({
          data: { name: `${baseName}'s Newsroom`, slug, plan: 'FREE' },
        })
        await prisma.userOnOrganization.create({
          data: { userId, organizationId: org.id, role: 'OWNER' },
        })
        orgId = org.id
      } else {
        orgId = membership.organizationId
      }
    } catch (err) {
      console.error('Onboarding step 1 (find org) failed:', err)
      return NextResponse.json({ error: 'Failed to find organization. Please try again.' }, { status: 500 })
    }

    try {
      const existingSite = await withTimeout(
        prisma.site.findFirst({
          where: { organizationId: orgId },
        }),
        TIMEOUT_MS,
        'Check existing site'
      )
      if (existingSite) {
        await withTimeout(
          prisma.user.update({
            where: { id: userId },
            data: { onboardingCompleted: true },
          }),
          TIMEOUT_MS,
          'Update user (existing site)'
        )
        return NextResponse.json({ success: true, redirectUrl: '/newsroom' }, { status: 201 })
      }
    } catch (err) {
      console.error('Onboarding step 1.5 (check existing site) failed:', err)
    }

    const timezoneMap: Record<string, string> = {
      en: 'Europe/London',
      bs: 'Europe/Sarajevo',
      hr: 'Europe/Zagreb',
      sr: 'Europe/Belgrade',
      de: 'Europe/Berlin',
      es: 'Europe/Madrid',
      fr: 'Europe/Paris',
      it: 'Europe/Rome',
    }

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
            timezone: timezoneMap[data.language] || 'UTC',
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

    // FIX BUG-003: Create AutopilotConfig for new tenant
    try {
      await withTimeout(
        prisma.autopilotConfig.upsert({
          where: { orgId },
          update: {},
          create: {
            orgId,
            dailyTarget: 10,
            defaultLength: 800,
            isActive: true,
            autoPublish: true,
            contentStyle: 'signal_only',
            translateLang: 'bs',
            scheduleStart: '07:00',
            scheduleEnd: '00:00',
            is24h: true,
            breakingNews: true,
            breakingThreshold: 70,
            gapDetection: true,
            gapHours: 2,
            matchAutoCoverage: true,
            tone: 'neutral',
            alwaysCreditSources: true,
            // FIX WARN-004: Create default categories
            categories: {
              create: [
                { name: 'Vijesti', slug: 'vijesti', color: '#3b82f6', percentage: 40, sortOrder: 0, widgetPoll: true, widgetStats: true },
                { name: 'Premier League', slug: 'premier-league', color: '#7c3aed', percentage: 30, sortOrder: 1, widgetStats: true },
                { name: 'Transferi', slug: 'transferi', color: '#10b981', percentage: 30, sortOrder: 2 },
              ]
            }
          },
        }),
        TIMEOUT_MS,
        'Create AutopilotConfig'
      )
    } catch (err) {
      // Non-fatal: log but continue — site is created, user can configure autopilot manually
      console.error('Onboarding step 2.5 (create autopilot config) failed:', err)
    }

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

    try {
      const defaultFeeds: Record<string, Array<{ name: string; url: string }>> = {
        en: [
          { name: 'BBC Sport Football', url: 'https://feeds.bbci.co.uk/sport/football/rss.xml' },
          { name: 'ESPN FC', url: 'https://www.espn.com/espn/rss/soccer/news' },
          { name: 'Sky Sports Football', url: 'https://www.skysports.com/rss/12040' },
        ],
        bs: [
          { name: 'Klix Sport', url: 'https://www.klix.ba/rss/sport' },
          { name: 'SportSport.ba', url: 'https://www.sportsport.ba/rss' },
        ],
        hr: [
          { name: 'Index.hr Sport', url: 'https://www.index.hr/rss/sport' },
          { name: 'Sportske Novosti', url: 'https://sportske.jutarnji.hr/rss' },
        ],
        sr: [
          { name: 'B92 Sport', url: 'https://www.b92.net/sport/rss/' },
          { name: 'Sportski Zurnal', url: 'https://sportskizurnal.com/rss' },
        ],
        de: [
          { name: 'Kicker', url: 'https://rss.kicker.de/news/aktuell' },
        ],
      }
      const feeds = defaultFeeds[data.language] || defaultFeeds.en || []
      if (feeds.length > 0) {
        await prisma.feedSource.createMany({
          data: feeds.map((f) => ({
            siteId,
            name: f.name,
            url: f.url,
            active: true,
          })),
          skipDuplicates: true,
        })
      }
    } catch (err) {
      console.error('Onboarding (seed feeds) failed:', err)
    }

    try {
      await withTimeout(
        prisma.user.update({
          where: { id: userId },
          data: { onboardingCompleted: true },
        }),
        TIMEOUT_MS,
        'Update user'
      )
    } catch (err) {
      console.error('Onboarding step 4 (mark completed) failed:', err)
      return NextResponse.json({ error: 'Failed to finalize setup. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, redirectUrl: '/newsroom' }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Onboarding error:', error)
    return NextResponse.json({ error: 'Onboarding failed. Please try again.' }, { status: 500 })
  }
}
