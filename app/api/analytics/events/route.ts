import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const validEvents = ['poll_vote', 'quiz_start', 'quiz_complete', 'survey_submit', 'widget_view']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { widgetId?: string; eventType?: string; metadata?: Record<string, unknown> }
    const { widgetId, eventType, metadata } = body

    if (!eventType || !validEvents.includes(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }

    const ua = req.headers.get('user-agent') || ''
    const device = /mobile/i.test(ua) ? 'mobile' : /tablet/i.test(ua) ? 'tablet' : 'desktop'
    const country = req.headers.get('x-vercel-ip-country') || null

    await prisma.analyticsEvent.create({
      data: {
        widgetId: widgetId || null,
        eventType,
        metadata: (metadata || Prisma.JsonNull) as Prisma.InputJsonValue,
        country,
        device,
      },
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Analytics event error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const events = await prisma.analyticsEvent.groupBy({
      by: ['eventType'],
      where: { createdAt: { gte: weekAgo } },
      _count: { id: true },
    })

    const total = await prisma.analyticsEvent.count({
      where: { createdAt: { gte: weekAgo } },
    })

    const byDevice = await prisma.analyticsEvent.groupBy({
      by: ['device'],
      where: { createdAt: { gte: weekAgo } },
      _count: { id: true },
    })

    return NextResponse.json({
      total,
      byType: events.map((e) => ({ type: e.eventType, count: e._count.id })),
      byDevice: byDevice.map((d) => ({ device: d.device, count: d._count.id })),
    })
  } catch (error) {
    console.error('Analytics events GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
