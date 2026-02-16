import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateContent } from '@/lib/ai/client'
import { z } from 'zod'

const WidgetGenerateSchema = z.object({
  type: z.enum(['poll', 'quiz', 'survey']),
  topic: z.string().min(1).max(200),
  language: z.enum(['bs', 'hr', 'sr', 'en']).default('en'),
})

function buildPrompt(data: z.infer<typeof WidgetGenerateSchema>): { system: string; prompt: string } {
  const langMap: Record<string, string> = { bs: 'Bosnian', hr: 'Croatian', sr: 'Serbian', en: 'English' }
  const language = langMap[data.language] || 'English'

  let system = `You are a sports content creator writing in ${language}. Respond ONLY with valid JSON. Do NOT use markdown code blocks.`
  let prompt = ''

  switch (data.type) {
    case 'poll':
      system += `\nCreate an engaging fan poll. Return JSON: { "question": "...", "options": ["option1", "option2", "option3", "option4"] }. Use 3-4 options.`
      prompt = `Create a fan poll about: ${data.topic}`
      break
    case 'quiz':
      system += `\nCreate a sports quiz. Return JSON: { "title": "...", "questions": [{ "question": "...", "options": ["A", "B", "C", "D"], "correct": 0 }] }. Create 5-8 multiple choice questions. "correct" is the 0-based index of the right answer.`
      prompt = `Create a sports quiz about: ${data.topic}`
      break
    case 'survey':
      system += `\nCreate a fan survey with rating-scale questions. Return JSON: { "title": "...", "questions": [{ "question": "...", "scale": ["1 - Strongly Disagree", "2", "3", "4", "5 - Strongly Agree"] }] }. Create 5 questions with 5-point rating scales.`
      prompt = `Create a fan survey about: ${data.topic}`
      break
  }

  return { system, prompt }
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = WidgetGenerateSchema.parse(body)
    const { system, prompt } = buildPrompt(data)

    const result = await generateContent({ system, prompt, maxTokens: 1500 })

    let parsed
    try {
      const cleaned = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 500 })
    }

    return NextResponse.json({ data: parsed, type: data.type })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('AI widget generate error:', error)
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  }
}
