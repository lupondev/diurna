/**
 * AI provider abstraction.
 * Swap provider by changing this file — nothing else needs to change.
 */
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
  // TODO: Wire up Anthropic SDK when API key is configured
  // For now, return a placeholder to avoid build errors
  return {
    text: '[AI generation will be connected in Week 2]',
    model: 'placeholder',
    tokensIn: 0,
    tokensOut: 0,
  }
}
