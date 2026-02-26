/**
 * One-off: assign NULL siteId to TodayFootballMatch. Run:
 * node --env-file=.env scripts/assign-siteid-update.mjs
 * Or: node scripts/assign-siteid-update.mjs  (with DATABASE_URL in env)
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const SITE_ID = 'cmlnx19ho00028oagpc6501hf'

const r1 = await prisma.$executeRawUnsafe(
  'UPDATE "FeedSource" SET "siteId" = $1::text WHERE "siteId" IS NULL',
  SITE_ID
)
console.log('FeedSource rows updated:', r1)

const r2 = await prisma.$executeRawUnsafe(
  'UPDATE "NewsItem" SET "siteId" = $1::text WHERE "siteId" IS NULL',
  SITE_ID
)
console.log('NewsItem rows updated:', r2)

const r3 = await prisma.$executeRawUnsafe(
  'UPDATE "StoryCluster" SET "siteId" = $1::text WHERE "siteId" IS NULL',
  SITE_ID
)
console.log('StoryCluster rows updated:', r3)

await prisma.$disconnect()
