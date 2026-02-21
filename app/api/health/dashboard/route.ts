import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type ServiceCheck = {
  name: string
  status: 'ok' | 'degraded' | 'error'
  responseTime: number
  error?: string
}

async function timedCheck(name: string, fn: () => Promise<boolean>): Promise<ServiceCheck> {
  const start = Date.now()
  try {
    const ok = await fn()
    return { name, status: ok ? 'ok' : 'degraded', responseTime: Date.now() - start }
  } catch (e) {
    return {
      name,
      status: 'error',
      responseTime: Date.now() - start,
      error: e instanceof Error ? e.message : 'Unknown error',
    }
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Service checks
  const checks = await Promise.all([
    timedCheck('Database', async () => {
      await prisma.$queryRaw`SELECT 1`
      return true
    }),
    timedCheck('Claude API', async () => {
      if (!process.env.ANTHROPIC_API_KEY) return false
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
        signal: AbortSignal.timeout(8000),
      })
      return r.status !== 500
    }),
    timedCheck('Gemini API', async () => {
      if (!process.env.GEMINI_API_KEY) return false
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`,
        { signal: AbortSignal.timeout(5000) },
      )
      return r.ok
    }),
    timedCheck('Unsplash', async () => {
      if (!process.env.UNSPLASH_ACCESS_KEY) return false
      const r = await fetch(
        `https://api.unsplash.com/photos/random?client_id=${process.env.UNSPLASH_ACCESS_KEY}&count=1`,
        { signal: AbortSignal.timeout(5000) },
      )
      return r.ok
    }),
    timedCheck('API-Football', async () => {
      if (!process.env.API_FOOTBALL_KEY) return false
      const r = await fetch('https://v3.football.api-sports.io/status', {
        headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY },
        signal: AbortSignal.timeout(5000),
      })
      return r.ok
    }),
  ])

  // API-Football quota
  let footballQuota = { current: 0, limit: 100 }
  try {
    if (process.env.API_FOOTBALL_KEY) {
      const r = await fetch('https://v3.football.api-sports.io/status', {
        headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY },
        signal: AbortSignal.timeout(5000),
      })
      if (r.ok) {
        const data = await r.json() as { response?: { requests?: { current: number; limit_day: number } } }
        if (data.response?.requests) {
          footballQuota = { current: data.response.requests.current, limit: data.response.requests.limit_day }
        }
      }
    }
  } catch {}

  // Autopilot stats
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [todayCount, weekCount, monthCount, geminiCount, lastArticle] = await Promise.all([
    prisma.article.count({ where: { aiGenerated: true, isTest: false, createdAt: { gte: todayStart } } }),
    prisma.article.count({ where: { aiGenerated: true, isTest: false, createdAt: { gte: weekAgo } } }),
    prisma.article.count({ where: { aiGenerated: true, isTest: false, createdAt: { gte: monthAgo } } }),
    prisma.article.count({ where: { aiGenerated: true, isTest: false, createdAt: { gte: todayStart }, aiModel: { contains: 'gemini' } } }),
    prisma.article.findFirst({
      where: { aiGenerated: true, isTest: false },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, aiModel: true, title: true },
    }),
  ])

  // Daily breakdown (last 7 days)
  const dailyStats = await prisma.article.groupBy({
    by: ['status'],
    where: { aiGenerated: true, isTest: false, createdAt: { gte: weekAgo } },
    _count: true,
  })

  const publishedCount = dailyStats.find(s => s.status === 'PUBLISHED')?._count || 0
  const totalAttempted = dailyStats.reduce((sum, s) => sum + s._count, 0)

  // Webhook stats
  const [webhookTodayCount, lastWebhookLog] = await Promise.all([
    prisma.systemLog.count({
      where: { service: 'webhook', level: 'info', message: { startsWith: 'Breaking' }, createdAt: { gte: todayStart } },
    }),
    prisma.systemLog.findFirst({
      where: { service: 'webhook', level: 'info', message: { startsWith: 'Breaking' } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, message: true },
    }),
  ])

  // Cache stats
  const [cacheTotal, apiCallsToday] = await Promise.all([
    prisma.apiCache.count(),
    prisma.systemLog.count({
      where: { service: 'api-football', level: 'info', message: { startsWith: 'API call:' }, createdAt: { gte: todayStart } },
    }),
  ])

  // Recent logs
  const logs = await prisma.systemLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // Env vars check
  const envVars = {
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    API_FOOTBALL_KEY: !!process.env.API_FOOTBALL_KEY,
    UNSPLASH_ACCESS_KEY: !!process.env.UNSPLASH_ACCESS_KEY,
    CRON_SECRET: !!process.env.CRON_SECRET,
    DATABASE_URL: !!process.env.DATABASE_URL,
  }

  return NextResponse.json({
    checks,
    footballQuota,
    autopilot: {
      today: todayCount,
      week: weekCount,
      month: monthCount,
      successRate: totalAttempted > 0 ? Math.round((publishedCount / totalAttempted) * 100) : 0,
      geminiFallbacks: geminiCount,
      lastRun: lastArticle?.createdAt || null,
      lastModel: lastArticle?.aiModel || null,
      lastTitle: lastArticle?.title || null,
    },
    webhook: {
      triggeredToday: webhookTodayCount,
      lastTrigger: lastWebhookLog?.createdAt || null,
      lastMessage: lastWebhookLog?.message || null,
    },
    cache: {
      entries: cacheTotal,
      apiCallsToday,
      quotaUsed: footballQuota.current,
      quotaLimit: footballQuota.limit,
    },
    logs,
    envVars,
  })
}
