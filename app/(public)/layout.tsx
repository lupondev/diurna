import Script from 'next/script'
import { ThemeProvider, Header, Footer, LiveStrip } from '@/components/public/sportba'
import type { LiveMatch } from '@/components/public/sportba'
import { getDefaultSite } from '@/lib/db'
import { getLiveMatches } from '@/lib/api-football'

// NEVER use 'Diurna' as fallback on public routes — that is platform branding.
// Always fall back to NEXT_PUBLIC_SITE_NAME env, then a safe generic name.
const FALLBACK_SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'TodayFootballMatch'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const site = await getDefaultSite()
  const siteName = site?.name || FALLBACK_SITE_NAME
  const gaId = site?.gaId || process.env.NEXT_PUBLIC_GA4_ID

  let matches: LiveMatch[] = []
  try {
    matches = await getLiveMatches()
  } catch {
    // API call failed silently — show empty strip
  }

  return (
    <ThemeProvider>
      <a href="#main-content" className="skip-link sba-skip-link">Preskoči na sadržaj</a>
      {gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}');
          `}</Script>
        </>
      )}
      <Header siteName={siteName} liveCount={matches.filter((m) => m.status === 'live').length} />
      <LiveStrip matches={matches} />
      {children}
      <Footer siteName={siteName} />
    </ThemeProvider>
  )
}
