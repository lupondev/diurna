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
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const input = schema.parse(body)

    const systemPrompt = `You are a senior journalist AI assistant for Diurna CMS. Generate a COMPLETE article package in a single response. Output valid JSON only, no markdown wrapping.

The JSON must have this exact structure:
{
  "title": "CTR-optimized headline (50-70 chars)",
  "content": "Full article in HTML format. Use <h2>, <h3>, <p>, <blockquote>, <ul>, <li> tags. Write 800-1500 words. Content must be original, paraphrased, and journalistically sound. Include quotes where relevant.",
  "excerpt": "2-sentence compelling summary for meta/social",
  "poll": {
    "question": "Engaging poll question related to the topic",
    "options": ["Option A", "Option B", "Option C"]
  },
  "quiz": {
    "title": "Quiz title",
    "questions": [
      {
        "question": "Question text?",
        "options": ["A", "B", "C", "D"],
        "correct": 0
      }
    ]
  },
  "widget": {
    "type": "poll|quiz|match_widget|stats_table",
    "suggestion": "Brief description of recommended widget"
  },
  "imageQuery": "Unsplash search query (2-4 keywords)",
  "seo": {
    "metaTitle": "SEO-optimized title (50-60 chars)",
    "metaDescription": "Meta description (150-160 chars)"
  },
  "social": {
    "facebook": "Facebook share text (engaging, under 200 chars)",
    "twitter": "Twitter/X post text (under 280 chars with hashtags)"
  },
  "tags": ["tag1", "tag2", "tag3"],
  "category": "Sport|Politics|Tech|Business|Entertainment|General"
}`

    const userPrompt = `Generate a complete article package about: "${input.topic}"
${input.category ? `Category: ${input.category}` : ''}
${input.articleType ? `Article type: ${input.articleType}` : ''}
Language: ${input.language}

Write the article content as original journalism. Make it informative, engaging, and factual. The quiz should have exactly 5 questions. All content must be unique and paraphrased.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse JSON from response (handle potential markdown wrapping)
    let cleaned = text.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const result = JSON.parse(cleaned)

    // Convert HTML content to Tiptap JSON
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

// Convert basic HTML to Tiptap JSON format
function htmlToTiptap(html: string): Record<string, unknown> {
  const content: Record<string, unknown>[] = []

  // Split by block-level tags
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

  // If no blocks parsed, treat as plain paragraphs
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
  // Strip HTML tags but preserve text
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
