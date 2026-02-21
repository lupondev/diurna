import { PrismaClient } from '@prisma/client'
import { generateContent } from '../lib/ai/client'

const prisma = new PrismaClient()

const SITE_ID = process.env.SEED_SITE_ID || 'cmloz9ti30004ky04dv0mxd91'

interface AthleteSpec {
  name: string
  sport: string
  rank: number
  isGoat?: boolean
  position?: string
  historical?: boolean
}

const ATHLETES: AthleteSpec[] = [
  { name: 'Edin Džeko', sport: 'fudbal', rank: 1, isGoat: true, position: 'Napadač' },
  { name: 'Safet Sušić', sport: 'fudbal', rank: 2, position: 'Veznjak' },
  { name: 'Mirza Teletović', sport: 'košarka', rank: 3, position: 'Krilo' },
  { name: 'Predrag Danilović', sport: 'košarka', rank: 4, position: 'Bek' },
  { name: 'Zvjezdan Misimović', sport: 'fudbal', rank: 5, position: 'Veznjak' },
  { name: 'Hasan Salihamidžić', sport: 'fudbal', rank: 6, position: 'Veznjak' },
  { name: 'Vedad Ibišević', sport: 'fudbal', rank: 7, position: 'Napadač' },
  { name: 'Elvir Balić', sport: 'fudbal', rank: 8, position: 'Veznjak' },
  { name: 'Amel Tuka', sport: 'atletika', rank: 9, position: '800m' },
  { name: 'Jusuf Nurkić', sport: 'košarka', rank: 10, position: 'Centar' },
  { name: 'Senad Lupić', sport: 'fudbal', rank: 11, position: 'Veznjak' },
  { name: 'Mehmed Baždarević', sport: 'fudbal', rank: 12, position: 'Veznjak' },
  { name: 'Dino Đurđević', sport: 'fudbal', rank: 13, position: 'Napadač' },
  { name: 'Larisa Cerić', sport: 'džudo', rank: 14, position: '+78kg' },
  { name: 'Amel Mekić', sport: 'džudo', rank: 15, position: '-90kg' },
  { name: 'Vesna Bajkuša', sport: 'atletika', rank: 16, position: 'Skok u dalj' },
  { name: 'Zlatan Muslimović', sport: 'fudbal', rank: 17, position: 'Napadač' },
  { name: 'Asim Ferhatović Hase', sport: 'fudbal', rank: 18, position: 'Napadač', historical: true },
  { name: 'Munib Ušanović', sport: 'boks', rank: 19, position: 'Srednja kategorija' },
  { name: 'Dragan Čović', sport: 'košarka', rank: 20, position: 'Bek' },
]

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/č/g, 'c').replace(/ć/g, 'c').replace(/š/g, 's')
    .replace(/ž/g, 'z').replace(/đ/g, 'dj')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const SYSTEM_PROMPT = `Ti si sportski istoričar i biograf specijaliziran za bosanskohercegovački sport.
Generiši tačan, detaljan, kvalitetan biografski sadržaj na bosanskom jeziku.
Sve činjenice moraju biti historijski tačne. Vraćaj SAMO validan JSON bez markdown formatiranja.
NIKAD ne koristi \`\`\`json wrapper. Samo čist JSON.`

async function generateAthleteData(spec: AthleteSpec) {
  const prompt = `Generiši kompletnu biografiju za ${spec.name} (${spec.sport}, BiH).
${spec.historical ? 'Ovo je historijska ličnost.' : ''}

Vrati JSON sa TAČNO ovim poljima:
{
  "nickname": "nadimak ili null",
  "nationality": "BA",
  "birthDate": "YYYY-MM-DD ili null",
  "birthPlace": "grad rođenja",
  "height": broj_u_cm ili null,
  "strongerFoot": "desna" ili "lijeva" ili "obje" ili null (za nefudbalere null),
  "bioLead": "2-3 rečenice, uvodni paragraf, kompeljantan",
  "bioFull": "400-600 riječi, Wikipedia kvalitet ali bolji, detaljna biografija karijere",
  "quotes": [{"text": "citat", "source": "izvor", "year": 2020}],
  "careerStart": godina_početka_karijere,
  "careerEnd": godina_kraja ili null ako je aktivan,
  "clubs": [{"name": "Klub", "logo": null, "years": "2007-2011", "apps": 120, "goals": 45}],
  "timeline": [{"year": 2004, "event": "Naslov eventa", "detail": "Detalj", "highlight": true/false}],
  "trophies": [{"icon": "🏆", "name": "Naziv trofeja", "year": 2012, "club": "Klub"}],
  "totalApps": ukupne_utakmice,
  "totalGoals": ukupni_golovi (ili poeni za košarku ili medalje za atletiku),
  "intApps": reprezentativne_utakmice,
  "intGoals": reprezentativni_golovi,
  "careerYears": broj_godina_karijere
}

Za košarkaše: totalGoals = prosječni poeni po utakmici * 100, intGoals = prosječni poeni za reprezentaciju
Za atletičare/boksere/džudiste: totalGoals = broj medalja, intGoals = broj međunarodnih medalja
Generiši 3 citata, 6-10 timeline eventa, sve relevantne trofeje, i sve klubove.`

  const result = await generateContent({
    system: SYSTEM_PROMPT,
    prompt,
    maxTokens: 4000,
    temperature: 0.4,
  })

  const cleaned = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

async function main() {
  console.log(`Seeding ${ATHLETES.length} athletes to site ${SITE_ID}...\n`)

  for (let i = 0; i < ATHLETES.length; i++) {
    const spec = ATHLETES[i]
    const slug = slugify(spec.name)

    // Check if already exists
    const existing = await prisma.athlete.findUnique({
      where: { siteId_slug: { siteId: SITE_ID, slug } },
    })
    if (existing) {
      console.log(`⏭️  Skipped: ${spec.name} (already exists)`)
      continue
    }

    try {
      console.log(`🤖 Generating: ${spec.name} (${i + 1}/${ATHLETES.length})...`)
      const data = await generateAthleteData(spec)

      await prisma.athlete.create({
        data: {
          siteId: SITE_ID,
          slug,
          name: spec.name,
          nickname: data.nickname || null,
          sport: spec.sport,
          position: spec.position || null,
          nationality: data.nationality || 'BA',
          birthDate: data.birthDate ? new Date(data.birthDate) : null,
          birthPlace: data.birthPlace || null,
          height: data.height || null,
          strongerFoot: data.strongerFoot || null,
          bioLead: data.bioLead || null,
          bioFull: data.bioFull || null,
          quotes: data.quotes || [],
          careerStart: data.careerStart || null,
          careerEnd: data.careerEnd || null,
          clubs: data.clubs || [],
          timeline: data.timeline || [],
          trophies: data.trophies || [],
          totalApps: data.totalApps || null,
          totalGoals: data.totalGoals || null,
          intApps: data.intApps || null,
          intGoals: data.intGoals || null,
          careerYears: data.careerYears || null,
          legendRank: spec.rank,
          isGoat: spec.isGoat || false,
          aiGenerated: true,
          status: 'published',
          publishedAt: new Date(),
        },
      })

      console.log(`✅ Generated: ${spec.name} (${i + 1}/${ATHLETES.length})`)
    } catch (err) {
      console.error(`❌ Failed: ${spec.name}:`, err instanceof Error ? err.message : err)
    }

    // Small delay to avoid rate limiting
    if (i < ATHLETES.length - 1) {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }

  const count = await prisma.athlete.count({ where: { siteId: SITE_ID } })
  console.log(`\n🏁 Done! ${count} athletes in database.`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
