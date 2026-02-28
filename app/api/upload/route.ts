import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { put } from '@vercel/blob'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
const MAX_LOGO_BYTES = 2 * 1024 * 1024   // 2MB
const MAX_FAVICON_BYTES = 512 * 1024     // 512KB

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const kind = (formData.get('kind') as string) || 'logo' // 'logo' | 'favicon'

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const maxBytes = kind === 'favicon' ? MAX_FAVICON_BYTES : MAX_LOGO_BYTES
    if (file.size > maxBytes) {
      return NextResponse.json({
        error: kind === 'favicon' ? 'Favicon must be under 512KB' : 'Logo must be under 2MB',
      }, { status: 400 })
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use PNG, JPEG, SVG or WebP.' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'png'
    const prefix = `sites/${session.user.organizationId}/${kind}`
    const blob = await put(`${prefix}-${Date.now()}.${ext}`, file, { access: 'public' })

    return NextResponse.json({ url: blob.url })
  } catch (err) {
    console.error('[upload]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
