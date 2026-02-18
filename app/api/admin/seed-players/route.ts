import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const TOP_PLAYERS: { name: string; shortName: string; currentTeam: string; position: string; nationality: string }[] = [
  { name: 'Erling Haaland', shortName: 'Haaland', currentTeam: 'Manchester City', position: 'ST', nationality: 'Norway' },
  { name: 'Mohamed Salah', shortName: 'Salah', currentTeam: 'Liverpool', position: 'RW', nationality: 'Egypt' },
  { name: 'Bukayo Saka', shortName: 'Saka', currentTeam: 'Arsenal', position: 'RW', nationality: 'England' },
  { name: 'Cole Palmer', shortName: 'Palmer', currentTeam: 'Chelsea', position: 'AM', nationality: 'England' },
  { name: 'Marcus Rashford', shortName: 'Rashford', currentTeam: 'Manchester United', position: 'LW', nationality: 'England' },
  { name: 'Bruno Fernandes', shortName: 'B. Fernandes', currentTeam: 'Manchester United', position: 'AM', nationality: 'Portugal' },
  { name: 'Martin Odegaard', shortName: 'Odegaard', currentTeam: 'Arsenal', position: 'AM', nationality: 'Norway' },
  { name: 'Phil Foden', shortName: 'Foden', currentTeam: 'Manchester City', position: 'AM', nationality: 'England' },
  { name: 'Son Heung-min', shortName: 'Son', currentTeam: 'Tottenham', position: 'LW', nationality: 'South Korea' },
  { name: 'Kevin De Bruyne', shortName: 'De Bruyne', currentTeam: 'Manchester City', position: 'CM', nationality: 'Belgium' },
  { name: 'Alexander Isak', shortName: 'Isak', currentTeam: 'Newcastle', position: 'ST', nationality: 'Sweden' },
  { name: 'Declan Rice', shortName: 'Rice', currentTeam: 'Arsenal', position: 'CM', nationality: 'England' },
  { name: 'Virgil van Dijk', shortName: 'Van Dijk', currentTeam: 'Liverpool', position: 'CB', nationality: 'Netherlands' },
  { name: 'Matthijs de Ligt', shortName: 'De Ligt', currentTeam: 'Manchester United', position: 'CB', nationality: 'Netherlands' },
  { name: 'Lisandro Martinez', shortName: 'L. Martinez', currentTeam: 'Manchester United', position: 'CB', nationality: 'Argentina' },
  { name: 'Alexis Mac Allister', shortName: 'Mac Allister', currentTeam: 'Liverpool', position: 'CM', nationality: 'Argentina' },
  { name: 'Sandro Tonali', shortName: 'Tonali', currentTeam: 'Newcastle', position: 'CM', nationality: 'Italy' },
  { name: 'Harry Maguire', shortName: 'Maguire', currentTeam: 'Manchester United', position: 'CB', nationality: 'England' },
  { name: 'William Saliba', shortName: 'Saliba', currentTeam: 'Arsenal', position: 'CB', nationality: 'France' },
  { name: 'Trent Alexander-Arnold', shortName: 'TAA', currentTeam: 'Liverpool', position: 'RB', nationality: 'England' },
  { name: 'Kylian Mbappe', shortName: 'Mbappe', currentTeam: 'Real Madrid', position: 'ST', nationality: 'France' },
  { name: 'Vinicius Junior', shortName: 'Vinicius Jr', currentTeam: 'Real Madrid', position: 'LW', nationality: 'Brazil' },
  { name: 'Jude Bellingham', shortName: 'Bellingham', currentTeam: 'Real Madrid', position: 'AM', nationality: 'England' },
  { name: 'Lamine Yamal', shortName: 'Yamal', currentTeam: 'Barcelona', position: 'RW', nationality: 'Spain' },
  { name: 'Robert Lewandowski', shortName: 'Lewandowski', currentTeam: 'Barcelona', position: 'ST', nationality: 'Poland' },
  { name: 'Pedri', shortName: 'Pedri', currentTeam: 'Barcelona', position: 'CM', nationality: 'Spain' },
  { name: 'Gavi', shortName: 'Gavi', currentTeam: 'Barcelona', position: 'CM', nationality: 'Spain' },
  { name: 'Raphinha', shortName: 'Raphinha', currentTeam: 'Barcelona', position: 'LW', nationality: 'Brazil' },
  { name: 'Antoine Griezmann', shortName: 'Griezmann', currentTeam: 'Atletico Madrid', position: 'ST', nationality: 'France' },
  { name: 'Federico Valverde', shortName: 'Valverde', currentTeam: 'Real Madrid', position: 'CM', nationality: 'Uruguay' },
  { name: 'Lautaro Martinez', shortName: 'Lautaro', currentTeam: 'Inter Milan', position: 'ST', nationality: 'Argentina' },
  { name: 'Dusan Vlahovic', shortName: 'Vlahovic', currentTeam: 'Juventus', position: 'ST', nationality: 'Serbia' },
  { name: 'Hakan Calhanoglu', shortName: 'Calhanoglu', currentTeam: 'Inter Milan', position: 'CM', nationality: 'Turkey' },
  { name: 'Rafael Leao', shortName: 'Leao', currentTeam: 'AC Milan', position: 'LW', nationality: 'Portugal' },
  { name: 'Victor Osimhen', shortName: 'Osimhen', currentTeam: 'Galatasaray', position: 'ST', nationality: 'Nigeria' },
  { name: 'Nicolo Barella', shortName: 'Barella', currentTeam: 'Inter Milan', position: 'CM', nationality: 'Italy' },
  { name: 'Pierre Kalulu', shortName: 'Kalulu', currentTeam: 'Juventus', position: 'CB', nationality: 'France' },
  { name: 'Francesco Pio Esposito', shortName: 'Pio Esposito', currentTeam: 'Spezia', position: 'ST', nationality: 'Italy' },
  { name: 'Andrea Cambiaso', shortName: 'Cambiaso', currentTeam: 'Juventus', position: 'LB', nationality: 'Italy' },
  { name: 'Manuel Locatelli', shortName: 'Locatelli', currentTeam: 'Juventus', position: 'CM', nationality: 'Italy' },
  { name: 'Piotr Zielinski', shortName: 'Zielinski', currentTeam: 'Inter Milan', position: 'CM', nationality: 'Poland' },
  { name: 'Alessandro Bastoni', shortName: 'Bastoni', currentTeam: 'Inter Milan', position: 'CB', nationality: 'Italy' },
  { name: 'Harry Kane', shortName: 'Kane', currentTeam: 'Bayern Munich', position: 'ST', nationality: 'England' },
  { name: 'Florian Wirtz', shortName: 'Wirtz', currentTeam: 'Bayer Leverkusen', position: 'AM', nationality: 'Germany' },
  { name: 'Jamal Musiala', shortName: 'Musiala', currentTeam: 'Bayern Munich', position: 'AM', nationality: 'Germany' },
  { name: 'Xavi Simons', shortName: 'X. Simons', currentTeam: 'RB Leipzig', position: 'AM', nationality: 'Netherlands' },
  { name: 'Ousmane Dembele', shortName: 'Dembele', currentTeam: 'PSG', position: 'RW', nationality: 'France' },
  { name: 'Bradley Barcola', shortName: 'Barcola', currentTeam: 'PSG', position: 'LW', nationality: 'France' },
  { name: 'Achraf Hakimi', shortName: 'Hakimi', currentTeam: 'PSG', position: 'RB', nationality: 'Morocco' },
  { name: 'Cristiano Ronaldo', shortName: 'Ronaldo', currentTeam: 'Al Nassr', position: 'ST', nationality: 'Portugal' },
  { name: 'Lionel Messi', shortName: 'Messi', currentTeam: 'Inter Miami', position: 'RW', nationality: 'Argentina' },
  { name: 'Neymar Jr', shortName: 'Neymar', currentTeam: 'Santos', position: 'LW', nationality: 'Brazil' },
  { name: 'Pep Guardiola', shortName: 'Guardiola', currentTeam: 'Manchester City', position: 'Manager', nationality: 'Spain' },
  { name: 'Jurgen Klopp', shortName: 'Klopp', currentTeam: 'Unemployed', position: 'Manager', nationality: 'Germany' },
  { name: 'Carlo Ancelotti', shortName: 'Ancelotti', currentTeam: 'Real Madrid', position: 'Manager', nationality: 'Italy' },
  { name: 'Mikel Arteta', shortName: 'Arteta', currentTeam: 'Arsenal', position: 'Manager', nationality: 'Spain' },
  { name: 'Ruben Amorim', shortName: 'Amorim', currentTeam: 'Manchester United', position: 'Manager', nationality: 'Portugal' },
  { name: 'Enzo Maresca', shortName: 'Maresca', currentTeam: 'Chelsea', position: 'Manager', nationality: 'Italy' },
  { name: 'Hansi Flick', shortName: 'Flick', currentTeam: 'Barcelona', position: 'Manager', nationality: 'Germany' },
  { name: 'Simone Inzaghi', shortName: 'S. Inzaghi', currentTeam: 'Inter Milan', position: 'Manager', nationality: 'Italy' },
  { name: 'Thiago Motta', shortName: 'T. Motta', currentTeam: 'Juventus', position: 'Manager', nationality: 'Italy' },
  { name: 'Xabi Alonso', shortName: 'Xabi Alonso', currentTeam: 'Bayer Leverkusen', position: 'Manager', nationality: 'Spain' },
  { name: 'Luis Enrique', shortName: 'Luis Enrique', currentTeam: 'PSG', position: 'Manager', nationality: 'Spain' },
  { name: 'Michael Carrick', shortName: 'Carrick', currentTeam: 'Middlesbrough', position: 'Manager', nationality: 'England' },
]

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const session = await getServerSession(authOptions)
  const isCron = auth === `Bearer ${process.env.CRON_SECRET}` || auth === `Bearer ${process.env.FOOTBALL_API_KEY}`
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'

  if (!isCron && !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let created = 0
  for (const player of TOP_PLAYERS) {
    try {
      const existing = await prisma.player.findFirst({
        where: { name: player.name },
      })

      if (existing) {
        await prisma.player.update({
          where: { id: existing.id },
          data: {
            currentTeam: player.currentTeam,
            position: player.position,
            shortName: player.shortName,
            nationality: player.nationality,
          },
        })
      } else {
        await prisma.player.create({
          data: {
            name: player.name,
            shortName: player.shortName,
            currentTeam: player.currentTeam,
            position: player.position,
            nationality: player.nationality,
          },
        })
      }
      created++
    } catch (e) {
      console.error(`Failed to seed ${player.name}:`, e)
    }
  }
  return NextResponse.json({ created, total: TOP_PLAYERS.length })
}
