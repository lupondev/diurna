import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { order: 'asc' },
      select: { id: true, name: true, slug: true, icon: true },
    })
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Get categories error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
