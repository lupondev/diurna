import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()
const key = process.env.UNSPLASH_ACCESS_KEY

async function fetchImage(query) {
  const res = await fetch(
    `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high&client_id=${key}`
  )
  if (res.status !== 200) return null
  const data = await res.json()
  return data?.urls?.regular || null
}

const articles = await p.article.findMany({
  where: { isTest: false, deletedAt: null, featuredImage: null, status: 'PUBLISHED' },
  select: { id: true, title: true },
  orderBy: { createdAt: 'desc' },
  take: 19,
})

console.log(`Found ${articles.length} articles without images`)
let updated = 0

for (const a of articles) {
  const url = await fetchImage(a.title.slice(0, 60))
  if (url) {
    await p.article.update({ where: { id: a.id }, data: { featuredImage: url } })
    updated++
    console.log(`OK ${a.title.slice(0, 55)}`)
  } else {
    console.log(`FAIL ${a.title.slice(0, 55)}`)
  }
  await new Promise(r => setTimeout(r, 1200))
}

console.log(`\nDone: ${updated}/${articles.length} updated`)
await p.$disconnect()
