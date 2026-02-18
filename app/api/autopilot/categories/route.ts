import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const config = await prisma.autopilotConfig.findUnique({
    where: { orgId: session.user.organizationId },
  })
  if (!config) {
    return NextResponse.json({ error: 'Config not found' }, { status: 404 })
  }

  const body = await req.json() as { name: string; slug: string; color?: string; percentage?: number; sortOrder?: number; widgetPoll?: boolean; widgetQuiz?: boolean; widgetStats?: boolean; widgetPlayer?: boolean; widgetVideo?: boolean; widgetGallery?: boolean }
  const category = await prisma.autopilotCategory.create({
    data: {
      configId: config.id,
      name: body.name,
      slug: body.slug,
      color: body.color || '#6B7280',
      percentage: body.percentage || 10,
      sortOrder: body.sortOrder || 0,
      widgetPoll: body.widgetPoll || false,
      widgetQuiz: body.widgetQuiz || false,
      widgetStats: body.widgetStats || false,
      widgetPlayer: body.widgetPlayer || false,
      widgetVideo: body.widgetVideo || false,
      widgetGallery: body.widgetGallery || false,
    },
  })

  return NextResponse.json(category, { status: 201 })
}
