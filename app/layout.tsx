import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, JetBrains_Mono, Instrument_Serif } from 'next/font/google'
import { SessionProvider } from '@/components/providers/session-provider'
import { GoogleAnalytics } from '@/components/analytics/ga4'
import './globals.css'

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

export const metadata: Metadata = {
  title: {
    default: 'Diurna — AI-Powered Sports Publishing',
    template: '%s | Diurna',
  },
  description: 'The publishing platform for modern sports newsrooms. Powered by Lupon Media.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://diurna.io'),
  openGraph: {
    type: 'website',
    siteName: 'Diurna',
    title: 'Diurna — AI-Powered Sports Publishing',
    description: 'The publishing platform for modern sports newsrooms. Powered by Lupon Media.',
  },
  twitter: {
    card: 'summary_large_image',
  },
  alternates: {
    types: { 'application/rss+xml': '/feed' },
    languages: {
      'en': '/',
      'bs': '/?lang=bs',
      'hr': '/?lang=hr',
      'sr': '/?lang=sr',
      'de': '/?lang=de',
      'tr': '/?lang=tr',
      'ar': '/?lang=ar',
      'x-default': '/',
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${jetbrains.variable} ${instrumentSerif.variable} antialiased`}>
        <GoogleAnalytics />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
