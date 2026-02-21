import Script from 'next/script'
import { ThemeProvider, Header, Footer, LiveStrip } from '@/components/public/sportba'
import type { LiveMatch } from '@/components/public/sportba'
import { getDefaultSite } from '@/lib/db'
import { getLiveMatches } from '@/lib/api-football'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const site = await getDefaultSite()
  const siteName = site?.name || 'Diurna'
  const gaId = site?.gaId || process.env.NEXT_PUBLIC_GA4_ID

  let matches: LiveMatch[] = []
  try {
    matches = await getLiveMatches()
  } catch {
    // API call failed silently — show empty strip
  }

  return (
    <ThemeProvider>
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
      <Header siteName={siteName} />
      <LiveStrip matches={matches} />
      {children}
      <Footer siteName={siteName} />
    </ThemeProvider>
  )
}
