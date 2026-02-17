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
  wordCount: z.number().default(400),
})

function buildPrompt(data: z.infer<typeof GenerateSchema>): { system: string; prompt: string } {
  const langMap: Record<string, string> = {
    bs: 'Bosnian',
    hr: 'Croatian',
    sr: 'Serbian',
    en: 'English',
  }
  const language = langMap[data.language] || 'Bosnian'
  const wordTarget = data.wordCount || 400

  const system = `You are a senior sports journalist at BBC Sport / Reuters writing in ${language}. Output valid JSON only, no markdown wrapping.

RULES — follow every single one:
1. CRITICAL RULE: NEVER repeat information. Each paragraph MUST contain a NEW fact not mentioned in any previous paragraph. If you have stated that Salah broke the assist record in paragraph 1, you MUST NOT restate this in paragraph 2, 3, or 4 using different words. If you only have 2 facts, write 2 paragraphs and STOP. A 100-word article with 2 unique facts is better than a 500-word article that repeats 1 fact 5 times. Before writing each paragraph, check: does this paragraph add NEW information? If not, delete it and end the article.
2. Maximum 5 paragraphs for any article. Structure: 1 lead paragraph with the core news + 2-3 body paragraphs each containing NEW facts + 1 TLDR line. That is it. Never write more than 5 paragraphs total. If you run out of new facts after 2 paragraphs, write the TLDR and stop.
3. ONLY state facts provided in the user prompt. NEVER invent statistics, transfer fees, quotes, match scores, or details not given.
4. Target ${wordTarget} words maximum. Shorter is better — every sentence must earn its place.
5. BANNED WORDS AND PHRASES — never use: "landscape", "crucial", "paramount", "delve", "comprehensive", "It remains to be seen", "Only time will tell", "game-changer", "footballing world", "sending shockwaves", "blockbuster", "marquee signing", "meteoric rise", "the beautiful game", "masterclass", "Furthermore", "Moreover", "interconnected nature", "the modern football", "remains fluid", "significant setback", "complex web", "transfer market continues", "adds another layer", "reflects the modern", "highlights the competitive nature", "the timing of these developments", "multiple clubs are reassessing", "in today's game", "represents a significant", "demonstrates the competitive".
6. Start with the NEWS. First sentence = what happened. Do not open with background, history, or scene-setting.
7. Each paragraph: 2-3 sentences maximum. Tight and factual.
8. Do NOT add "expert opinions", "analyst reactions", or unnamed source quotes unless explicitly provided in the prompt.
9. No filler conclusions. Do not end with "This could reshape..." or "Fans will be watching closely..."
10. End the article with a TLDR line: a single sentence summary of the key fact.
11. Tone: ${data.tone}. Even casual/tabloid must remain factual — no invented details.
12. Social posts must be factual summaries, not hype. No clickbait.

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

    const result = await generateContent({ system, prompt, maxTokens: 1500, temperature: 0.3 })

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
    console.error('AI generate error:', error)
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
