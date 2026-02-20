import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function generateContent(input: {
  system: string
  prompt: string
  maxTokens?: number
  temperature?: number
}): Promise<{
  text: string
  model: string
  tokensIn: number
  tokensOut: number
}> {
  // Try Anthropic first
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: input.maxTokens || 1500,
        temperature: input.temperature ?? 0.3,
        system: input.system,
        messages: [{ role: 'user', content: input.prompt }],
      })

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n')

      return {
        text,
        model: response.model,
        tokensIn: response.usage.input_tokens,
        tokensOut: response.usage.output_tokens,
      }
    } catch (err) {
      console.error('[AI] Anthropic failed, trying Gemini fallback:', err instanceof Error ? err.message : err)
    }
  }

  // Fallback: Google Gemini
  return generateWithGemini(input)
}

async function generateWithGemini(input: {
  system: string
  prompt: string
  maxTokens?: number
  temperature?: number
}): Promise<{
  text: string
  model: string
  tokensIn: number
  tokensOut: number
}> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('No AI provider available (ANTHROPIC_API_KEY and GEMINI_API_KEY both missing)')
  }

  console.log('[AI] Using Gemini fallback')
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: input.system,
    generationConfig: {
      maxOutputTokens: input.maxTokens || 1500,
      temperature: input.temperature ?? 0.3,
    },
  })

  const result = await model.generateContent(input.prompt)
  const response = result.response
  const text = response.text()
  const usage = response.usageMetadata

  return {
    text,
    model: 'gemini-2.0-flash',
    tokensIn: usage?.promptTokenCount ?? 0,
    tokensOut: usage?.candidatesTokenCount ?? 0,
  }
}

/** Standalone Gemini call for use in routes that bypass generateContent() */
export { generateWithGemini }
