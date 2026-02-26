/**
 * One-off diagnostic: FeedSource siteId and Site list.
 * Run: npx tsx scripts/diagnose-feedsources.ts
 */
import { prisma } from '../lib/prisma'

async function main() {
  console.log('=== 1. FeedSource LIMIT 10 (id, url, siteId, name) ===')
  const q1 = await prisma.$queryRawUnsafe<
    Array<{ id: string; url: string | null; siteId: string | null; name: string | null }>
  >('SELECT id, url, "siteId", "name" FROM "FeedSource" LIMIT 10')
  console.log(JSON.stringify(q1, null, 2))

  console.log('\n=== 2. DISTINCT siteId FROM FeedSource WHERE siteId IS NOT NULL ===')
  const q2 = await prisma.$queryRawUnsafe<Array<{ siteId: string }>>(
    'SELECT DISTINCT "siteId" FROM "FeedSource" WHERE "siteId" IS NOT NULL'
  )
  console.log(JSON.stringify(q2, null, 2))
  console.log('Count:', q2.length)

  console.log('\n=== 3. Site (id, name, slug) ===')
  const q3 = await prisma.$queryRawUnsafe<
    Array<{ id: string; name: string | null; slug: string | null }>
  >('SELECT id, name, slug FROM "Site"')
  console.log(JSON.stringify(q3, null, 2))
  console.log('Count:', q3.length)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
