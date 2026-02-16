import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Publisher',
      slug: 'demo',
      plan: 'PRO',
    },
  })

  const site = await prisma.site.upsert({
    where: {
      organizationId_slug: { organizationId: org.id, slug: 'main' },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Demo Sports News',
      slug: 'main',
      language: 'bs',
    },
  })

  const user = await prisma.user.upsert({
    where: { email: 'dev@diurna.app' },
    update: {},
    create: {
      email: 'dev@diurna.app',
      name: 'Dev User',
    },
  })

  await prisma.userOnOrganization.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: org.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      organizationId: org.id,
      role: 'OWNER',
      permissions: [
        'ai_generate',
        'ai_publish',
        'manage_widgets',
        'manage_team',
        'manage_settings',
      ],
    },
  })

  const categories = [
    'Trending',
    'Matches',
    'Analysis',
    'Transfers',
    'Leagues',
    'Breaking',
  ]
  for (let i = 0; i < categories.length; i++) {
    await prisma.category.upsert({
      where: {
        siteId_slug: {
          siteId: site.id,
          slug: categories[i].toLowerCase(),
        },
      },
      update: {},
      create: {
        siteId: site.id,
        name: categories[i],
        slug: categories[i].toLowerCase(),
        order: i,
      },
    })
  }

  console.log('✅ Seed complete: org=demo, site=main, user=dev@diurna.app')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
