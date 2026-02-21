import { PrismaClient } from '@prisma/client'
import { generateContent } from '../lib/ai/client'

const prisma = new PrismaClient()

const SITE_ID = process.env.SEED_SITE_ID || 'cmloz9ti30004ky04dv0mxd91'

interface OrgSpec {
  name: string
  nameShort: string
  type: string
  sport: string
  level: string
  entity?: string
  city?: string
  featured?: boolean
}

const ORGANIZATIONS: OrgSpec[] = [
  // Savezi — državni
  { name: 'Nogometni/Fudbalski savez Bosne i Hercegovine', nameShort: 'NFSBiH', type: 'savez', sport: 'fudbal', level: 'drzavni', city: 'Sarajevo', featured: true },
  { name: 'Košarkaški savez Bosne i Hercegovine', nameShort: 'KSBiH', type: 'savez', sport: 'košarka', level: 'drzavni', city: 'Sarajevo' },
  { name: 'Rukometni savez Bosne i Hercegovine', nameShort: 'RSBiH', type: 'savez', sport: 'rukomet', level: 'drzavni', city: 'Sarajevo' },
  { name: 'Atletski savez Bosne i Hercegovine', nameShort: 'ASBiH', type: 'savez', sport: 'atletika', level: 'drzavni', city: 'Sarajevo' },
  { name: 'Bokserski savez Bosne i Hercegovine', nameShort: 'BSBiH', type: 'savez', sport: 'boks', level: 'drzavni', city: 'Sarajevo' },
  { name: 'Olimpijski komitet Bosne i Hercegovine', nameShort: 'OKBiH', type: 'savez', sport: 'olimpijski', level: 'drzavni', city: 'Sarajevo' },
  { name: 'Džudo savez Bosne i Hercegovine', nameShort: 'DSBiH', type: 'savez', sport: 'džudo', level: 'drzavni', city: 'Sarajevo' },
  // FK — Premijer liga
  { name: 'FK Željezničar Sarajevo', nameShort: 'Željo', type: 'klub', sport: 'fudbal', level: 'drzavni', entity: 'FBiH', city: 'Sarajevo' },
  { name: 'FK Sarajevo', nameShort: 'Bordo', type: 'klub', sport: 'fudbal', level: 'drzavni', entity: 'FBiH', city: 'Sarajevo' },
  { name: 'FK Velež Mostar', nameShort: 'Velež', type: 'klub', sport: 'fudbal', level: 'drzavni', entity: 'FBiH', city: 'Mostar' },
  { name: 'FK Borac Banja Luka', nameShort: 'Borac', type: 'klub', sport: 'fudbal', level: 'drzavni', entity: 'RS', city: 'Banja Luka' },
  { name: 'HŠK Zrinjski Mostar', nameShort: 'Zrinjski', type: 'klub', sport: 'fudbal', level: 'drzavni', entity: 'FBiH', city: 'Mostar' },
  { name: 'FK Sloboda Tuzla', nameShort: 'Sloboda', type: 'klub', sport: 'fudbal', level: 'drzavni', entity: 'FBiH', city: 'Tuzla' },
  { name: 'NK Čelik Zenica', nameShort: 'Čelik', type: 'klub', sport: 'fudbal', level: 'drzavni', entity: 'FBiH', city: 'Zenica' },
  { name: 'FK Tuzla City', nameShort: 'Tuzla City', type: 'klub', sport: 'fudbal', level: 'drzavni', entity: 'FBiH', city: 'Tuzla' },
  // Košarkaški klubovi
  { name: 'KK Bosna Royal Sarajevo', nameShort: 'Bosna', type: 'klub', sport: 'košarka', level: 'drzavni', entity: 'FBiH', city: 'Sarajevo' },
  { name: 'KK Igokea Aleksandrovac', nameShort: 'Igokea', type: 'klub', sport: 'košarka', level: 'drzavni', entity: 'RS', city: 'Aleksandrovac' },
  { name: 'HKK Široki', nameShort: 'Široki', type: 'klub', sport: 'košarka', level: 'drzavni', entity: 'FBiH', city: 'Široki Brijeg' },
  // Rukometni klubovi
  { name: 'RK Bosna Sarajevo', nameShort: 'RK Bosna', type: 'klub', sport: 'rukomet', level: 'drzavni', entity: 'FBiH', city: 'Sarajevo' },
  { name: 'RK Izviđač CO Ljubuški', nameShort: 'Izviđač', type: 'klub', sport: 'rukomet', level: 'drzavni', entity: 'FBiH', city: 'Ljubuški' },
  // Entitetski savezi
  { name: 'Fudbalski savez Federacije BiH', nameShort: 'FSFBiH', type: 'savez', sport: 'fudbal', level: 'entitetski', entity: 'FBiH', city: 'Sarajevo' },
  { name: 'Fudbalski savez Republike Srpske', nameShort: 'FSRS', type: 'savez', sport: 'fudbal', level: 'entitetski', entity: 'RS', city: 'Banja Luka' },
  // Liga
  { name: 'Premijer liga Bosne i Hercegovine', nameShort: 'PLBIH', type: 'liga', sport: 'fudbal', level: 'drzavni', city: 'Sarajevo' },
  { name: 'Košarkaška liga BiH', nameShort: 'KLBiH', type: 'liga', sport: 'košarka', level: 'drzavni', city: 'Sarajevo' },
  // Dodatni klubovi
  { name: 'FK Radnik Bijeljina', nameShort: 'Radnik', type: 'klub', sport: 'fudbal', level: 'drzavni', entity: 'RS', city: 'Bijeljina' },
  { name: 'NK Široki Brijeg', nameShort: 'Široki', type: 'klub', sport: 'fudbal', level: 'drzavni', entity: 'FBiH', city: 'Široki Brijeg' },
  { name: 'FK Igman Konjic', nameShort: 'Igman', type: 'klub', sport: 'fudbal', level: 'drzavni', entity: 'FBiH', city: 'Konjic' },
  { name: 'FK Leotar Trebinje', nameShort: 'Leotar', type: 'klub', sport: 'fudbal', level: 'drzavni', entity: 'RS', city: 'Trebinje' },
  { name: 'Teniski savez Bosne i Hercegovine', nameShort: 'TSBiH', type: 'savez', sport: 'tenis', level: 'drzavni', city: 'Sarajevo' },
  { name: 'Plivački savez Bosne i Hercegovine', nameShort: 'PSBiH', type: 'savez', sport: 'plivanje', level: 'drzavni', city: 'Sarajevo' },
]

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/č/g, 'c').replace(/ć/g, 'c').replace(/š/g, 's')
    .replace(/ž/g, 'z').replace(/đ/g, 'dj')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const SYSTEM_PROMPT = `Ti si sportski istoričar specijaliziran za bosanskohercegovački sport.
Generiši tačan sadržaj na bosanskom jeziku o sportskim organizacijama u BiH.
Sve činjenice moraju biti historijski tačne. Vraćaj SAMO validan JSON bez markdown formatiranja.
NIKAD ne koristi \`\`\`json wrapper. Samo čist JSON.`

