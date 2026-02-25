import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { del } from '@vercel/blob'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'No id provided' }, { status: 400 })
    }

    const orgId = session.user.organizationId
    const media = await prisma.media.findUnique({
      where: { id },
      include: { site: { select: { organizationId: true } } },
    })
    if (!media || (orgId && media.site.organizationId !== orgId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (media.url.includes('.blob.vercel-storage.com')) {
      try {
        await del(media.url)
      } catch (err) {
        console.error('Blob delete error:', err)
      }
    }

    await prisma.media.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Media delete error:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
