import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { z } from 'zod'
import crypto from 'crypto'

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'EDITOR', 'JOURNALIST']),
})

export async function GET() {
  const { error, orgId } = await requireAdmin()
  if (error) return error

  const invites = await prisma.invite.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(invites)
}

export async function POST(req: NextRequest) {
  const { error, session, orgId } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  const data = InviteSchema.parse(body)

  // Check if email already has a pending invite
  const existing = await prisma.invite.findFirst({
    where: {
      organizationId: orgId,
      email: data.email,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  })

  if (existing) {
    return NextResponse.json({ error: 'Pending invite already exists for this email' }, { status: 409 })
  }

  // Check if user already in org
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
    include: {
      orgs: { where: { organizationId: orgId, deletedAt: null } },
    },
  })

  if (existingUser?.orgs.length) {
    return NextResponse.json({ error: 'User is already a member of this organization' }, { status: 409 })
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 day expiry

  const invite = await prisma.invite.create({
    data: {
      email: data.email,
      role: data.role,
      token,
      organizationId: orgId,
      invitedById: session!.user.id,
      expiresAt,
    },
  })

  return NextResponse.json({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    token: invite.token,
    expiresAt: invite.expiresAt,
    inviteUrl: `/register?invite=${invite.token}`,
  }, { status: 201 })
}
