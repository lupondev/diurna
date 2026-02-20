import Script from 'next/script'
import { ThemeProvider, Header, Footer, LiveStrip } from '@/components/public/sportba'
import type { LiveMatch } from '@/components/public/sportba'
import { getDefaultSite } from '@/lib/db'
import { prisma } from '@/lib/prisma'

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID

function mapMatchStatus(status: string | null): 'live' | 'ft' | 'scheduled' {
  if (!status) return 'scheduled'
  const s = status.toUpperCase()
  if (['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(s)) return 'live'
  if (['FT', 'AET', 'PEN'].includes(s)) return 'ft'
  return 'scheduled'
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const site = await getDefaultSite()
  const siteName = site?.name || 'Diurna'

  // Fetch live/recent matches from DB (populated by football API cron)
  let matches: LiveMatch[] = []
  try {
    const dbMatches = await prisma.matchResult.findMany({
      where: {
        matchDate: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
      },
      orderBy: { matchDate: 'desc' },
      take: 10,
    })
    matches = dbMatches.map((m) => ({
      id: m.apiFootballId?.toString() || m.id,
      home: m.homeTeam,
      away: m.awayTeam,
      homeScore: m.homeScore ?? undefined,
      awayScore: m.awayScore ?? undefined,
      status: mapMatchStatus(m.status),
    }))
  } catch {
    // DB query failed silently — show empty strip
  }

  return (
    <ThemeProvider>
      {GA4_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA4_ID}');
          `}</Script>
        </>
      )}
      <Header siteName={siteName} />
      <LiveStrip matches={matches} />
      {children}
      <Footer siteName={siteName} />
    </ThemeProvider>
  )
}
