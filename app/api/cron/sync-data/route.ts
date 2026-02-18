import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = process.env.NEXTAUTH_URL || 'https://diurna.vercel.app'
const AUTH = process.env.CRON_SECRET || process.env.FOOTBALL_API_KEY || ''

async function callInternal(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${AUTH}` },
  })
  return res.json()
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