async function generateOrgData(spec: OrgSpec) {
  const prompt = `Generiši opis za sportsku organizaciju: ${spec.name} (${spec.type}, ${spec.sport}, ${spec.level}).
${spec.city ? `Grad: ${spec.city}` : ''}

Vrati JSON sa TAČNO ovim poljima:
{
  "founded": godina_osnivanja ili null,
  "address": "adresa ili null",
  "website": "url ili null",
  "email": "email ili null",
  "description": "2-3 paragrafa opisa organizacije, 150-250 riječi",
  "history": "historija organizacije, 200-400 riječi, ključni momenti i uspjesi",
  "achievements": [{"year": 2020, "title": "Naslov uspjeha"}],
  "stats": {"members": broj, "clubs": broj_klubova, "titles": broj_titula, "competitions": broj_takmicenja}
}`

  const result = await generateContent({
    system: SYSTEM_PROMPT,
    prompt,
    maxTokens: 2000,
    temperature: 0.4,
  })

  const cleaned = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

async function main() {
  console.log(`Seeding ${ORGANIZATIONS.length} organizations to site ${SITE_ID}...\n`)

  for (let i = 0; i < ORGANIZATIONS.length; i++) {
    const spec = ORGANIZATIONS[i]
    const slug = slugify(spec.nameShort || spec.name)

    const existing = await prisma.sportOrganization.findUnique({
      where: { siteId_slug: { siteId: SITE_ID, slug } },
    })
    if (existing) {
      console.log(`⏭️  Skipped: ${spec.name} (already exists)`)
      continue
    }

    try {
      console.log(`🤖 Generating: ${spec.name} (${i + 1}/${ORGANIZATIONS.length})...`)
      const data = await generateOrgData(spec)

      await prisma.sportOrganization.create({
        data: {
          siteId: SITE_ID,
          slug,
          name: spec.name,
          nameShort: spec.nameShort || null,
          type: spec.type,
          sport: spec.sport,
          level: spec.level,
          entity: spec.entity || null,
          city: spec.city || null,
          founded: data.founded || null,
          address: data.address || null,
          website: data.website || null,
          email: data.email || null,
          description: data.description || null,
          history: data.history || null,
          achievements: data.achievements || [],
          stats: data.stats || {},
          featured: spec.featured || false,
          aiGenerated: true,
          status: 'published',
          publishedAt: new Date(),
        },
      })

      console.log(`✅ Generated: ${spec.name} (${i + 1}/${ORGANIZATIONS.length})`)
    } catch (err) {
      console.error(`❌ Failed: ${spec.name}:`, err instanceof Error ? err.message : err)
    }

    if (i < ORGANIZATIONS.length - 1) {
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  const count = await prisma.sportOrganization.count({ where: { siteId: SITE_ID } })
  console.log(`\n🏁 Done! ${count} organizations in database.`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
