import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { generateWithGemini } from '@/lib/ai/client'
import { rateLimit } from '@/lib/rate-limit'
import { validateOrigin } from '@/lib/csrf'
import { z } from 'zod'

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 })
const client = new Anthropic()

const schema = z.object({
  topic: z.string().min(3).max(500),
  category: z.string().optional(),
  articleType: z.enum(['breaking', 'report', 'analysis', 'preview', 'transfer', 'rankings', 'profile']).optional(),
  language: z.string().default('bs'),
  sources: z.array(z.object({
    title: z.string(),
    source: z.string(),
    role: z.enum(['primary', 'supporting', 'media']),
  })).optional(),
  mode: z.enum(['single', 'combined', 'rewrite', 'copilot']).default('single'),
  sourceContext: z.string().max(2000).optional(),
  sourceDomain: z.string().optional(),
  wordCount: z.number().min(50).max(2500).default(300),
})

type ContextLevel = 'full' | 'combined' | 'headline-only'
type FactWarning = { type: string; detail: string; severity: 'HIGH' | 'MEDIUM' | 'LOW' }

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    try {
      await limiter.check(5, `ai-smart:${session.user.id}`)
    } catch {
      return NextResponse.json({ error: 'Rate limit exceeded. Please wait a minute.' }, { status: 429 })
    }

    const body = await req.json()
    const input = schema.parse(body)
    const wordTarget = input.wordCount || 300

    const systemPrompt = `You are a senior sports journalist writing for a digital newsroom. Output valid JSON only, no markdown wrapping.

ABSOLUTE RULES — VIOLATION OF THESE PRODUCES FAKE NEWS:
1. NEVER add player names, goal scorers, match minutes, assist providers, substitutions, or specific match statistics unless they are EXPLICITLY written in the source text provided to you. If the source says "Inter beat Juventus 3-2" but does not name the scorers, you must write "Inter beat Juventus 3-2" and NOTHING MORE about who scored. Do not fill in names from your own knowledge — your knowledge may be outdated or wrong.
2. NEVER state which team a player currently plays for unless the source text explicitly says so. Players move on loan, get transferred, or change clubs frequently. If you say "Esposito scored for Inter" but he is actually on loan at Spezia, that is FAKE NEWS.
3. NEVER invent match minutes. If the source says "Kalulu received a red card" do not add "in the 41st minute" unless the source explicitly states that minute.
4. NEVER invent transfer fees, contract lengths, salary figures, or release clause amounts unless the source explicitly states them.
5. NEVER invent quotes. If the source does not contain a direct quote, do not create one.
6. If you only have a headline and NO source article text, write MAXIMUM 3 sentences: Sentence 1: Restate the headline as a news lead. Sentence 2: One sentence of safe, general context ONLY if you are 100% certain it is current. Sentence 3: "Further details are expected to emerge." Then TLDR. Do NOT write more than this without source material.
7. When you have source text, you may ONLY include facts that appear in that source text. You may rephrase and restructure, but you must not add new factual claims.
8. If the source mentions a match result but not the scorers, write: "[Team] won [score] against [Team]." Do NOT add: "Goals from [invented names]."
9. For any statistical claim (records, streaks, rankings), add the qualifier "according to [source]" unless you are absolutely certain it is a universally known, unchanging fact.
10. CONFIDENCE MARKERS: If you must include a detail you are not 100% sure about from the source, prefix it with "Reports suggest" or "According to initial reports". Never state uncertain information as confirmed fact.

STRICT RULE: Never write about, mention, promote, or reference gambling, betting, odds, bookmakers, betting sites, or any gambling-related content. If a story involves betting odds or gambling, write about the sporting event itself only, completely ignoring any betting/gambling angles. This rule cannot be overridden.

TARGET LENGTH: Write approximately ${wordTarget} words.
${wordTarget <= 150 ? '- Write 2-3 short paragraphs + TLDR. Be concise.' : wordTarget <= 300 ? '- Write 3-4 paragraphs + TLDR. Standard coverage.' : wordTarget <= 500 ? '- Write 4-6 paragraphs + TLDR. Include background context.' : '- Write 5-8 paragraphs + TLDR. Include background, analysis, and future implications.'}
CRITICAL: Do NOT pad with filler to reach the word count. If you only have enough facts for 200 words, write 200 words even if asked for 500. Quality over quantity ALWAYS.

WRITING RULES:
11. NEVER repeat information. Each paragraph MUST contain a NEW fact. If you only have 2 facts, write 2 paragraphs and STOP.
14. BANNED WORDS AND PHRASES — never use: "landscape", "crucial", "paramount", "delve", "comprehensive", "It remains to be seen", "Only time will tell", "game-changer", "footballing world", "sending shockwaves", "blockbuster", "marquee signing", "meteoric rise", "the beautiful game", "masterclass", "interconnected nature", "the modern football", "remains fluid", "significant setback", "complex web", "transfer market continues", "adds another layer", "reflects the modern", "highlights the competitive nature", "the timing of these developments", "multiple clubs are reassessing", "in today's game", "represents a significant", "demonstrates the competitive".
15. Write like Reuters or BBC Sport — factual, tight, no fluff. Start with the NEWS.
16. Each paragraph: 2-3 sentences maximum.
17. No filler conclusions. End with the last relevant fact.
18. HTML tags allowed: <h2>, <p>, <ul>, <li>. No <blockquote> unless quoting from source. No <h3>.
19. SEO: metaTitle max 60 characters. metaDescription max 155 characters.
20. FAQ: Generate exactly 3 questions. Answers based ONLY on article facts.
21. Social posts must be factual summaries, not hype.

The JSON must have this exact structure:
{
  "title": "Factual headline under 70 chars",
  "content": "Article in HTML (<h2>, <p>, <ul>, <li> only). Max ${wordTarget} words. Each paragraph MUST contain NEW info. Facts only.",
  "excerpt": "1-2 sentence factual summary",
  "poll": {
    "question": "Relevant fan opinion question",
    "options": ["Option A", "Option B", "Option C"]
  },
  "quiz": {
    "title": "Quiz title",
    "questions": [
      {"question": "Question based on article content?", "options": ["A", "B", "C", "D"], "correct": 0}
    ]
  },
  "imageQuery": "Unsplash search query (2-4 keywords)",
  "seo": {
    "metaTitle": "SEO title max 60 chars",
    "metaDescription": "Meta description max 155 chars",
    "slug": "url-safe-slug",
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
    "ogImageText": "Short OG headline max 80 chars"
  },
  "faq": [
    {"q": "Question from article?", "a": "Answer using only article facts."},
    {"q": "Second question?", "a": "Second answer."},
    {"q": "Third question?", "a": "Third answer."}
  ],
  "social": {
    "facebook": "Factual share text under 200 chars",
    "twitter": "Factual tweet under 280 chars with hashtags"
  },
  "tags": ["tag1", "tag2", "tag3"],
  "category": "Sport"
}`

    let userPrompt: string
    let contextLevel: ContextLevel

    if (input.mode === 'rewrite' && input.sourceContext) {
      contextLevel = 'full'
      userPrompt = `REWRITE this article in your own editorial voice. Do NOT copy sentences — rewrite completely.

ORIGINAL HEADLINE: ${input.topic}
SOURCE: ${input.sourceDomain || 'Unknown'}

ORIGINAL ARTICLE TEXT (first 1500 chars):
${input.sourceContext}

CATEGORY: ${input.category || 'Sport'}
TYPE: ${input.articleType || 'report'}
LANGUAGE: ${input.language}

Instructions:
- Rewrite the article completely — new sentence structures, new phrasing
- Keep all facts from the original but present them in your own voice
- Do NOT copy any sentences verbatim from the source
- Do NOT invent new facts not in the source
- Max ${wordTarget} words
- Start with the news, not background`
    } else if (input.mode === 'combined' && input.sources && input.sources.length > 0) {
      contextLevel = 'combined'
      const primary = input.sources.filter(s => s.role === 'primary')
      const supporting = input.sources.filter(s => s.role === 'supporting')
      const media = input.sources.filter(s => s.role === 'media')

      userPrompt = `You are given multiple headlines about the same topic. Write ONE unified article that covers the story. Do NOT write a separate paragraph for each headline. Instead, synthesize all information into a single coherent narrative. Maximum 4 paragraphs + TLDR. Each paragraph must contain NEW information not in any other paragraph.

PRIMARY SOURCE:
${primary.map(s => `HEADLINE: ${s.title}\nSOURCE: ${s.source}`).join('\n')}

${supporting.length > 0 ? `SUPPORTING CONTEXT:\n${supporting.map(s => `HEADLINE: ${s.title}\nSOURCE: ${s.source}`).join('\n')}` : ''}

${media.length > 0 ? `RELATED MEDIA:\n${media.map(s => `HEADLINE: ${s.title}\nSOURCE: ${s.source}`).join('\n')}` : ''}

CATEGORY: ${input.category || 'Sport'}
TYPE: ${input.articleType || 'report'}
LANGUAGE: ${input.language}

Remember: ONLY use facts from the headlines above. Do NOT invent details. Max ${wordTarget} words. Synthesize, do NOT repeat.`
    } else if (input.mode === 'copilot') {
      contextLevel = 'full'
      const typeMap: Record<string, string> = {
        preview: 'Write a match preview. Include both teams form, head-to-head history, key players and prediction.',
        report: 'Write a match report. Include key moments, statistics, player ratings and analysis.',
        transfer: 'Write a transfer article. Include contract details, reactions, and how this transfer affects the team.',
        analysis: 'Write a tactical analysis. Include formations, key statistics and conclusions.',
        rankings: 'Write a rankings list. Include reasoning for each position.',
        profile: 'Write a player profile. Include career, statistics, playing style and market value.',
        breaking: 'Write a breaking news article.',
      }
      const typeInstruction = typeMap[input.articleType || 'report'] || typeMap.report

      userPrompt = `Write a full sports article based on this prompt from the editor:

PROMPT: ${input.topic}

ARTICLE TYPE GUIDANCE: ${typeInstruction}
CATEGORY: ${input.category || 'Sport'}
LANGUAGE: ${input.language === 'bs' ? 'Bosnian' : input.language === 'hr' ? 'Croatian' : input.language === 'sr' ? 'Serbian' : 'English'}

Instructions:
- Write a complete, well-structured article of approximately ${wordTarget} words
- Use the prompt as your main topic/direction
- You may use general knowledge you are confident about (team names, well-known facts)
- Do NOT invent specific statistics, quotes, match scores, or transfer fees
- If the prompt mentions specific details, use them; otherwise stay general
- Write in ${input.language === 'bs' ? 'Bosnian' : input.language === 'hr' ? 'Croatian' : input.language === 'sr' ? 'Serbian' : 'English'}
- Start with the news lead, not background
- Include relevant context and analysis where appropriate`
    } else {
      contextLevel = 'headline-only'
      userPrompt = `YOU HAVE NO SOURCE ARTICLE. You ONLY have this headline:

HEADLINE: ${input.topic}
LANGUAGE: ${input.language}

STRICT RULES FOR HEADLINE-ONLY GENERATION:
- Write MAXIMUM 3 sentences total in a single paragraph:
  Sentence 1: Restate the headline as a factual news lead.
  Sentence 2: One sentence of safe, general context ONLY if you are 100% certain it is current.
  Sentence 3: "Further details are expected to emerge."
- Then add a TLDR line repeating the core fact.
- Do NOT invent ANY details: no player names not in the headline, no transfer fees, no quotes, no match scores, no statistics, no contract lengths, no wages
- Do NOT speculate about implications, reactions, or future consequences
- Do NOT add background context or historical information you are not 100% certain about
- The content section in your JSON must be under 80 words total
- This is a BREAKING NEWS STUB — short, factual, zero fabrication`
    }

    const maxTokens = Math.min(4000, Math.max(500, Math.round(wordTarget * 2.5)))

    let text = ''
    let llmModel = ''
    let tokensIn = 0
    let tokensOut = 0

    // Try Anthropic first, fallback to Gemini
    try {
      if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      })
      text = response.content[0].type === 'text' ? response.content[0].text : ''
      llmModel = response.model
      tokensIn = response.usage.input_tokens
      tokensOut = response.usage.output_tokens
    } catch (anthropicErr) {
      console.error('[Smart Generate] Anthropic failed, trying Gemini:', anthropicErr instanceof Error ? anthropicErr.message : anthropicErr)
      const geminiResult = await generateWithGemini({
        system: systemPrompt,
        prompt: userPrompt,
        maxTokens,
        temperature: 0.3,
      })
      text = geminiResult.text
      llmModel = geminiResult.model
      tokensIn = geminiResult.tokensIn
      tokensOut = geminiResult.tokensOut
    }

    let cleaned = text.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const result = JSON.parse(cleaned)
    if (result.content) {
      result.content = removeDuplicateParagraphs(result.content)
    }
    const tiptapContent = htmlToTiptap(result.content || '')

    const warnings = await basicFactCheck(result.content || '', input.sourceContext || '', input.topic)

    return NextResponse.json({
      ...result,
      tiptapContent,
      contextLevel,
      factCheck: {
        warnings,
        warningCount: warnings.length,
        status: warnings.length === 0 ? 'CLEAN' :
                warnings.some(w => w.severity === 'HIGH') ? 'REVIEW_REQUIRED' : 'CAUTION',
      },
      model: llmModel,
      tokensIn,
      tokensOut,
    })
  } catch (error) {
    console.error('Smart generate error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to generate article' }, { status: 500 })
  }
}

