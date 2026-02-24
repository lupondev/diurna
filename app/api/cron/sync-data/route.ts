import { NextRequest, NextResponse } from 'next/server'

// Use NEXTAUTH_URL which should point to todayfootballmatch.com in production
const BASE_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://todayfootballmatch.com'
const AUTH = process.env.CRON_SECRET || ''

async function callInternal(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${AUTH}` },
  })
  return res.json() as Promise<Record<string, unknown>>
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronHeader = req.headers.get('x-cron-secret')
  const secret = process.env.CRON_SECRET

  if (secret && authHeader !== `Bearer ${secret}` && cronHeader !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, unknown>[] = []

  try {
    const playerResult = await callInternal('/api/admin/sync-players?league=39&page=1')
    results.push({ type: 'players', ...playerResult })
  } catch (err) {
    results.push({ type: 'players', error: String(err) })
  }

  try {
    const salaryResult = await callInternal('/api/admin/scrape-salaries?league=premier-league&offset=0')
    results.push({ type: 'salaries', ...salaryResult })
  } catch (err) {
    results.push({ type: 'salaries', error: String(err) })
  }

  return NextResponse.json({ results, timestamp: new Date().toISOString() })
}
