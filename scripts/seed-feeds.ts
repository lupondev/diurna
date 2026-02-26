import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface FeedSpec {
  name: string
  url: string
  category: string
  country: string
  tier: number
  siteId?: string
}

// News site feeds
const NEWS_FEEDS: FeedSpec[] = [
  // Novi.ba
  { name: 'Novi.ba RSS', url: 'https://novi.ba/rss', category: 'aktuelno', country: 'BA', tier: 1 },
  { name: 'Novi.ba — Aktuelno', url: 'https://novi.ba/rss/aktuelno', category: 'aktuelno', country: 'BA', tier: 1 },
  { name: 'Novi.ba — BiH', url: 'https://novi.ba/rss/bosna-i-hercegovina', category: 'bih', country: 'BA', tier: 1 },
  { name: 'Novi.ba — Crna hronika', url: 'https://novi.ba/rss/crna-hronika', category: 'crna-hronika', country: 'BA', tier: 1 },
  { name: 'Novi.ba — Region', url: 'https://novi.ba/rss/region', category: 'region', country: 'BA', tier: 1 },
  { name: 'Novi.ba — Svijet', url: 'https://novi.ba/rss/svijet', category: 'svijet', country: 'BA', tier: 1 },
  { name: 'Novi.ba — Sport', url: 'https://novi.ba/rss/sport', category: 'sport', country: 'BA', tier: 1 },
  { name: 'Novi.ba — Tech', url: 'https://novi.ba/rss/tech', category: 'tech', country: 'BA', tier: 1 },
  { name: 'Novi.ba — Nauka', url: 'https://novi.ba/rss/nauka-i-tehnologija', category: 'nauka', country: 'BA', tier: 1 },
  { name: 'Novi.ba — Biznis', url: 'https://novi.ba/rss/biznis', category: 'biznis', country: 'BA', tier: 1 },
  { name: 'Novi.ba — Zanimljivosti', url: 'https://novi.ba/rss/zanimljivosti', category: 'zanimljivosti', country: 'BA', tier: 2 },
  { name: 'Novi.ba — Show', url: 'https://novi.ba/rss/show', category: 'show', country: 'BA', tier: 2 },
  // Balkan
  { name: 'Klix.ba', url: 'https://www.klix.ba/rss/all', category: 'aktuelno', country: 'BA', tier: 1 },
  { name: 'N1 BiH', url: 'https://n1info.ba/feed/', category: 'bih', country: 'BA', tier: 1 },
  { name: 'Avaz.ba', url: 'https://avaz.ba/rss', category: 'aktuelno', country: 'BA', tier: 1 },
  { name: 'Faktor.ba', url: 'https://www.faktor.ba/rss', category: 'bih', country: 'BA', tier: 1 },
  { name: 'Radiosarajevo.ba', url: 'https://radiosarajevo.ba/rss', category: 'aktuelno', country: 'BA', tier: 1 },
  // Global
  { name: 'BBC World News', url: 'http://feeds.bbci.co.uk/news/world/rss.xml', category: 'svijet', country: 'global', tier: 1 },
  { name: 'BBC Tech', url: 'http://feeds.bbci.co.uk/news/technology/rss.xml', category: 'tech', country: 'global', tier: 1 },
  { name: 'Reuters World', url: 'https://feeds.reuters.com/reuters/worldNews', category: 'svijet', country: 'global', tier: 1 },
  { name: 'Reuters Biznis', url: 'https://feeds.reuters.com/reuters/businessNews', category: 'biznis', country: 'global', tier: 1 },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'tech', country: 'global', tier: 2 },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'tech', country: 'global', tier: 2 },
]

async function validateFeed(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Diurna/1.0)' },
    })
    if (!res.ok) return false
    const text = await res.text()
    return text.includes('<rss') || text.includes('<feed') || text.includes('<?xml')
  } catch {
    return false
  }
}

async function main() {
  console.log(`Seeding ${NEWS_FEEDS.length} feed sources...\n`)

  let added = 0
  let skipped = 0
  let invalid = 0

  for (const feed of NEWS_FEEDS) {
    // Check if exists
    const existing = await prisma.feedSource.findFirst({ where: { url: feed.url, siteId: feed.siteId ?? null } })
    if (existing) {
      console.log(`⏭️  Exists: ${feed.name}`)
      skipped++
      continue
    }

    // Validate
    console.log(`🔍 Validating: ${feed.name}...`)
    const valid = await validateFeed(feed.url)

    if (!valid) {
      console.log(`❌ Invalid: ${feed.name} (${feed.url})`)
      invalid++
      continue
    }

    await prisma.feedSource.create({
      data: {
        name: feed.name,
        url: feed.url,
        category: feed.category,
        tier: feed.tier,
        country: feed.country,
        active: true,
        siteId: feed.siteId || null,
      },
    })

    console.log(`✅ Added: ${feed.name}`)
    added++
  }

  const total = await prisma.feedSource.count({ where: { active: true } })
  console.log(`\n🏁 Done! Added: ${added}, Skipped: ${skipped}, Invalid: ${invalid}. Total active feeds: ${total}`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
