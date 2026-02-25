import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getDefaultSite } from '@/lib/db'
import { AthleteProfileClient } from './athlete-client'
import '../legende.css'

export const revalidate = 3600

interface ClubEntry {
  name: string
  logo?: string | null
  years: string
  apps?: number
  goals?: number
}

interface TimelineEntry {
  year: number
  event: string
  detail?: string
  highlight?: boolean
}

interface TrophyEntry {
  icon: string
  name: string
  year?: number
  club?: string
}

interface QuoteEntry {
  text: string
  source?: string
  year?: number
}

interface GalleryEntry {
  url: string
  caption?: string
}

export interface AthleteProfile {
  id: string
  name: string
  slug: string
  nickname: string | null
  sport: string
  position: string | null
  nationality: string
  birthDate: string | null
  birthPlace: string | null
  height: number | null
  strongerFoot: string | null
  bioLead: string | null
  bioFull: string | null
  quotes: QuoteEntry[]
  careerStart: number | null
  careerEnd: number | null
  clubs: ClubEntry[]
  timeline: TimelineEntry[]
  trophies: TrophyEntry[]
  totalApps: number | null
  totalGoals: number | null
  intApps: number | null
  intGoals: number | null
  careerYears: number | null
  legendRank: number | null
  isGoat: boolean
  photo: string | null
  coverPhoto: string | null
  gallery: GalleryEntry[]
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const site = await getDefaultSite()
  if (!site) return {}

  const athlete = await prisma.athlete.findUnique({
    where: { siteId_slug: { siteId: site.id, slug } },
    select: { name: true, sport: true, metaTitle: true, metaDescription: true, bioLead: true },
  })

  if (!athlete) return {}

  return {
    title: athlete.metaTitle || `${athlete.name} — Biografija i statistike`,
    description: athlete.metaDescription || athlete.bioLead || `Biografija, karijera i statistike: ${athlete.name}`,
  }
}

export async function generateStaticParams() {
  try {
    const site = await getDefaultSite()
    if (!site) return []

    const athletes = await prisma.athlete.findMany({
      where: { siteId: site.id, status: 'published', deletedAt: null },
      select: { slug: true },
      orderBy: { legendRank: 'asc' },
      take: 20,
    })

    return athletes.map((a) => ({ slug: a.slug }))
  } catch {
    return []
  }
}

export default async function AthleteProfilePage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const site = await getDefaultSite()
  if (!site) notFound()

  const raw = await prisma.athlete.findUnique({
    where: { siteId_slug: { siteId: site.id, slug } },
  })

  if (!raw || raw.deletedAt || raw.status !== 'published') notFound()

  const athlete: AthleteProfile = {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    nickname: raw.nickname,
    sport: raw.sport,
    position: raw.position,
    nationality: raw.nationality,
    birthDate: raw.birthDate?.toISOString() || null,
    birthPlace: raw.birthPlace,
    height: raw.height,
    strongerFoot: raw.strongerFoot,
    bioLead: raw.bioLead,
    bioFull: raw.bioFull,
    quotes: (raw.quotes as unknown as QuoteEntry[]) || [],
    careerStart: raw.careerStart,
    careerEnd: raw.careerEnd,
    clubs: (raw.clubs as unknown as ClubEntry[]) || [],
    timeline: (raw.timeline as unknown as TimelineEntry[]) || [],
    trophies: (raw.trophies as unknown as TrophyEntry[]) || [],
    totalApps: raw.totalApps,
    totalGoals: raw.totalGoals,
    intApps: raw.intApps,
    intGoals: raw.intGoals,
    careerYears: raw.careerYears,
    legendRank: raw.legendRank,
    isGoat: raw.isGoat,
    photo: raw.photo,
    coverPhoto: raw.coverPhoto,
    gallery: (raw.gallery as unknown as GalleryEntry[]) || [],
  }

  return <AthleteProfileClient athlete={athlete} />
}
