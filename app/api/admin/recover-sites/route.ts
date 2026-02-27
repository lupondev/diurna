import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await prisma.site.updateMany({
    where: {
      id: { in: ['cmlowwy6x0001jl04u599q1mt', 'cmloz9ti30004ky04dv0mxd91', 'cmlp2yfuk0004ik04coy8bgfd'] },
      deletedAt: { not: null },
    },
    data: { deletedAt: null },
  })

  return NextResponse.json({ recovered: result.count })
}
