import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const VALID_ROLES = ['OWNER', 'ADMIN', 'EDITOR', 'JOURNALIST'] as const

const PatchSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(VALID_ROLES),
})

const DeleteSchema = z.object({
  memberId: z.string().min(1),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const orgId = session.user.organizationId

    const members = await prisma.userOnOrganization.findMany({
      where: {
        deletedAt: null,
        organizationId: orgId,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: [
        { role: 'asc' },
        { joinedAt: 'asc' },
      ],
    })
    return NextResponse.json(members)
  } catch (error) {
    console.error('Get team error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = PatchSchema.parse(body)

    const member = await prisma.userOnOrganization.findFirst({
      where: { id: data.memberId, organizationId: session.user.organizationId, deletedAt: null },
    })
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const updated = await prisma.userOnOrganization.update({
      where: { id: data.memberId },
      data: { role: data.role },
    })
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    console.error('Update team member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = DeleteSchema.parse(body)

    const member = await prisma.userOnOrganization.findFirst({
      where: { id: data.memberId, organizationId: session.user.organizationId, deletedAt: null },
    })
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    await prisma.userOnOrganization.update({
      where: { id: data.memberId },
      data: { deletedAt: new Date() },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    console.error('Delete team member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
