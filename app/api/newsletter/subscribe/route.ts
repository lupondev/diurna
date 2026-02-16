import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const orgId = session.user.organizationId

    const site = await prisma.site.findFirst({
      where: { organizationId: orgId },
      select: { id: true },
    })
    if (!site) {
      return NextResponse.json({ error: 'No site found' }, { status: 404 })
    }
    const siteId = site.id

    const [active, total] = await Promise.all([
      prisma.subscriber.count({ where: { siteId, isActive: true } }),
      prisma.subscriber.count({ where: { siteId } }),
    ])

    const recent = await prisma.subscriber.findMany({
      where: { siteId },
      orderBy: { subscribedAt: 'desc' },
      take: 5,
      select: { id: true, email: true, name: true, isActive: true, subscribedAt: true },
    })

    return NextResponse.json({ active, total, recent })
  } catch (error) {
    console.error('Newsletter stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const SubscribeSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  siteId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = SubscribeSchema.parse(body)

    let siteId = data.siteId
    if (!siteId) {
      const site = await prisma.site.findFirst({ select: { id: true } })
      if (!site) return NextResponse.json({ error: 'No site found' }, { status: 400 })
      siteId = site.id
    }

    const existing = await prisma.subscriber.findUnique({
      where: { siteId_email: { siteId, email: data.email } },
    })

    if (existing) {
      if (existing.isActive) {
        return NextResponse.json({ message: 'Already subscribed' })
      }
      await prisma.subscriber.update({
        where: { id: existing.id },
        data: { isActive: true, unsubscribedAt: null, subscribedAt: new Date() },
      })
      return NextResponse.json({ message: 'Re-subscribed successfully' })
    }

    await prisma.subscriber.create({
      data: {
        siteId,
        email: data.email,
        name: data.name || null,
      },
    })

    return NextResponse.json({ message: 'Subscribed successfully' }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    console.error('Subscribe error:', error)
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 })
  }
}
