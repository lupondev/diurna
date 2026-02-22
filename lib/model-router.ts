import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

type TaskType = 'write' | 'translate' | 'verify' | 'summarize' | 'quick'

const MODEL_MAP: Record<TaskType, string> = {
  write: 'claude-sonnet-4-20250514',
  translate: 'claude-haiku-4-5-20251001',
  verify: 'gpt-4o',
  summarize: 'gemini-1.5-flash',
  quick: 'claude-haiku-4-5-20251001',
}

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

function getGemini() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
}

export async function writeArticle(prompt: string): Promise<string> {
  const client = getAnthropic()
  const response = await client.messages.create({
    model: MODEL_MAP.write,
    max_tokens: 4096,
    temperature: 0.4,
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
}

export async function translateArticle(content: string, targetLang: string): Promise<string> {
  const client = getAnthropic()
  const response = await client.messages.create({
    model: MODEL_MAP.translate,
    max_tokens: 4096,
    temperature: 0.1,
    system: `You are a professional translator. Translate the following content to ${targetLang}. Preserve all formatting, structure, and meaning. Output only the translated text.`,
    messages: [{ role: 'user', content }],
  })

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
}

export async function verifyArticle(content: string): Promise<{ score: number; issues: string[] }> {
  const client = getOpenAI()
  const response = await client.chat.completions.create({
    model: MODEL_MAP.verify,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are a fact-checking editor. Analyze the article for factual accuracy, bias, and journalistic quality. Respond with JSON: {"score": <0-100>, "issues": ["issue1", "issue2"]}',
      },
      { role: 'user', content },
    ],
  })

  const text = response.choices[0]?.message?.content || '{"score":0,"issues":["No response from verifier"]}'
  return JSON.parse(text) as { score: number; issues: string[] }
}

export async function summarizeCluster(newsItems: string[]): Promise<string> {
  const genAI = getGemini()
  const model = genAI.getGenerativeModel({
    model: MODEL_MAP.summarize,
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.2,
    },
  })

  const prompt = `Summarize these related news items into a single cohesive summary. Be concise and factual.\n\n${newsItems.map((item, i) => `[${i + 1}] ${item}`).join('\n\n')}`
  const result = await model.generateContent(prompt)
  return result.response.text()
}

export { MODEL_MAP, type TaskType }
