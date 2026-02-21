import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getDefaultSite } from '@/lib/db'
import { OrganizacijeClient } from './organizacije-client'
import './organizacije.css'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Sportske organizacije BiH — Savezi, klubovi i lige',
    description: 'Kompletna baza sportskih organizacija u Bosni i Hercegovini. Savezi, klubovi, lige i udruženja.',
  }
}

interface OrgStats {
  members?: number
  clubs?: number
  titles?: number
  competitions?: number
}

export interface OrgCard {
  id: string
  name: string
  nameShort: string | null
  slug: string
  type: string
  sport: string
  level: string
  entity: string | null
  city: string | null
  founded: number | null
  logo: string | null
  stats: OrgStats | null
  featured: boolean
  description?: string | null
}

export default async function OrganizacijePage() {
  const site = await getDefaultSite()

  let orgs: OrgCard[] = []

  if (site) {
    const raw = await prisma.sportOrganization.findMany({
      where: {
        siteId: site.id,
        status: 'published',
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        nameShort: true,
        slug: true,
        type: true,
        sport: true,
        level: true,
        entity: true,
        city: true,
        founded: true,
        logo: true,
        stats: true,
        featured: true,
        description: true,
      },
      orderBy: [{ featured: 'desc' }, { name: 'asc' }],
    })

    orgs = raw.map((o) => ({
      ...o,
      stats: o.stats as unknown as OrgStats | null,
    }))
  }

  return <OrganizacijeClient orgs={orgs} />
}
