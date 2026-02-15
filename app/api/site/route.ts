import { NextResponse } from 'next/server'
import { getDefaultSite, getCategories } from '@/lib/db'

export async function GET() {
  try {
    const site = await getDefaultSite()
    if (!site) {
      return NextResponse.json({ error: 'No site found' }, { status: 404 })
    }

    const categories = await getCategories(site.id)

    return NextResponse.json({
      id: site.id,
      name: site.name,
      slug: site.slug,
      categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    })
  } catch (error) {
    console.error('Get site error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
