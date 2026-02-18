import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { put, del } from '@vercel/blob'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = session.user.organizationId
    const site = await prisma.site.findFirst({
      where: orgId ? { organizationId: orgId } : undefined,
      select: { id: true },
    })
    if (!site) {
      return NextResponse.json({ error: 'No site found' }, { status: 400 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const pathname = `uploads/${Date.now()}-${safeName}`

    const blob = await put(pathname, file, {
      access: 'public',
      contentType: file.type,
    })

    const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '.jpg'

    const media = await prisma.media.create({
      data: {
        siteId: site.id,
        filename: file.name,
        url: blob.url,
        alt: file.name.replace(ext, '').replace(/[-_]/g, ' '),
        size: file.size,
        mimeType: file.type,
        uploadedBy: session.user.id,
      },
    })

    return NextResponse.json(media, { status: 201 })
  } catch (error) {
    console.error('Media upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const orgId = session?.user?.organizationId

    const media = await prisma.media.findMany({
      where: orgId ? { site: { organizationId: orgId } } : undefined,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(media)
  } catch (error) {
    console.error('Media list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await req.json() as { id?: string }
    if (!id) {
      return NextResponse.json({ error: 'No id provided' }, { status: 400 })
    }

    const media = await prisma.media.findUnique({ where: { id } })
    if (!media) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (media.url.includes('.blob.vercel-storage.com')) {
      try {
        await del(media.url)
      } catch {}
    }

    await prisma.media.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Media delete error:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
