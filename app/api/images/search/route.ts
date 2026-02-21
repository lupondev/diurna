import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const query = req.nextUrl.searchParams.get('query')
    const page = req.nextUrl.searchParams.get('page') || '1'

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY
    if (!accessKey) {
      return NextResponse.json({ error: 'Unsplash not configured' }, { status: 500 })
    }

    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=20&orientation=landscape`

    const res = await fetch(url, {
      headers: {
        'Authorization': `Client-ID ${accessKey}`,
        'Accept-Version': 'v1',
      },
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('Unsplash API error:', res.status, text)
      return NextResponse.json({ error: 'Unsplash search failed' }, { status: 502 })
    }

    interface UnsplashPhoto {
      id: string
      urls: { small: string; regular: string }
      alt_description?: string
      description?: string
      user: { name: string; links: { html: string } }
      links: { download_location: string }
    }

    const data = await res.json() as { results: UnsplashPhoto[]; total: number; total_pages: number }

    const results = data.results.map((photo: UnsplashPhoto) => ({
      id: photo.id,
      small: photo.urls.small,
      regular: photo.urls.regular,
      alt: photo.alt_description || photo.description || '',
      author: photo.user.name,
      authorUrl: photo.user.links.html,
      downloadUrl: photo.links.download_location,
    }))

    return NextResponse.json({
      results,
      total: data.total,
      totalPages: data.total_pages,
      page: parseInt(page),
    })
  } catch (error) {
    console.error('Image search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
