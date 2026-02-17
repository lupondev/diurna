import { ThemeProvider, Header, Footer, LiveStrip } from '@/components/public/sportba'
import type { LiveMatch } from '@/components/public/sportba'

const LIVE_MATCHES: LiveMatch[] = [
  { id: '1', home: 'Arsenal', away: 'Chelsea', homeScore: 2, awayScore: 1, status: 'live', minute: 67 },
  { id: '2', home: 'Barcelona', away: 'Real Madrid', homeScore: 1, awayScore: 1, status: 'live', minute: 34 },
  { id: '3', home: 'Bayern', away: 'Dortmund', homeScore: 3, awayScore: 0, status: 'ft' },
  { id: '4', home: 'Inter', away: 'Milan', status: 'scheduled', time: '20:45' },
  { id: '5', home: 'Liverpool', away: 'Man City', status: 'scheduled', time: '21:00' },
  { id: '6', home: 'PSG', away: 'Lyon', homeScore: 2, awayScore: 2, status: 'live', minute: 78 },
]

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Header />
      <LiveStrip matches={LIVE_MATCHES} />
      {children}
      <Footer />
    </ThemeProvider>
  )
}
