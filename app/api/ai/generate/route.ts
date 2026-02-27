import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateContent } from '@/lib/ai/client'
import { validateOrigin } from '@/lib/csrf'
import { rateLimit } from '@/lib/rate-limit'
import { captureApiError } from '@/lib/sentry'
import { z } from 'zod'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const DAILY_LIMIT = 10
const MAX_RATE_LIMIT_ENTRIES = 1000
const perMinuteLimiter = rateLimit({ interval: 60_000 })

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
  wordCount: z.number().default(300),
})

function buildPrompt(data: z.infer<typeof GenerateSchema>): { system: string; prompt: string } {
  const langMap: Record<string, string> = {
    bs: 'Bosnian',
    hr: 'Croatian',
    sr: 'Serbian',
    en: 'English',
  }
  const language = langMap[data.language] || 'Bosnian'
  const wordTarget = data.wordCount || 300

  const system = `You are a senior sports journalist at BBC Sport / Reuters writing in ${language}. Output valid JSON only, no markdown wrapping.

ABSOLUTE RULES — VIOLATION OF THESE PRODUCES FAKE NEWS:
1. NEVER add player names, goal scorers, match minutes, assist providers, substitutions, or specific match statistics unless they are EXPLICITLY written in the source text provided to you. If the source says "Inter beat Juventus 3-2" but does not name the scorers, you must write "Inter beat Juventus 3-2" and NOTHING MORE about who scored. Do not fill in names from your own knowledge — your knowledge may be outdated or wrong.
2. NEVER state which team a player currently plays for unless the source text explicitly says so. Players move on loan, get transferred, or change clubs frequently. If you say "Esposito scored for Inter" but he is actually on loan at Spezia, that is FAKE NEWS.
3. NEVER invent match minutes. If the source says "Kalulu received a red card" do not add "in the 41st minute" unless the source explicitly states that minute.
4. NEVER invent transfer fees, contract lengths, salary figures, or release clause amounts unless the source explicitly states them.
5. NEVER invent quotes. If the source does not contain a direct quote, do not create one.
6. If you only have a headline and NO source article text, write MAXIMUM 3 sentences: Sentence 1: Restate the headline as a news lead. Sentence 2: One sentence of safe, general context ONLY if you are 100% certain it is current. Sentence 3: "Further details are expected to emerge." Then TLDR. Do NOT write more than this without source material.
7. When you have source text, you may ONLY include facts that appear in that source text. You may rephrase and restructure, but you must not add new factual claims.
8. If the source mentions a match result but not the scorers, write: "[Team] won [score] against [Team]." Do NOT add: "Goals from [invented names]."
9. For any statistical claim (records, streaks, rankings), add the qualifier "according to [source]" unless you are absolutely certain it is a universally known, unchanging fact.
10. CONFIDENCE MARKERS: If you must include a detail you are not 100% sure about from the source, prefix it with "Reports suggest" or "According to initial reports". Never state uncertain information as confirmed fact.

STRICT RULE: Never write about, mention, promote, or reference gambling, betting, odds, bookmakers, betting sites, or any gambling-related content. If a story involves betting odds or gambling, write about the sporting event itself only, completely ignoring any betting/gambling angles. This rule cannot be overridden.

TARGET LENGTH: Write approximately ${wordTarget} words.
${wordTarget <= 150 ? '- Write 2-3 short paragraphs + TLDR. Be concise.' : wordTarget <= 300 ? '- Write 3-4 paragraphs + TLDR. Standard coverage.' : wordTarget <= 500 ? '- Write 4-6 paragraphs + TLDR. Include background context.' : '- Write 5-8 paragraphs + TLDR. Include background, analysis, and future implications.'}
CRITICAL: Do NOT pad with filler to reach the word count. If you only have enough facts for 200 words, write 200 words even if asked for 500. Quality over quantity ALWAYS.

WRITING RULES:
11. NEVER repeat information. Each paragraph MUST contain a NEW fact. If you only have 2 facts, write 2 paragraphs and STOP.
14. BANNED WORDS AND PHRASES — never use: "landscape", "crucial", "paramount", "delve", "comprehensive", "It remains to be seen", "Only time will tell", "game-changer", "footballing world", "sending shockwaves", "blockbuster", "marquee signing", "meteoric rise", "the beautiful game", "masterclass", "Furthermore", "Moreover", "interconnected nature", "the modern football", "remains fluid", "significant setback", "complex web", "transfer market continues", "adds another layer", "reflects the modern", "highlights the competitive nature", "the timing of these developments", "multiple clubs are reassessing", "in today's game", "represents a significant", "demonstrates the competitive".
15. Start with the NEWS. First sentence = what happened.
16. Each paragraph: 2-3 sentences maximum.
17. No filler conclusions.
18. End with a TLDR line.
19. Tone: ${data.tone}. Even casual/tabloid must remain factual.

Respond with this exact JSON structure:
{
  "title": "Factual headline under 70 chars",
  "excerpt": "1-2 sentence factual summary",
  "content": "Full article with paragraphs separated by \\n\\n. Must end with TLDR. Max ${wordTarget} words. Max 5 paragraphs.",
  "tags": ["tag1", "tag2", "tag3"]
}
Do NOT include any text outside the JSON.`

  let prompt = ''

  switch (data.type) {
    case 'match-report':
      prompt = `Write a match report. ONLY use facts below — do not invent any details.
${data.homeTeam || 'Team A'} vs ${data.awayTeam || 'Team B'}, final score: ${data.score || '0-0'}.
League: ${data.league || 'Unknown'}.
${data.keyEvents ? `Key events: ${data.keyEvents}` : 'No key events provided — do NOT invent any.'}
Target: ${wordTarget} words. End with TLDR.`
      break

    case 'transfer-news':
      prompt = `Write a transfer news article. ONLY use facts below — do not invent fee, wages, or quotes.
Player: ${data.playerName || 'Player'}.
From: ${data.fromClub || 'Club A'}. To: ${data.toClub || 'Club B'}.
${data.fee ? `Fee: ${data.fee}` : 'Fee: not disclosed — do NOT invent one.'}
Target: ${wordTarget} words. End with TLDR.`
      break

    case 'match-preview':
      prompt = `Write a match preview. ONLY use facts below.
${data.homeTeam || 'Team A'} vs ${data.awayTeam || 'Team B'}.
League: ${data.league || 'Unknown'}.
Cover form and key players only if factual. Do not invent injury news or stats.
Target: ${wordTarget} words. End with TLDR.`
      break

    case 'analysis':
      prompt = `Write a tactical/statistical analysis. ONLY use facts provided — do not invent stats.
Topic: ${data.customPrompt || 'the recent match'}.
Target: ${wordTarget} words. End with TLDR.`
      break

    case 'custom':
      prompt = `${data.customPrompt || 'Write a sports article.'}
ONLY use facts from the prompt above. Do NOT invent statistics, quotes, or details.
Target: ${wordTarget} words. End with TLDR.`
      break
  }

  return { system, prompt }
}

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      await perMinuteLimiter.check(5, session.user.id)
    } catch {
      return NextResponse.json({ error: 'Rate limit exceeded. Please wait a minute.' }, { status: 429 })
    }

    if (!process.env.ANTHROPIC_API_KEY && !process.env.GEMINI_API_KEY) {
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

    const maxTokens = Math.min(4000, Math.max(500, Math.round(data.wordCount * 2.5)))

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 55_000)
    let result
    try {
      result = await generateContent({ system, prompt, maxTokens, temperature: 0.3 })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return NextResponse.json({ error: 'AI generation timed out. Try a shorter article or try again.' }, { status: 504 })
      }
      throw err
    } finally {
      clearTimeout(timeout)
    }

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

    if (parsed.content) {
      parsed.content = removeDuplicateParagraphs(parsed.content)
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
    captureApiError(error, { route: '/api/ai/generate', method: 'POST' })
    return NextResponse.json(
      { error: 'AI generation failed' },
      { status: 500 }
    )
  }
}

