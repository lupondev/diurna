import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { z } from 'zod'

const UpdateSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'EDITOR', 'JOURNALIST']).optional(),
  deactivate: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, orgId, role: callerRole } = await requireAdmin(['OWNER'])
  if (error) return error

  const body = await req.json()
  const data = UpdateSchema.parse(body)
  const targetUserId = params.id

  // Find membership
  const membership = await prisma.userOnOrganization.findFirst({
    where: { userId: targetUserId, organizationId: orgId, deletedAt: null },
  })

  if (!membership) {
    return NextResponse.json({ error: 'User not found in organization' }, { status: 404 })
  }

  // Cannot demote yourself if you're the only OWNER
  if (data.role && membership.role === 'OWNER' && data.role !== 'OWNER') {
    const ownerCount = await prisma.userOnOrganization.count({
      where: { organizationId: orgId, role: 'OWNER', deletedAt: null },
    })
    if (ownerCount <= 1) {
      return NextResponse.json({ error: 'Cannot remove the only owner' }, { status: 400 })
    }
  }

  if (data.deactivate) {
    await prisma.userOnOrganization.update({
      where: { id: membership.id },
      data: { deletedAt: new Date() },
    })
    return NextResponse.json({ success: true, action: 'deactivated' })
  }

  if (data.role) {
    await prisma.userOnOrganization.update({
      where: { id: membership.id },
      data: { role: data.role },
    })
    return NextResponse.json({ success: true, role: data.role })
  }

  return NextResponse.json({ success: true })
}
