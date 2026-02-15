import { NextRequest, NextResponse } from 'next/server'
import { generateContent } from '@/lib/ai/client'
import { z } from 'zod'

const GenerateSchema = z.object({
  type: z.enum(['match-report', 'transfer-news', 'match-preview', 'analysis', 'custom']),
  // Match report fields
  homeTeam: z.string().optional(),
  awayTeam: z.string().optional(),
  score: z.string().optional(),
  league: z.string().optional(),
  keyEvents: z.string().optional(),
  // Transfer news fields
  playerName: z.string().optional(),
  fromClub: z.string().optional(),
  toClub: z.string().optional(),
  fee: z.string().optional(),
  // Custom
  customPrompt: z.string().optional(),
  // Common
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
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const data = GenerateSchema.parse(body)
    const { system, prompt } = buildPrompt(data)

    const result = await generateContent({ system, prompt })

    // Parse JSON from AI response
    let parsed
    try {
      // Clean response — remove markdown code blocks if present
      const cleaned = result.text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      parsed = JSON.parse(cleaned)
    } catch {
      // If JSON parsing fails, wrap raw text
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
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('AI generate error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI generation failed' },
      { status: 500 }
    )
  }
}
