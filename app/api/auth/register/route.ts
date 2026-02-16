import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  inviteToken: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = RegisterSchema.parse(body)

    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(data.password, 12)

    if (data.inviteToken) {
      const invite = await prisma.invite.findUnique({ where: { token: data.inviteToken } })

      if (!invite || invite.usedAt || new Date(invite.expiresAt) < new Date()) {
        return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 400 })
      }

      if (invite.email !== data.email) {
        return NextResponse.json({ error: 'Email does not match invite' }, { status: 400 })
      }

      const user = await prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash,
          orgs: {
            create: {
              organizationId: invite.organizationId,
              role: invite.role,
            },
          },
        },
      })

      await prisma.invite.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      })

      return NextResponse.json({ id: user.id, email: user.email }, { status: 201 })
    }

    let org = await prisma.organization.findFirst({ where: { slug: 'demo' } })
    if (!org) {
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30)
      org = await prisma.organization.create({
        data: { name: data.name + "'s Newsroom", slug, plan: 'FREE' },
      })
    }

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        orgs: {
          create: {
            organizationId: org.id,
            role: 'OWNER',
          },
        },
      },
    })

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
