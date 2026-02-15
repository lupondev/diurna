import { z } from 'zod'

export const MatchReportInput = z.object({
  homeTeam: z.string(),
  awayTeam: z.string(),
  score: z.string(),
  league: z.string(),
  keyEvents: z.array(z.string()).optional(),
  tone: z
    .enum(['professional', 'casual', 'tabloid', 'analytical'])
    .default('professional'),
  language: z.string().default('bs'),
  wordCount: z.number().default(600),
})

export type MatchReportInput = z.infer<typeof MatchReportInput>

export function buildMatchReportPrompt(input: MatchReportInput): {
  system: string
  prompt: string
} {
  return {
    system: `You are a professional sports journalist writing for a ${input.language} audience.
Write in a ${input.tone} tone. Target ${input.wordCount} words.
Return JSON: { "title": "...", "excerpt": "...", "content": "...", "tags": [...] }`,
    prompt: `Write a match report: ${input.homeTeam} vs ${input.awayTeam}, final score ${input.score}.
League: ${input.league}.
${input.keyEvents?.length ? `Key events: ${input.keyEvents.join(', ')}` : ''}`,
  }
}
