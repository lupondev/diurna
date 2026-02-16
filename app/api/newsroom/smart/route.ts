import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTrendingTopics } from '@/lib/trending'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const topics = await getTrendingTopics(session.user.organizationId)

    return NextResponse.json({
      topics,
      total: topics.length,
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Smart newsroom error:', error)
    return NextResponse.json({ error: 'Failed to fetch trending intelligence' }, { status: 500 })
  }
}
