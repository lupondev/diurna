import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateContent } from '@/lib/ai/client'
import { z } from 'zod'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const DAILY_LIMIT = 10
const MAX_RATE_LIMIT_ENTRIES = 1000

function evictExpiredEntries() {
  const now = Date.now()
  const keysToDelete: string[] = []
  rateLimitMap.forEach((entry, key) => {
    if (now > entry.resetAt) {
      keysToDelete.push(key)
    }
  })
  keysToDelete.forEach((key) => rateLimitMap.delete(key))

  if (rateLimitMap.size > MAX_RATE_LIMIT_ENTRIES) {
    const entries: Array<[string, { count: number; resetAt: number }]> = []
    rateLimitMap.forEach((entry, key) => entries.push([key, entry]))
    entries.sort((a, b) => a[1].resetAt - b[1].resetAt)
    const removeCount = rateLimitMap.size - MAX_RATE_LIMIT_ENTRIES
    for (let i = 0; i < removeCount; i++) {
      rateLimitMap.delete(entries[i][0])
    }
  }
}

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetAt) {
    evictExpiredEntries()
    rateLimitMap.set(userId, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 })
    return { allowed: true, remaining: DAILY_LIMIT - 1 }
  }

  if (entry.count >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: DAILY_LIMIT - entry.count }
}

const GenerateSchema = z.object({
  type: z.enum(['match-report', 'transfer-news', 'match-preview', 'analysis', 'custom']),
  homeTeam: z.string().optional(),
  awayTeam: z.string().optional(),
  score: z.string().optional(),
  league: z.string().optional(),
  keyEvents: z.string().optional(),
  playerName: z.string().optional(),
  fromClub: z.string().optional(),
  toClub: z.string().optional(),
  fee: z.string().optional(),
  customPrompt: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'tabloid', 'analytical']).default('professional'),
  language: z.enum(['bs', 'hr', 'sr', 'en']).default('bs'),
  wordCount: z.number().default(600),
})

function buildPrompt(data: z.infer<typeof GenerateSchema>): { system: string; prompt: string } {
  const langMap: Record<string, string> = {
    bs: 'Bosnian',
    hr: 'Croatian',
    sr: 'Serbian',
    en: 'English',
  }
  const language = langMap[data.language] || 'Bosnian'

  const system = `You are a professional sports journalist writing in ${language}.
Write in a ${data.tone} tone. Target approximately ${data.wordCount} words.
IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "title": "Article headline",
  "excerpt": "Short 1-2 sentence summary",
  "content": "Full article text with paragraphs separated by \\n\\n",
  "tags": ["tag1", "tag2", "tag3"]
}
Do NOT include any text outside the JSON. Do NOT use markdown code blocks.`

  let prompt = ''

  switch (data.type) {
    case 'match-report':
      prompt = `Write a match report: ${data.homeTeam || 'Team A'} vs ${data.awayTeam || 'Team B'}, final score ${data.score || '0-0'}.
League: ${data.league || 'Unknown'}.
${data.keyEvents ? `Key events: ${data.keyEvents}` : ''}`
      break

    case 'transfer-news':
      prompt = `Write a transfer news article: ${data.playerName || 'Player'} is transferring from ${data.fromClub || 'Club A'} to ${data.toClub || 'Club B'}.
${data.fee ? `Transfer fee: ${data.fee}` : ''}`
      break

    case 'match-preview':
      prompt = `Write a match preview: ${data.homeTeam || 'Team A'} vs ${data.awayTeam || 'Team B'}.
League: ${data.league || 'Unknown'}.
Cover form, key players, and prediction.`
      break

    case 'analysis':
      prompt = `Write a tactical/statistical analysis about: ${data.customPrompt || 'the recent match'}.`
      break

    case 'custom':
      prompt = data.customPrompt || 'Write a sports article.'
      break
  }

  return { system, prompt }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      )
    }

    const userId = session.user.id

    const { allowed, remaining } = checkRateLimit(userId)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Daily AI generation limit reached (10/day). Try again tomorrow.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const data = GenerateSchema.parse(body)
    const { system, prompt } = buildPrompt(data)

    const result = await generateContent({ system, prompt })

    let parsed
    try {
      const cleaned = result.text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      parsed = JSON.parse(cleaned)
    } catch {
      parsed = {
        title: 'Generated Article',
        excerpt: '',
        content: result.text,
        tags: [],
      }
    }

    return NextResponse.json({
      ...parsed,
      model: result.model,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      prompt,
      remaining,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('AI generate error:', error)
    return NextResponse.json(
      { error: 'AI generation failed' },
      { status: 500 }
    )
  }
}