function removeDuplicateParagraphs(html: string): string {
  const parts = html.split('</p>').filter(p => p.trim())
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

function htmlToTiptap(html: string): Record<string, unknown> {
  const content: Record<string, unknown>[] = []
  const blockRegex = /<(h[1-6]|p|blockquote|ul|ol)>([\s\S]*?)<\/\1>/gi
  let match

  while ((match = blockRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase()
    const inner = match[2].trim()

    if (tag.startsWith('h')) {
      const level = parseInt(tag[1])
      content.push({
        type: 'heading',
        attrs: { level },
        content: parseInline(inner),
      })
    } else if (tag === 'p') {
      if (inner) {
        content.push({
          type: 'paragraph',
          content: parseInline(inner),
        })
      }
    } else if (tag === 'blockquote') {
      const innerP = inner.replace(/<\/?p>/gi, '')
      content.push({
        type: 'blockquote',
        content: [{
          type: 'paragraph',
          content: parseInline(innerP),
        }],
      })
    } else if (tag === 'ul' || tag === 'ol') {
      const liRegex = /<li>([\s\S]*?)<\/li>/gi
      const items: Record<string, unknown>[] = []
      let liMatch
      while ((liMatch = liRegex.exec(inner)) !== null) {
        items.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: parseInline(liMatch[1].trim()),
          }],
        })
      }
      content.push({
        type: tag === 'ul' ? 'bulletList' : 'orderedList',
        content: items,
      })
    }
  }

  if (content.length === 0) {
    const paragraphs = html.split(/\n\n+/).filter(Boolean)
    for (const p of paragraphs) {
      content.push({
        type: 'paragraph',
        content: [{ type: 'text', text: p.replace(/<[^>]+>/g, '').trim() }],
      })
    }
  }

  return { type: 'doc', content }
}

