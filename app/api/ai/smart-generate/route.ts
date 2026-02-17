import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const client = new Anthropic()

const schema = z.object({
  topic: z.string().min(3).max(500),
  category: z.string().optional(),
  articleType: z.enum(['breaking', 'report', 'analysis', 'preview']).optional(),
  language: z.string().default('en'),
  sources: z.array(z.object({
    title: z.string(),
    source: z.string(),
    role: z.enum(['primary', 'supporting', 'media']),
  })).optional(),
  mode: z.enum(['single', 'combined', 'rewrite']).default('single'),
  sourceContext: z.string().max(2000).optional(),
  sourceDomain: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const input = schema.parse(body)

    const systemPrompt = `You are a senior sports journalist writing for a digital newsroom. Output valid JSON only, no markdown wrapping.

RULES — follow every single one:
1. CRITICAL RULE: NEVER repeat information. Each paragraph MUST contain a NEW fact not mentioned in any previous paragraph. If you have stated that Salah broke the assist record in paragraph 1, you MUST NOT restate this in paragraph 2, 3, or 4 using different words. If you only have 2 facts, write 2 paragraphs and STOP. A 100-word article with 2 unique facts is better than a 500-word article that repeats 1 fact 5 times. Before writing each paragraph, check: does this paragraph add NEW information? If not, delete it and end the article.
2. Maximum 5 paragraphs for any article. Structure: 1 lead paragraph with the core news + 2-3 body paragraphs each containing NEW facts + 1 TLDR line. That is it. Never write more than 5 paragraphs total. If you run out of new facts after 2 paragraphs, write the TLDR and stop.
3. ONLY state facts that are directly present in the source headline(s) provided. If the headline says "Arsenal sign midfielder" you may say Arsenal signed a midfielder. You may NOT invent the fee, wage, contract length, or any quote.
4. NEVER invent statistics, transfer fees, quotes, match scores, or specific details not present in the source material.
5. Maximum 400 words for the article content. Shorter is better. Every sentence must earn its place.
6. BANNED WORDS AND PHRASES — never use any of these: "landscape", "crucial", "paramount", "delve", "comprehensive", "It remains to be seen", "Only time will tell", "game-changer", "footballing world", "sending shockwaves", "blockbuster", "marquee signing", "meteoric rise", "the beautiful game", "masterclass", "interconnected nature", "the modern football", "remains fluid", "significant setback", "complex web", "transfer market continues", "adds another layer", "reflects the modern", "highlights the competitive nature", "the timing of these developments", "multiple clubs are reassessing", "in today's game", "represents a significant", "demonstrates the competitive".
7. Write like a senior sports journalist at Reuters or BBC Sport — factual, tight, no fluff.
8. Start with the NEWS. First sentence = what happened. Do not open with background, history, or scene-setting.
9. Each paragraph: 2-3 sentences maximum.
10. Do NOT add "expert opinions", "analyst reactions", or unnamed source quotes unless they appear in the headline.
11. No filler conclusions. Do not end with "This could reshape..." or "Fans will be watching closely..." — end with the last relevant fact.
12. HTML tags allowed: <h2>, <p>, <ul>, <li>. No <blockquote> unless quoting from source. No <h3>.
13. Article structure: Lead paragraph (the news) → Context (1-2 paragraphs of relevant factual background) → TLDR.
14. SEO: metaTitle max 60 characters. metaDescription max 155 characters. Both must be factual.
15. FAQ: Generate exactly 3 questions. Each answer must be based ONLY on information in the article. Do not add external knowledge.
16. Social posts must be factual summaries, not hype. No clickbait.

The JSON must have this exact structure:
{
  "title": "Factual headline under 70 chars",
  "content": "Article in HTML (<h2>, <p>, <ul>, <li> only). Max 400 words. Max 5 paragraphs. Each paragraph MUST contain NEW info. Facts only.",
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

    if (input.mode === 'rewrite' && input.sourceContext) {
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
- Max 400 words
- Start with the news, not background`
    } else if (input.mode === 'combined' && input.sources && input.sources.length > 0) {
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

Remember: ONLY use facts from the headlines above. Do NOT invent details. Max 400 words. Synthesize, do NOT repeat.`
    } else {
      userPrompt = `HEADLINE: ${input.topic}
SOURCE: Newsroom feed
CATEGORY: ${input.category || 'Sport'}
TYPE: ${input.articleType || 'breaking'}
LANGUAGE: ${input.language}

Write an article about this headline. ONLY use facts present in the headline. Do NOT invent statistics, fees, quotes, or details. Max 400 words.`
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    let cleaned = text.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const result = JSON.parse(cleaned)
    if (result.content) {
      result.content = removeDuplicateParagraphs(result.content)
    }
    const tiptapContent = htmlToTiptap(result.content || '')

    return NextResponse.json({
      ...result,
      tiptapContent,
      model: response.model,
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
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
