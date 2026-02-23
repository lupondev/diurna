import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, JetBrains_Mono, Instrument_Serif, DM_Serif_Display, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import { SessionProvider } from '@/components/providers/session-provider'
import { GoogleAnalytics } from '@/components/analytics/ga4'
import { Toaster } from '@/components/providers/toaster'
import './globals.css'
import './sportba.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
})

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-sb-serif',
  display: 'swap',
})

const ibmSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-sb-sans',
  display: 'swap',
})

const ibmMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: '600',
  variable: '--font-sb-mono',
  display: 'swap',
})

// metadataBase is REQUIRED — without it Next.js renders relative canonical/og:image URLs
// which break in ISR, edge, and some crawlers.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://todayfootballmatch.com'),
  title: {
    // Template used by all pages via generateMetadata(). "%s" = pageTitle.
    // Fallback (home page if generateMetadata not present) = first entry below.
    default: 'TodayFootballMatch — Sportske vijesti i rezultati',
    template: '%s | TodayFootballMatch',
  },
  description: 'Najnovije vijesti, live rezultati, transferi i tabele iz vodećih europskih liga.',
  openGraph: {
    type: 'website',
    siteName: 'TodayFootballMatch', // NEVER 'Diurna'
    title: 'TodayFootballMatch — Sportske vijesti i rezultati',
    description: 'Najnovije vijesti, live rezultati, transferi i tabele iz vodećih europskih liga.',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@todayfootballmatch',
  },
  alternates: {
    types: { 'application/rss+xml': '/feed' },
  },
}

// Inline script that runs BEFORE any paint — eliminates dark mode FOUC completely.
const themeScript = `
try {
  var t = localStorage.getItem('diurna-theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var isDark = t === 'dark' || (!t && prefersDark);
  if (isDark) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.backgroundColor = '#0A0A0A';
    document.documentElement.style.colorScheme = 'dark';
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.backgroundColor = '';
    document.documentElement.style.colorScheme = 'light';
  }
} catch(e) {}
`.trim()

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="bs" suppressHydrationWarning>
      <head>
        {/* CRITICAL: must be first script — runs synchronously before first paint */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${jakarta.variable} ${jetbrains.variable} ${instrumentSerif.variable} ${dmSerif.variable} ${ibmSans.variable} ${ibmMono.variable} antialiased`}>
        <GoogleAnalytics />
        <Toaster />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
