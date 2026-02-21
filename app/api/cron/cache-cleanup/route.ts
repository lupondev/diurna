import { NextRequest, NextResponse } from 'next/server'
import { cleanExpiredCache } from '@/lib/api-football-cache'
import { systemLog } from '@/lib/system-log'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const deleted = await cleanExpiredCache()
    await systemLog('info', 'api-football', `Cache cleanup: removed ${deleted} expired entries`)
    return NextResponse.json({ success: true, deleted })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await systemLog('error', 'api-football', `Cache cleanup failed: ${message}`)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
