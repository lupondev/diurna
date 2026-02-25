import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateContent } from '@/lib/ai/client'
import { Prisma } from '@prisma/client'
import {
  shouldGenerateNow,
  getNextTask,
  buildPromptContext,
  htmlToTiptap,
  injectWidgets,
  slugify,
  fetchUnsplashImage,
} from '@/lib/autopilot'
import { verifyArticle } from '@/lib/model-router'
import { systemLog } from '@/lib/system-log'
import { captureApiError } from '@/lib/sentry'

export const maxDuration = 60

const MAX_HOURLY_CAP = 6

const FORCED_CATEGORY_SLUG = 'vijesti'
const FORCED_CATEGORY_NAME = 'Vijesti'

const FOOTBALL_ENTITY_TYPES = ['PLAYER', 'CLUB', 'MANAGER', 'MATCH', 'LEAGUE', 'ORGANIZATION']

async function getOrCreateCategory(siteId: string) {
  let category = await prisma.category.findFirst({ where: { siteId, slug: FORCED_CATEGORY_SLUG } })
  if (!category) {
    category = await prisma.category.create({ data: { siteId, name: FORCED_CATEGORY_NAME, slug: FORCED_CATEGORY_SLUG } })
  }
  return category
}

// Safe article creation with retry on unique constraint violation (race condition protection)
async function createArticleSafe(data: Parameters<typeof prisma.article.create>[0]['data'], siteId: string, baseSlug: string) {
  let slug = baseSlug
  let attempts = 0
  const MAX_ATTEMPTS = 5

  while (attempts < MAX_ATTEMPTS) {
    try {
      return await prisma.article.create({ data: { ...data, slug } })
    } catch (err) {
      // P2002 = unique constraint violation (slug already exists)
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        attempts++
        slug = `${baseSlug}-${attempts}`
        await systemLog('warn', 'autopilot', `Slug collision "${baseSlug}", retrying as "${slug}" (attempt ${attempts})`)
        continue
      }
      throw err
    }
  }
  throw new Error(`Failed to create article after ${MAX_ATTEMPTS} attempts — all slugs taken for "${baseSlug}"`)
}

async function authenticate(
  req: NextRequest
): Promise<{ ok: true; orgId?: string } | { ok: false; response: NextResponse }> {
  const secret = process.env.CRON_SECRET

  if (secret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader === `Bearer ${secret}`) return { ok: true }

    const cronHeader = req.headers.get('x-cron-secret')
    if (cronHeader === secret) return { ok: true }

    const secretParam = req.nextUrl.searchParams.get('secret')
    if (secretParam && secretParam === secret) return { ok: true }
  }

  const session = await getServerSession(authOptions)
  if (
    session?.user?.organizationId &&
    (session.user.role === 'ADMIN' || session.user.role === 'OWNER')
  ) {
    return { ok: true, orgId: session.user.organizationId }
  }

  return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
}

