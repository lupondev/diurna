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
  mode: z.enum(['single', 'combined']).default('single'),
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
1. ONLY state facts that are directly present in the source headline(s) provided. If the headline says "Arsenal sign midfielder" you may say Arsenal signed a midfielder. You may NOT invent the fee, wage, contract length, or any quote.
2. NEVER invent statistics, transfer fees, quotes, match scores, or specific details not present in the source material.
3. Maximum 400 words for the article content. Shorter is better. Every sentence must earn its place.
4. BANNED WORDS AND PHRASES — never use any of these: "landscape", "crucial", "paramount", "delve", "comprehensive", "It remains to be seen", "Only time will tell", "game-changer", "footballing world", "sending shockwaves", "blockbuster", "marquee signing", "meteoric rise", "the beautiful game", "masterclass".
5. Write like a senior sports journalist at Reuters or BBC Sport — factual, tight, no fluff.
6. Start with the NEWS. First sentence = what happened. Do not open with background, history, or scene-setting.
7. Each paragraph: 2-3 sentences maximum.
8. Do NOT add "expert opinions", "analyst reactions", or unnamed source quotes unless they appear in the headline.
9. No filler conclusions. Do not end with "This could reshape..." or "Fans will be watching closely..." — end with the last relevant fact.
10. HTML tags allowed: <h2>, <p>, <ul>, <li>. No <blockquote> unless quoting from source. No <h3>.
11. Article structure: Lead paragraph (the news) → Context (1-2 paragraphs of relevant factual background) → What's next (only if factual, e.g. "The transfer window closes on Feb 3").
12. SEO: metaTitle max 60 characters. metaDescription max 155 characters. Both must be factual.
13. FAQ: Generate exactly 3 questions. Each answer must be based ONLY on information in the article. Do not add external knowledge.
14. Social posts must be factual summaries, not hype. No clickbait.

The JSON must have this exact structure:
{
  "title": "Factual headline under 70 chars",
  "content": "Article in HTML (<h2>, <p>, <ul>, <li> only). Max 400 words. Facts only.",
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

    if (input.mode === 'combined' && input.sources && input.sources.length > 0) {
      const primary = input.sources.filter(s => s.role === 'primary')
      const supporting = input.sources.filter(s => s.role === 'supporting')
      const media = input.sources.filter(s => s.role === 'media')

      userPrompt = `Write a COMBINED article from these sources. The article must synthesize all sources into one cohesive piece.

PRIMARY SOURCE:
${primary.map(s => `HEADLINE: ${s.title}\nSOURCE: ${s.source}`).join('\n')}

${supporting.length > 0 ? `SUPPORTING CONTEXT:\n${supporting.map(s => `HEADLINE: ${s.title}\nSOURCE: ${s.source}`).join('\n')}` : ''}

${media.length > 0 ? `RELATED MEDIA:\n${media.map(s => `HEADLINE: ${s.title}\nSOURCE: ${s.source}`).join('\n')}` : ''}

CATEGORY: ${input.category || 'Sport'}
TYPE: ${input.articleType || 'report'}
LANGUAGE: ${input.language}

Remember: ONLY use facts from the headlines above. Do NOT invent details. Max 400 words.`
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
