/**
 * Diagnostic: direct fetch to API-Football, no auth, no DB, no cache.
 * Path /api/health/football is public (isHealthRoute). Curl: GET /api/health/football
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
    const text = await res.text()
    let body: { response?: unknown[]; errors?: Record<string, unknown>; get?: string } = {}
    try {
      body = JSON.parse(text) as typeof body
    } catch {
      body = {}
    }
    const responseArr = body.response
    const sampleCount = Array.isArray(responseArr) ? responseArr.length : 0
    const bodyKeys = typeof body === 'object' && body !== null ? Object.keys(body) : []
    const hasErrors = body.errors && Object.keys(body.errors as object).length > 0

    return NextResponse.json({
      ok: res.ok && !hasErrors,
      httpStatus: status,
      sampleCount,
      bodyKeys,
      hasErrors: hasErrors ? Object.keys(body.errors as object) : null,
      error: !res.ok ? text.slice(0, 300) : null,
      diagnostic: { hasKey, keyLength, keyPrefix, endpoint, today, season },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({
      ok: false,
      error: message,
      diagnostic: { hasKey, keyLength, keyPrefix, endpoint },
    })
  }
}
