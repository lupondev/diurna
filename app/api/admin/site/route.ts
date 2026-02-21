import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { z } from 'zod'

export async function GET() {
  const { error, orgId } = await requireAdmin()
  if (error) return error

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, slug: true },
  })

  const site = await prisma.site.findFirst({
    where: { organizationId: orgId },
    select: { language: true, timezone: true, gaId: true },
  })

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  return NextResponse.json({
    name: org.name,
    slug: org.slug,
    language: site?.language || 'en',
    timezone: site?.timezone || 'UTC',
    gaId: site?.gaId || '',
    apiKeys: {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      unsplash: !!process.env.UNSPLASH_ACCESS_KEY,
      apiFootball: !!process.env.API_FOOTBALL_KEY,
      cronSecret: !!process.env.CRON_SECRET,
    },
  })
}

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
  gaId: z.string().optional(),
})

export async function PATCH(req: NextRequest) {
  const { error, orgId } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  const data = UpdateSchema.parse(body)

  if (data.name) {
    await prisma.organization.update({
      where: { id: orgId },
      data: { name: data.name },
    })
  }

  if (data.language || data.timezone || data.gaId !== undefined) {
    const site = await prisma.site.findFirst({ where: { organizationId: orgId } })
    if (site) {
      await prisma.site.update({
        where: { id: site.id },
        data: {
          ...(data.language && { language: data.language }),
          ...(data.timezone && { timezone: data.timezone }),
          ...(data.gaId !== undefined && { gaId: data.gaId || null }),
        },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
