import { headers } from 'next/headers'
import { prisma } from './prisma'
import { cache } from 'react'

export const getOrg = cache(async () => {
  const slug = headers().get('x-org-slug')
  if (!slug) {
    throw new Error('No organization context — missing x-org-slug header')
  }

  const org = await prisma.organization.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true, plan: true, name: true },
  })

  if (!org) {
    throw new Error(`Organization not found: ${slug}`)
  }

  return org
})

export async function getOrgId(): Promise<string> {
  const org = await getOrg()
  return org.id
}
