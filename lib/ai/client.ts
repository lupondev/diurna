import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function generateContent(input: {
  system: string
  prompt: string
  maxTokens?: number
}): Promise<{
  text: string
  model: string
  tokensIn: number
  tokensOut: number
}> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: input.maxTokens || 2000,
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
}
