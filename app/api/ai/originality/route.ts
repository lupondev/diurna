import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateContent } from '@/lib/ai/client'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 })
    }

    const { content } = await req.json()
    if (!content || typeof content !== 'string' || content.trim().length < 50) {
      return NextResponse.json({ error: 'Content must be at least 50 characters' }, { status: 400 })
    }

    const truncated = content.slice(0, 5000)

    const system = `You are an expert content originality analyst. Analyze the provided text and return a JSON response with these fields:
{
  "aiScore": <number 0-100, likelihood the text was AI-generated. 0=definitely human, 100=definitely AI>,
  "uniquenessScore": <number 0-100, how unique/original the writing style and content is>,
  "flaggedPhrases": [<array of up to 5 phrases that seem generic, cliched, or commonly AI-generated>],
  "suggestions": [<array of 3-5 actionable suggestions to improve originality>],
  "summary": "<1-2 sentence overall assessment>"
}
Respond ONLY with valid JSON. No markdown, no extra text.`

    const result = await generateContent({
      system,
      prompt: `Analyze this text for originality:\n\n${truncated}`,
    })

    let parsed
    try {
      const cleaned = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      parsed = {
        aiScore: 50,
        uniquenessScore: 50,
        flaggedPhrases: [],
        suggestions: ['Could not analyze content. Try again.'],
        summary: 'Analysis could not be completed.',
      }
    }

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Originality check error:', error)
    return NextResponse.json({ error: 'Originality check failed' }, { status: 500 })
  }
}