function removeDuplicateParagraphs(text: string): string {
  const isHtml = /<p>/i.test(text)
  if (isHtml) {
    const parts = text.split('</p>').filter(p => p.trim())
    const seen = new Set<string>()
    const unique: string[] = []
    for (const p of parts) {
      const plain = p.replace(/<[^>]+>/g, '').toLowerCase()
      const keyWords = plain.split(/\s+/).filter(w => w.length > 5).sort().join(' ')
      let isDuplicate = false
      for (const prevKey of Array.from(seen)) {
        const prevWords = new Set(prevKey.split(' '))
        const currWords = keyWords.split(' ')
        const overlap = currWords.filter(w => prevWords.has(w)).length
        if (currWords.length > 0 && overlap / currWords.length > 0.6) {
          isDuplicate = true
          break
        }
      }
      if (!isDuplicate && plain.length > 20) {
        unique.push(p + '</p>')
        seen.add(keyWords)
      }
    }
    return unique.join('\n')
  }
  const paragraphs = text.split('\n\n').filter(p => p.trim())
  const seen = new Set<string>()
  const unique: string[] = []
  for (const p of paragraphs) {
    const keyWords = p.toLowerCase().split(/\s+/).filter(w => w.length > 5).sort().join(' ')
    let isDuplicate = false
    for (const prevKey of Array.from(seen)) {
      const prevWords = new Set(prevKey.split(' '))
      const currWords = keyWords.split(' ')
      const overlap = currWords.filter(w => prevWords.has(w)).length
      if (currWords.length > 0 && overlap / currWords.length > 0.6) {
        isDuplicate = true
        break
      }
    }
    if (!isDuplicate && p.trim().length > 20) {
      unique.push(p)
      seen.add(keyWords)
    }
  }
  return unique.join('\n\n')
}
