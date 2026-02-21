import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const checks: Record<string, string> = {}

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = 'ok'
  } catch {
    checks.database = 'error'
  }

  checks.api_football = process.env.API_FOOTBALL_KEY ? 'configured' : 'missing'
  checks.anthropic = process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing'
  checks.cron_secret = process.env.CRON_SECRET ? 'configured' : 'missing'

  const healthy = checks.database === 'ok'

  return NextResponse.json(
    { status: healthy ? 'healthy' : 'degraded', checks, timestamp: new Date().toISOString() },
    { status: healthy ? 200 : 503 },
  )
}
