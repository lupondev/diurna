/**
 * One-off: assign all NULL siteId to TodayFootballMatch (cmlnx19ho00028oagpc6501hf).
 * Run: npx tsx scripts/assign-siteid-update.ts
 */
import { prisma } from '../lib/prisma'

const SITE_ID = 'cmlnx19ho00028oagpc6501hf'

async function main() {
  const r1 = await prisma.$executeRawUnsafe(
    'UPDATE "FeedSource" SET "siteId" = $1 WHERE "siteId" IS NULL',
    SITE_ID
  )
  console.log('FeedSource rows updated:', r1)

  const r2 = await prisma.$executeRawUnsafe(
    'UPDATE "NewsItem" SET "siteId" = $1 WHERE "siteId" IS NULL',
    SITE_ID
  )
  console.log('NewsItem rows updated:', r2)

  const r3 = await prisma.$executeRawUnsafe(
    'UPDATE "StoryCluster" SET "siteId" = $1 WHERE "siteId" IS NULL',
    SITE_ID
  )
  console.log('StoryCluster rows updated:', r3)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
