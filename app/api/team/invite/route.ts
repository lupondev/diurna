import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { randomBytes } from 'crypto'

const VALID_ROLES = ['ADMIN', 'EDITOR', 'JOURNALIST'] as const

const InviteSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(VALID_ROLES).default('EDITOR'),
  message: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = InviteSchema.parse(body)

    // Check if user already a member
    const existing = await prisma.userOnOrganization.findFirst({
      where: {
        organizationId: session.user.organizationId,
        deletedAt: null,
        user: { email: data.email },
      },
    })
    if (existing) {
      return NextResponse.json({ error: 'User is already a team member' }, { status: 409 })
    }

    // Check if there's already a pending (unused, non-expired) invite
    const existingInvite = await prisma.invite.findFirst({
      where: {
        organizationId: session.user.organizationId,
        email: data.email,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    })
    if (existingInvite) {
      return NextResponse.json({ error: 'An invite for this email already exists' }, { status: 409 })
    }

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const invite = await prisma.invite.create({
      data: {
        email: data.email,
        role: data.role,
        token,
        organizationId: session.user.organizationId,
        invitedById: session.user.id,
        expiresAt,
      },
    })

    // TODO: Send invite email via Resend (Phase 2 — Media CRM)
    // For now, return the invite link so admin can share manually
    const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${token}`

    return NextResponse.json({
      success: true,
      inviteId: invite.id,
      inviteUrl,
      expiresAt: invite.expiresAt,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Create invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
