import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 })
  }

  const headers = {
    Authorization: `Bearer ${secret}`,
    'Content-Type': 'application/json',
  }

  const [feedsRes, clusterRes] = await Promise.all([
    fetch(`${base}/api/cron/fetch-feeds`, { method: 'POST', headers }),
    fetch(`${base}/api/cron/cluster-engine`, { method: 'POST', headers }),
  ])

  const feedsData = await feedsRes.json().catch(() => ({}))
  const clusterData = await clusterRes.json().catch(() => ({}))

  if (!feedsRes.ok && !clusterRes.ok) {
    return NextResponse.json(
      { error: 'Cron failed', feeds: feedsData, cluster: clusterData },
      { status: 502 }
    )
  }

  return NextResponse.json({
    success: true,
    feeds: feedsRes.ok ? feedsData : null,
    cluster: clusterRes.ok ? clusterData : null,
  })
}
