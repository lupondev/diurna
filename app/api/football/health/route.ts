/**
 * Minimal diagnostic endpoint: direct fetch to API-Football, no auth, no DB, no cache.
 * For debugging "frontend gets no results". Remove after bug is fixed.
 * Curl: GET /api/football/health
 */
import { NextResponse } from 'next/server'

const BASE = 'https://v3.football.api-sports.io'

export async function GET() {
  const key = process.env.API_FOOTBALL_KEY
  const hasKey = !!key
  const keyLength = key?.length ?? 0
  const keyPrefix = key ? `${key.slice(0, 4)}***` : 'n/a'

  if (!key) {
    return NextResponse.json({
      ok: false,
      status: 0,
      sampleCount: 0,
      error: 'API_FOOTBALL_KEY not set',
      diagnostic: { hasKey, keyLength, keyPrefix },
    })
  }

  const today = new Date().toISOString().slice(0, 10)
  const season = new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1
  const endpoint = `/fixtures?date=${today}&season=${season}`

  try {
    const res = await fetch(`${BASE}${endpoint}`, {
      headers: { 'x-apisports-key': key },
    })
    const status = res.status
    const body = await res.json() as { response?: unknown[]; errors?: Record<string, unknown> }
    const sampleCount = Array.isArray(body.response) ? body.response.length : 0
    const error = !res.ok ? (body.errors || res.statusText) : null

    return NextResponse.json({
      ok: res.ok && sampleCount >= 0,
      status,
      sampleCount,
      error: error ?? null,
      diagnostic: { hasKey, keyLength, keyPrefix, endpoint },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({
      ok: false,
      status: 0,
      sampleCount: 0,
      error: message,
      diagnostic: { hasKey, keyLength, keyPrefix, endpoint },
    })
  }
}
