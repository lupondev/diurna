import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { enrichTrendingTopic } from '@/lib/trending'
import { getPrimarySite } from '@/lib/site-resolver'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const title = req.nextUrl.searchParams.get('title')
    if (!title) {
      return NextResponse.json({ error: 'title param required' }, { status: 400 })
    }

    const site = await getPrimarySite(session.user.organizationId)
    if (!site) {
      return NextResponse.json({ error: 'No site found' }, { status: 404 })
    }

    const enriched = await enrichTrendingTopic(title, site.id)
    return NextResponse.json(enriched)
  } catch (err) {
    console.error('Trend context error:', err)
    return NextResponse.json({ error: 'Failed to enrich trend' }, { status: 500 })
  }
}
