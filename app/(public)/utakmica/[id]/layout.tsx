/**
 * Server component layout for /utakmica/[id].
 *
 * WHY THIS FILE EXISTS:
 * The page.tsx is 'use client' (interactive tabs/animations need hooks).
 * Next.js does not allow generateMetadata() in 'use client' components.
 * Solution: add a server layout at the same segment level — it wraps the
 * client page and can export generateMetadata() normally.
 *
 * generateMetadata() here fetches real match data from getMatch() and
 * produces entity-specific title, canonical, og:url, og:type, and
 * SportsEvent JSON-LD — giving Google proper match intent signals.
 */
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getMatch, mapStatus } from '@/lib/api-football'
import { buildMetadata, canonicalUrl } from '@/lib/seo'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://todayfootballmatch.com').replace(/\/$/, '')
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'TodayFootballMatch'

function formatMatchDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('bs-BA', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function eventStatusUrl(status: 'live' | 'ft' | 'scheduled'): string {
  if (status === 'live') return 'https://schema.org/EventMovedOnline'
  if (status === 'ft') return 'https://schema.org/EventPostponed'
  return 'https://schema.org/EventScheduled'
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const match = await getMatch(Number(id))

  // Fallback if API unavailable — still better than generic title
  if (!match) {
    return buildMetadata({
      pageTitle: 'Utakmica',
      description: 'Detalji, statistike i rezultati utakmice.',
      canonicalPath: `/utakmica/${id}`,
    })
  }

  const home = match.teams.home.name
  const away = match.teams.away.name
  const league = match.league.name
  const dateFormatted = formatMatchDate(match.fixture.date)
  const status = mapStatus(match.fixture.status.short)

  // Score string only for finished/live matches
  const homeGoals = match.goals.home
  const awayGoals = match.goals.away
  const hasScore = homeGoals !== null && awayGoals !== null && status !== 'scheduled'
  const scoreStr = hasScore ? ` ${homeGoals}:${awayGoals}` : ''

  // Title: "Arsenal vs Chelsea 2:1 | Premier League | 15. feb 2026 | TodayFootballMatch"
  const pageTitle = `${home} vs ${away}${scoreStr} | ${league} | ${dateFormatted}`
  const description = hasScore
    ? `${home} ${homeGoals} – ${awayGoals} ${away} · ${league} · ${dateFormatted}. Statistike, postave i ključni trenuci.`
    : `${home} vs ${away} · ${league} · ${dateFormatted}. Pratite utakmicu uživo — statistike, postave i komentari.`

  const canonicalPath = `/utakmica/${id}`
  const canonical = canonicalUrl(canonicalPath)

  const metadata = buildMetadata({
    pageTitle,
    description,
    canonicalPath,
    ogType: 'article',
  })

  // Inject SportsEvent JSON-LD
  ;(metadata as Record<string, unknown>).__sportsEventJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${home} vs ${away}`,
    description,
    url: canonical,
    startDate: match.fixture.date,
    location: match.fixture.venue?.name ? {
      '@type': 'Place',
      name: match.fixture.venue.name,
      address: match.fixture.venue.city || undefined,
    } : undefined,
    homeTeam: { '@type': 'SportsTeam', name: home },
    awayTeam: { '@type': 'SportsTeam', name: away },
    organizer: { '@type': 'Organization', name: league },
    eventStatus: eventStatusUrl(status),
    ...(hasScore ? {
      subEvent: [{
        '@type': 'Event',
        name: 'Rezultat',
        description: `${home} ${homeGoals} – ${awayGoals} ${away}`,
      }]
    } : {}),
  })

  return metadata
}

export default async function MatchLayout(
  { children, params }: { children: ReactNode; params: Promise<{ id: string }> }
) {
  const { id } = await params
  const match = await getMatch(Number(id))

  if (!match) return <>{children}</>

  const home = match.teams.home.name
  const away = match.teams.away.name
  const league = match.league.name
  const dateFormatted = formatMatchDate(match.fixture.date)
  const status = mapStatus(match.fixture.status.short)
  const homeGoals = match.goals.home
  const awayGoals = match.goals.away
  const hasScore = homeGoals !== null && awayGoals !== null && status !== 'scheduled'
  const canonical = canonicalUrl(`/utakmica/${id}`)

  const description = hasScore
    ? `${home} ${homeGoals} – ${awayGoals} ${away} · ${league} · ${dateFormatted}. Statistike, postave i ključni trenuci.`
    : `${home} vs ${away} · ${league} · ${dateFormatted}. Pratite utakmicu uživo — statistike, postave i komentari.`

  const sportsEventLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${home} vs ${away}`,
    description,
    url: canonical,
    startDate: match.fixture.date,
    location: match.fixture.venue?.name ? {
      '@type': 'Place',
      name: match.fixture.venue.name,
      address: match.fixture.venue.city || undefined,
    } : undefined,
    homeTeam: {
      '@type': 'SportsTeam',
      name: home,
      logo: match.teams.home.logo || undefined,
    },
    awayTeam: {
      '@type': 'SportsTeam',
      name: away,
      logo: match.teams.away.logo || undefined,
    },
    organizer: {
      '@type': 'Organization',
      name: league,
      url: `${SITE_URL}/tabela`,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    eventStatus: eventStatusUrl(status),
    ...(hasScore ? {
      subEvent: [{
        '@type': 'Event',
        name: 'Rezultat',
        description: `${home} ${homeGoals} – ${awayGoals} ${away}`,
      }]
    } : {}),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsEventLd) }}
      />
      {children}
    </>
  )
}
