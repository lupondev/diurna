import Anthropic from '@anthropic-ai/sdk';
import type { GeneratedArticle, NormalizedSnapshot } from './types';
import { buildStyleRefinerPrompt, getVocabularyHints, checkStructuralRules } from './style-guide';

/**
 * Style Refiner — Pass 2 of the article generation pipeline.
 * Takes a validated Pass 1 article and applies editorial polish
 * following AP/Reuters/BBC/Economist/Al Jazeera standards.
 *
 * CRITICAL: This pass must NOT introduce new facts or hallucinations.
 * The post-style validator (separate module) verifies this.
 */

export interface StyleRefinerResult {
  /** The style-refined article */
  refined: GeneratedArticle;
  /** Original article (for comparison) */
  original: GeneratedArticle;
  /** Whether refinement was applied (false if skipped/failed) */
  applied: boolean;
  /** Structural rule results */
  structural_check: {
    passed: boolean;
    results: { rule: string; passed: boolean; detail: string }[];
  };
  /** LLM token usage for the refinement pass */
  tokens_in: number;
  tokens_out: number;
  /** Refinement model used */
  model: string;
  /** Changes detected between original and refined */
  changes: StyleChange[];
}

export interface StyleChange {
  type: 'title' | 'excerpt' | 'content' | 'tags';
  original_length: number;
  refined_length: number;
  diff_percent: number;
}

/**
 * Refine an article's style using a second LLM pass.
 *
 * @param client - Anthropic client instance
 * @param article - The validated Pass 1 article
 * @param snapshot - The source data snapshot (for context in prompt)
 * @returns StyleRefinerResult with refined article and metadata
 */
export async function refineStyle(
  client: Anthropic,
  article: GeneratedArticle,
  snapshot: NormalizedSnapshot
): Promise<StyleRefinerResult> {
  const original = { ...article };

  // Pre-check structural rules on the original
  const preCheck = checkStructuralRules(article.content_html);

  // Build style refinement prompt
  const vocabularyHints = getVocabularyHints(10);
  const systemPrompt = buildStyleRefinerPrompt(vocabularyHints);

  const userPrompt = `Poliraj ovaj članak. Zadrži SVE činjenice, brojeve i imena.

ORIGINALNI ČLANAK:
${JSON.stringify({
    title: article.title,
    excerpt: article.excerpt,
    content_html: article.content_html,
    tags: article.tags,
  })}

KONTEKST UTAKMICE (za provjeru — NE dodaji nove podatke):
- ${snapshot.data.match.home} ${snapshot.data.match.score_home} : ${snapshot.data.match.score_away} ${snapshot.data.match.away}
- Takmičenje: ${snapshot.data.match.competition}
- Stadion: ${snapshot.data.match.venue}

STRUKTURNE PRIMJEDBE IZ PRE-ANALIZE:
${preCheck.results.map(r => `- ${r.rule}: ${r.passed ? 'OK' : r.detail}`).join('\n')}

Generiši polirani JSON sada.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    temperature: 0.2,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const tokensIn = response.usage.input_tokens;
  const tokensOut = response.usage.output_tokens;
  const model = response.model;

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  let refined: GeneratedArticle;
  try {
    refined = JSON.parse(cleaned) as GeneratedArticle;
  } catch (parseErr) {
    // Fallback: try truncated parse
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace > 0) {
      try {
        refined = JSON.parse(cleaned.substring(0, lastBrace + 1)) as GeneratedArticle;
      } catch {
        // Style refinement failed — return original unchanged
        console.error('[Style Refiner] JSON parse failed, returning original');
        return {
          refined: original,
          original,
          applied: false,
          structural_check: preCheck,
          tokens_in: tokensIn,
          tokens_out: tokensOut,
          model,
          changes: [],
        };
      }
    } else {
      console.error('[Style Refiner] JSON parse failed, returning original');
      return {
        refined: original,
        original,
        applied: false,
        structural_check: preCheck,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        model,
        changes: [],
      };
    }
  }

  // Ensure required fields exist
  if (!refined.title || !refined.content_html) {
    console.error('[Style Refiner] Missing required fields, returning original');
    return {
      refined: original,
      original,
      applied: false,
      structural_check: preCheck,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      model,
      changes: [],
    };
  }

  // Preserve tags from original if refiner dropped them
  if (!refined.tags || refined.tags.length === 0) {
    refined.tags = original.tags;
  }

  // Calculate changes
  const changes: StyleChange[] = [];

  if (refined.title !== original.title) {
    changes.push({
      type: 'title',
      original_length: original.title.length,
      refined_length: refined.title.length,
      diff_percent: Math.round(Math.abs(refined.title.length - original.title.length) / Math.max(original.title.length, 1) * 100),
    });
  }

  if (refined.excerpt !== original.excerpt) {
    changes.push({
      type: 'excerpt',
      original_length: original.excerpt.length,
      refined_length: refined.excerpt.length,
      diff_percent: Math.round(Math.abs(refined.excerpt.length - original.excerpt.length) / Math.max(original.excerpt.length, 1) * 100),
    });
  }

  if (refined.content_html !== original.content_html) {
    changes.push({
      type: 'content',
      original_length: original.content_html.length,
      refined_length: refined.content_html.length,
      diff_percent: Math.round(Math.abs(refined.content_html.length - original.content_html.length) / Math.max(original.content_html.length, 1) * 100),
    });
  }

  if (JSON.stringify(refined.tags) !== JSON.stringify(original.tags)) {
    changes.push({
      type: 'tags',
      original_length: original.tags.length,
      refined_length: refined.tags.length,
      diff_percent: 0,
    });
  }

  return {
    refined,
    original,
    applied: true,
    structural_check: preCheck,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    model,
    changes,
  };
}