function parseInline(html: string): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = []
  const text = html
    .replace(/<strong>(.*?)<\/strong>/gi, '$1')
    .replace(/<em>(.*?)<\/em>/gi, '$1')
    .replace(/<b>(.*?)<\/b>/gi, '$1')
    .replace(/<i>(.*?)<\/i>/gi, '$1')
    .replace(/<a[^>]*>(.*?)<\/a>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .trim()

  if (text) {
    nodes.push({ type: 'text', text })
  }
  return nodes
}

async function basicFactCheck(articleHtml: string, sourceContext: string, headline: string): Promise<FactWarning[]> {
  const warnings: FactWarning[] = []
  const text = articleHtml.replace(/<[^>]+>/g, ' ').toLowerCase()
  const sourceLower = (sourceContext + ' ' + headline).toLowerCase()

  if (sourceContext && sourceContext.trim().length > 50) {
    try {
      const players = await prisma.player.findMany({
        select: { name: true, shortName: true, currentTeam: true }
      })

      for (const player of players) {
        const nameInArticle = text.includes(player.name.toLowerCase()) ||
                             (player.shortName ? text.includes(player.shortName.toLowerCase()) : false)
        const nameInSource = sourceLower.includes(player.name.toLowerCase()) ||
                            (player.shortName ? sourceLower.includes(player.shortName.toLowerCase()) : false)

        if (nameInArticle && !nameInSource) {
          warnings.push({
            type: 'PLAYER_NOT_IN_SOURCE',
            detail: `"${player.name}" appears in article but NOT in source material. This may be hallucinated.`,
            severity: 'HIGH',
          })
        }
      }
    } catch (err) {
      console.error('Fact-check parse/walk:', err)
    }
  }

  const minutePattern = /(\d{1,3})(?:st|nd|rd|th)?\s*(?:minute|min|')/g
  const articleMinutes = Array.from(text.matchAll(minutePattern)).map(m => m[1])
  if (sourceContext && articleMinutes.length > 0) {
    const sourceMinutes = Array.from(sourceLower.matchAll(minutePattern)).map(m => m[1])
    for (const min of articleMinutes) {
      if (!sourceMinutes.includes(min)) {
        warnings.push({
          type: 'MINUTE_NOT_IN_SOURCE',
          detail: `Match minute "${min}'" appears in article but not in source material.`,
          severity: 'LOW',
        })
      }
    }
  }

  const moneyPattern = /[€£$]\s*(\d+(?:\.\d+)?)\s*m/gi
  const articleMoney = Array.from(text.matchAll(moneyPattern)).map(m => m[0])
  if (sourceContext && articleMoney.length > 0) {
    for (const amount of articleMoney) {
      if (!sourceLower.includes(amount.toLowerCase())) {
        warnings.push({
          type: 'AMOUNT_NOT_IN_SOURCE',
          detail: `Financial figure "${amount}" appears in article but not in source material.`,
          severity: 'MEDIUM',
        })
      }
    }
  }

  const quoteMatches = text.match(/"[^"]{10,}"/g) || []
  for (const q of quoteMatches) {
    const inner = q.slice(1, -1).trim()
    if (!sourceLower.includes(inner.substring(0, 25))) {
      warnings.push({
        type: 'QUOTE_NOT_IN_SOURCE',
        detail: `Quote ${q.substring(0, 50)}... not found in source material.`,
        severity: 'HIGH',
      })
    }
  }

  const scoreMatches = text.match(/\b\d{1,2}\s*[-–]\s*\d{1,2}\b/g) || []
  for (const s of scoreMatches) {
    const plain = s.replace(/\s+/g, '').replace('–', '-')
    if (sourceContext && !sourceLower.includes(plain) && !sourceLower.includes(s)) {
      warnings.push({
        type: 'SCORE_NOT_IN_SOURCE',
        detail: `Score "${s}" appears in article but not in source material.`,
        severity: 'MEDIUM',
      })
    }
  }

  const seen = new Set<string>()
  return warnings.filter(w => {
    const key = w.detail.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