export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth.ok) return auth.response

  const force = req.nextUrl.searchParams.get('force') === 'true'

  try {
    const where: { isActive: boolean; orgId?: string } = { isActive: true }
    if (auth.orgId) where.orgId = auth.orgId

    const configs = await prisma.autopilotConfig.findMany({
      where,
      include: {
        categories: { orderBy: { sortOrder: 'asc' } },
        leagues: { where: { isActive: true } },
        topics: { where: { isActive: true } },
      },
    })

    const results: {
      orgId: string
      action: string
      articleId?: string
      title?: string
      category?: string
      status?: string
      reason?: string
    }[] = []

    for (const config of configs) {
      if (!force && !shouldGenerateNow(config)) {
        results.push({ orgId: config.orgId, action: 'skipped', reason: 'Outside active schedule' })
        continue
      }

      const site = await prisma.site.findFirst({
        where: { organizationId: config.orgId, domain: { not: null } },
      }) || await prisma.site.findFirst({ where: { organizationId: config.orgId } })
      if (!site) {
        results.push({ orgId: config.orgId, action: 'skipped', reason: 'No site configured' })
        continue
      }

      const forcedCategory = await getOrCreateCategory(site.id)

      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const todayCount = await prisma.article.count({
        where: { siteId: site.id, aiGenerated: true, createdAt: { gte: startOfDay } },
      })

      // ── Force mode ──
      if (force) {
        const coveredToday = await prisma.article.findMany({
          where: { siteId: site.id, aiGenerated: true, createdAt: { gte: startOfDay }, aiPrompt: { not: null } },
          select: { aiPrompt: true },
        })
        const coveredClusterIds = new Set<string>()
        for (const a of coveredToday) {
          if (typeof a.aiPrompt === 'string') {
            try {
              const p = JSON.parse(a.aiPrompt)
              if (p.clusterId) coveredClusterIds.add(p.clusterId)
            } catch {
              if (a.aiPrompt.length < 100) coveredClusterIds.add(a.aiPrompt)
            }
          }
        }

        const topCluster = await prisma.storyCluster.findFirst({
          where: {
            latestItem: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            dis: { gte: 15 },
            primaryEntityType: { in: FOOTBALL_ENTITY_TYPES },
            ...(coveredClusterIds.size > 0 ? { id: { notIn: Array.from(coveredClusterIds) } } : {}),
          },
          orderBy: { dis: 'desc' },
        })

        if (!topCluster) {
          results.push({ orgId: config.orgId, action: 'skipped', reason: 'No football clusters available — run Feed Fetch first' })
          continue
        }

        const newsItems = await prisma.newsItem.findMany({
          where: { clusterId: topCluster.id },
          orderBy: { pubDate: 'desc' },
          take: 5,
        })

        const catConfig = config.categories[0]

        const promptData = buildPromptContext(
          { title: topCluster.title, eventType: topCluster.eventType, entities: topCluster.entities as string[], dis: topCluster.dis },
          newsItems.map((n) => ({ title: n.title, source: n.source, content: n.content || undefined })),
          config
        )

        const maxTokens = Math.min(4000, Math.max(500, Math.round(config.defaultLength * 2.5)))
        let ai
        try {
          await systemLog('info', 'autopilot', `Force: AI starting for "${topCluster.title}"`, { dis: topCluster.dis, sources: newsItems.length })
          ai = await generateContent({ system: promptData.system, prompt: promptData.prompt, maxTokens, temperature: 0.3 })
          await systemLog('info', 'autopilot', `Force: AI success ${ai.model}`, { tokensIn: ai.tokensIn, tokensOut: ai.tokensOut })
        } catch (aiErr) {
          const errMsg = aiErr instanceof Error ? aiErr.message : 'unknown'
          await systemLog('error', 'autopilot', `Force: AI failed: ${errMsg}`)
          results.push({ orgId: config.orgId, action: 'error', reason: `AI failed: ${errMsg}` })
          continue
        }

        let parsed: { title?: string; content?: string; excerpt?: string; seo?: { slug?: string; metaTitle?: string; metaDescription?: string; keywords?: string[] }; tags?: string[] }
        try {
          let cleaned = ai.text.trim()
          if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
          parsed = JSON.parse(cleaned)
        } catch {
          results.push({ orgId: config.orgId, action: 'error', reason: `Failed to parse AI response for: ${topCluster.title}` })
          continue
        }

        const title = parsed.title || topCluster.title

        const htmlContent = parsed.content || ''
        let verification: { score: number; issues: string[] } | null = null
        if (process.env.OPENAI_API_KEY) {
          try {
            verification = await verifyArticle(htmlContent)
            if (verification.score < 60) {
              await systemLog('warn', 'autopilot', `Force: verification score ${verification.score}/100 — skipped`, { title })
              results.push({ orgId: config.orgId, action: 'skipped', title, reason: `Verification score too low: ${verification.score}/100` })
              continue
            }
          } catch { /* proceed without verification */ }
        }

        let tiptapContent = htmlToTiptap(htmlContent)
        if (catConfig) tiptapContent = injectWidgets(tiptapContent, catConfig)

        const baseSlug = parsed.seo?.slug || slugify(title)
        const featuredImage = await fetchUnsplashImage(title)

        const article = await createArticleSafe({
          siteId: site.id, title, slug: baseSlug,
          content: tiptapContent as unknown as Prisma.InputJsonValue,
          excerpt: parsed.excerpt || '', featuredImage,
          status: config.autoPublish ? 'PUBLISHED' : 'DRAFT',
          publishedAt: config.autoPublish ? new Date() : null,
          categoryId: forcedCategory.id, aiGenerated: true, aiModel: ai.model,
          aiPrompt: JSON.stringify({ priority: 'top_story', clusterId: topCluster.id, sources: newsItems.map((n) => n.title) }),
          aiVerificationScore: verification?.score ?? null,
          aiVerificationIssues: verification?.issues.join(', ') ?? null,
          metaTitle: parsed.seo?.metaTitle || title,
          metaDescription: parsed.seo?.metaDescription || parsed.excerpt || '',
        }, site.id, baseSlug)

        if (parsed.tags?.length) {
          for (const tagName of parsed.tags.slice(0, 5)) {
            const tagSlug = slugify(tagName)
            if (!tagSlug) continue
            let tag = await prisma.tag.findFirst({ where: { siteId: site.id, slug: tagSlug } })
            if (!tag) tag = await prisma.tag.create({ data: { siteId: site.id, name: tagName, slug: tagSlug } })
            await prisma.articleTag.create({ data: { articleId: article.id, tagId: tag.id } }).catch(() => {})
          }
        }

        results.push({
          orgId: config.orgId, action: 'generated', articleId: article.id, title,
          category: FORCED_CATEGORY_NAME, status: config.autoPublish ? 'published' : 'draft',
          reason: `force: DIS ${topCluster.dis} — ${topCluster.title}`,
        })
        continue
      }

      // ── Normal mode: daily target check ──
      const remaining = config.dailyTarget - todayCount
      if (remaining <= 0) {
        results.push({ orgId: config.orgId, action: 'skipped', reason: `Daily target reached (${todayCount}/${config.dailyTarget})` })
        continue
      }

      // ── Hourly quota ──
      const currentHour = new Date().getHours()
      const schedEndRaw = config.scheduleEnd || '00:00'
      const schedEndHour = schedEndRaw === '00:00' ? 24 : parseInt(schedEndRaw.split(':')[0])
      const remainingHours = Math.max(1, schedEndHour - currentHour)
      const hourlyTargetRaw = Math.ceil(remaining / remainingHours)
      const hourlyTarget = Math.min(hourlyTargetRaw, MAX_HOURLY_CAP)

      const startOfHour = new Date()
      startOfHour.setMinutes(0, 0, 0)
      const articlesThisHour = await prisma.article.count({
        where: { siteId: site.id, aiGenerated: true, createdAt: { gte: startOfHour } },
      })

      if (articlesThisHour >= hourlyTarget) {
        results.push({
          orgId: config.orgId,
          action: 'skipped',
          reason: `Hourly quota met: ${articlesThisHour}/${hourlyTarget} this hour (raw: ${hourlyTargetRaw}, cap: ${MAX_HOURLY_CAP}), ${todayCount}/${config.dailyTarget} today, ${remainingHours}h remaining`,
        })
        continue
      }

      // ── Normal mode: priority task selection ──
      const task = await getNextTask(config, site.id, todayCount, false)

      if (!task) {
        results.push({
          orgId: config.orgId,
          action: 'skipped',
          reason: `No stories found (${todayCount}/${config.dailyTarget} today, ${remaining} remaining, ${articlesThisHour}/${hourlyTarget} this hour)`,
        })
        continue
      }

      await systemLog('info', 'autopilot', `Normal: task selected — priority=${task.priority} title="${task.title}"`, { category: task.categorySlug, sources: task.sources.length })

      const cluster = task.clusterId
        ? await prisma.storyCluster.findUnique({ where: { id: task.clusterId } })
        : null

      const promptData = buildPromptContext(
        cluster || { title: task.title, eventType: task.priority, entities: [], dis: 50 },
        task.sources,
        config
      )

      const maxTokens = Math.min(4000, Math.max(500, Math.round(task.wordCount * 2.5)))
      await systemLog('info', 'autopilot', `Normal: AI starting for "${task.title}"`, { priority: task.priority, maxTokens })
      const ai = await generateContent({ system: promptData.system, prompt: promptData.prompt, maxTokens, temperature: 0.3 })
      await systemLog('info', 'autopilot', `Normal: AI success ${ai.model}`, { tokensIn: ai.tokensIn, tokensOut: ai.tokensOut })

      let parsed: { title?: string; content?: string; excerpt?: string; seo?: { slug?: string; metaTitle?: string; metaDescription?: string; keywords?: string[] }; tags?: string[] }
      try {
        let cleaned = ai.text.trim()
        if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
        parsed = JSON.parse(cleaned)
      } catch {
        results.push({ orgId: config.orgId, action: 'error', reason: 'Failed to parse AI response' })
        continue
      }

      const title = parsed.title || task.title

      const htmlContent = parsed.content || ''
      let verification: { score: number; issues: string[] } | null = null
      if (process.env.OPENAI_API_KEY) {
        try {
          verification = await verifyArticle(htmlContent)
          await systemLog('info', 'autopilot', `Verification: ${verification.score}/100`, { issues: verification.issues })
          if (verification.score < 60) {
            await systemLog('warn', 'autopilot', `Skipped — verification score ${verification.score}/100`, { title })
            results.push({ orgId: config.orgId, action: 'skipped', title, reason: `Verification score too low: ${verification.score}/100` })
            continue
          }
        } catch (verifyErr) {
          await systemLog('warn', 'autopilot', `Verification failed, proceeding: ${verifyErr instanceof Error ? verifyErr.message : 'unknown'}`)
        }
      }

      let tiptapContent = htmlToTiptap(htmlContent)
      const catConfig = config.categories.find((c) => c.slug === task.categorySlug)
      if (catConfig) tiptapContent = injectWidgets(tiptapContent, catConfig)

      const baseSlug = parsed.seo?.slug || slugify(title)
      const featuredImage = await fetchUnsplashImage(title)

      const article = await createArticleSafe({
        siteId: site.id, title, slug: baseSlug,
        content: tiptapContent as unknown as Prisma.InputJsonValue,
        excerpt: parsed.excerpt || '', featuredImage,
        status: config.autoPublish ? 'PUBLISHED' : 'DRAFT',
        publishedAt: config.autoPublish ? new Date() : null,
        categoryId: forcedCategory.id, aiGenerated: true, aiModel: ai.model,
        aiPrompt: JSON.stringify({ priority: task.priority, clusterId: task.clusterId, matchId: task.matchId, sources: task.sources.map((s) => s.title) }),
        aiVerificationScore: verification?.score ?? null,
        aiVerificationIssues: verification?.issues.join(', ') ?? null,
        metaTitle: parsed.seo?.metaTitle || title,
        metaDescription: parsed.seo?.metaDescription || parsed.excerpt || '',
      }, site.id, baseSlug)

      if (parsed.tags?.length) {
        for (const tagName of parsed.tags.slice(0, 5)) {
          const tagSlug = slugify(tagName)
          if (!tagSlug) continue
          let tag = await prisma.tag.findFirst({ where: { siteId: site.id, slug: tagSlug } })
          if (!tag) tag = await prisma.tag.create({ data: { siteId: site.id, name: tagName, slug: tagSlug } })
          await prisma.articleTag.create({ data: { articleId: article.id, tagId: tag.id } }).catch(() => {})
        }
      }

      results.push({
        orgId: config.orgId, action: 'generated', articleId: article.id, title,
        category: FORCED_CATEGORY_NAME, status: config.autoPublish ? 'published' : 'draft',
        reason: `${task.priority}: ${FORCED_CATEGORY_NAME} (verified: ${verification?.score ?? 'n/a'})`,
      })
    }

    const generated = results.filter(r => r.action === 'generated')
    const skipped = results.filter(r => r.action === 'skipped')

    if (generated.length > 0) {
      try {
        revalidatePath('/', 'layout')
        await systemLog('info', 'autopilot', 'Revalidated all paths')
      } catch (e) {
        await systemLog('warn', 'autopilot', `Revalidation failed: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    const action = generated.length > 0 ? 'generated' : 'skipped'
    const reason = generated.length > 0 ? generated[0].reason : skipped[0]?.reason || 'No active configs'

    await systemLog(
      generated.length > 0 ? 'info' : 'warn',
      'autopilot',
      `${action}: ${reason}`,
      { generated: generated.length, skipped: skipped.length, article: generated[0]?.title },
    )

    return NextResponse.json({
      success: true,
      processed: configs.length,
      action,
      article: generated[0] ? { id: generated[0].articleId, title: generated[0].title, category: generated[0].category, status: generated[0].status } : undefined,
      reason,
      results,
    })
  } catch (error) {
    captureApiError(error, { route: '/api/cron/autopilot', method: 'POST' })
    await systemLog('error', 'autopilot', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({
      success: false, action: 'error',
      reason: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}
