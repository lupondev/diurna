export type AIGenerationResult = {
  text: string
  model: string
  tokensIn: number
  tokensOut: number
}

export type ArticleType =
  | 'match-report'
  | 'transfer-news'
  | 'match-preview'
  | 'analysis'
