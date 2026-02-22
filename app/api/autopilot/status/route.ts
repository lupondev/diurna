import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  let orgId: string | undefined

  const mcpSecret = request.headers.get('x-mcp-secret')
  if (mcpSecret && mcpSecret === process.env.MCP_SECRET) {
    const headerOrgId = request.headers.get('x-org-id')
    if (headerOrgId) {
      orgId = headerOrgId
    } else {
      const firstOrg = await prisma.organization.findFirst()
      orgId = firstOrg?.id
    }
  } else {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    orgId = session.user.organizationId
  }

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const config = await prisma.autopilotConfig.findFirst({
    where: { orgId },
    include: {
      categories: { orderBy: { sortOrder: 'asc' } },
    },
  })

  if (!config) {
    return NextResponse.json({
      isActive: false,
      dailyTarget: 0,
      todayCount: 0,
      remaining: 0,
      scheduleStart: '08:00',
      scheduleEnd: '00:00',
      isWithinSchedule: false,
    })
  }

  const site = await prisma.site.findFirst({
    where: { organizationId: orgId },
  })

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const todayCount = site
    ? await prisma.article.count({
        where: {
          siteId: site.id,
          aiGenerated: true,
          createdAt: { gte: startOfDay },
        },
      })
    : 0

  const currentHour = new Date().getHours()
  const schedStartHour = parseInt((config.scheduleStart || '08:00').split(':')[0])
  const schedEndRaw = config.scheduleEnd || '00:00'
  const schedEndHour = schedEndRaw === '00:00' ? 24 : parseInt(schedEndRaw.split(':')[0])
  const isWithinSchedule = config.is24h || (currentHour >= schedStartHour && currentHour < schedEndHour)

  return NextResponse.json({
    isActive: config.isActive,
    dailyTarget: config.dailyTarget,
    todayCount,
    remaining: Math.max(0, config.dailyTarget - todayCount),
    scheduleStart: config.scheduleStart,
    scheduleEnd: config.scheduleEnd,
    is24h: config.is24h,
    isWithinSchedule,
    autoPublish: config.autoPublish,
    contentStyle: config.contentStyle,
  })
}
