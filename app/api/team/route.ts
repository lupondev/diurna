import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const members = await prisma.userOnOrganization.findMany({
    where: { deletedAt: null },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: [
      { role: 'asc' },
      { joinedAt: 'asc' },
    ],
  })
  return NextResponse.json(members)
}

export async function PATCH(req: Request) {
  const { memberId, role } = await req.json()
  if (!memberId || !role) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  const updated = await prisma.userOnOrganization.update({
    where: { id: memberId },
    data: { role },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: Request) {
  const { memberId } = await req.json()
  if (!memberId) {
    return NextResponse.json({ error: 'Missing memberId' }, { status: 400 })
  }
  await prisma.userOnOrganization.update({
    where: { id: memberId },
    data: { deletedAt: new Date() },
  })
  return NextResponse.json({ success: true })
}
