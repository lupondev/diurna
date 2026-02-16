import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET() {
  const { error, orgId } = await requireAdmin()
  if (error) return error

  const memberships = await prisma.userOnOrganization.findMany({
    where: { organizationId: orgId, deletedAt: null },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  })

  const users = memberships.map((m) => ({
    id: m.user.id,
    membershipId: m.id,
    name: m.user.name,
    email: m.user.email,
    image: m.user.image,
    role: m.role,
    joinedAt: m.joinedAt,
    createdAt: m.user.createdAt,
  }))

  return NextResponse.json(users)
}
