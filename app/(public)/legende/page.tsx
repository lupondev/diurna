import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getDefaultSite } from '@/lib/db'
import { LegendeClient } from './legende-client'
import './legende.css'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Top 100 Bosanskohercegovačkih sportista svih vremena',
    description: 'Kompletne biografije, statistike i karijerne istorije najvećih BH sportista.',
  }
}

interface AthleteCard {
  id: string
  name: string
  slug: string
  sport: string
  position: string | null
  legendRank: number | null
  isGoat: boolean
  photo: string | null
  nationality: string
  careerStart: number | null
  careerEnd: number | null
  totalApps: number | null
  totalGoals: number | null
  nickname: string | null
}

export default async function LegendePage() {
  const site = await getDefaultSite()

  let athletes: AthleteCard[] = []

  if (site) {
    athletes = await prisma.athlete.findMany({
      where: {
        siteId: site.id,
        status: 'published',
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        sport: true,
        position: true,
        legendRank: true,
        isGoat: true,
        photo: true,
        nationality: true,
        careerStart: true,
        careerEnd: true,
        totalApps: true,
        totalGoals: true,
        nickname: true,
      },
      orderBy: [{ legendRank: 'asc' }],
    })
  }

  return <LegendeClient athletes={athletes} />
}
