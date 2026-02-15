import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, JetBrains_Mono, Instrument_Serif } from 'next/font/google'
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
  title: 'Diurna — AI-Powered Sports Publishing',
  description: 'The publishing platform for modern sports newsrooms. Powered by Lupon Media.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${jetbrains.variable} ${instrumentSerif.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
