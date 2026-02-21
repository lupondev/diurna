import type { GeneratedArticle, NormalizedSnapshot, CDIResult } from './types';
import { DIURNA_STYLE_GUIDE } from './style-guide';
import { systemLog } from '@/lib/system-log';

/**
 * Style Refiner — Pass 2 of the article generation pipeline.
 *
 * Takes a validated Pass 1 article and applies editorial polish
 * following AP/Reuters/BBC/Economist/Al Jazeera standards.
 *
 * Returns refined HTML (not a full article JSON) — the route handler
 * decides whether to swap content_html based on post-style validation.
 *
 * CRITICAL: This pass must NOT introduce new facts or hallucinations.
 */

export interface StyleRefinementResult {
  original_html: string;
  refined_html: string;
  changes_made: string[];
  style_score: number; // 0-10
  tokens_in: number;
  tokens_out: number;
}

/**
 * Refine an article's style using a second LLM pass.
 */
export async function refineArticleStyle(
  article: GeneratedArticle,
  snapshot: NormalizedSnapshot,
  cdi: CDIResult
): Promise<StyleRefinementResult> {
  const m = snapshot.data.match;
  const guide = DIURNA_STYLE_GUIDE;

  const stylePrompt = `Ti si urednik na elitnom sportskom portalu. Tvoj posao je da unaprijediš stil teksta, NE da mijenjaš činjenice.

ORIGINALNI TEKST (VALIDIRAN — SVE ČINJENICE SU TAČNE):
${article.content_html}

KONTEKST UTAKMICE:
${m.home} ${m.score_home}-${m.score_away} ${m.away}
Takmičenje: ${m.competition}
Stadion: ${m.venue}

══════════════════════════════════
UREDNIČKA PRAVILA (AP + Reuters + BBC + Economist)
══════════════════════════════════

STRUKTURA:
- Prva rečenica: ${guide.structure.intro.style}
- Primjer LOŠEG uvoda: "${guide.structure.intro.examples.bad}"
- Primjer DOBROG uvoda: "${guide.structure.intro.examples.good}"
- Svaki paragraf max 3 rečenice
- Prosječna dužina rečenice: 15-20 riječi, nikada preko 30

FAKTIČKA DISCIPLINA (Reuters):
- NE DODAJI nijedan novi broj, ime ili činjenicu
- NE BRISI nijedan gol, karton ili ključni događaj
- "Show, don't assume" — LOŠ: "${guide.factual.show_dont_assume.bad}" → DOBAR: "${guide.factual.show_dont_assume.good}"
- Kontekst, ne mišljenje — LOŠ: "${guide.factual.context_not_opinion.bad}" → DOBAR: "${guide.factual.context_not_opinion.good}"

BALANS (BBC):
- Obje ekipe moraju biti zastupljene proporcionalno
- Prva rečenica MORA spomenuti oba tima
- Alternirati perspektive kroz tekst

JASNOĆA (Economist):
- Svaka riječ mora zaraditi svoje mjesto
- Aktivna forma uvijek: "Vinícius je zabio" ne "Gol je postignut"
- Ukloni svaku riječ koja ne dodaje informaciju

SPORTSKO NOVINARSTVO (Al Jazeera + Phil Andrews):
- Uvod mora ZAKAČITI čitaoca — ne samo reći rezultat
- ZABRANJENI KLIŠEJI: ${guide.sports.cliche_ban.join(', ')}
- Koristiti raznolik vokabular za golove: ${guide.sports.vocabulary_enrichment.goal_verbs.join(', ')}
- Koristiti raznolik vokabular za utakmicu: ${guide.sports.vocabulary_enrichment.match_nouns.join(', ')}
- Struktura match reporta: ${guide.sports.match_report_flow.join(' → ')}

GRAMATIKA:
- Ijekavica (ne ekavica)
- Svi dijakritici: š, đ, č, ć, ž
- Pravilna interpunkcija

══════════════════════════════════
KRITIČNO UPOZORENJE
══════════════════════════════════

JEDINO šta smiješ raditi:
- Promijeniti redoslijed rečenica za bolji flow
- Prepisati rečenice za bolji stil (iste činjenice, bolji jezik)
- Dodati tranzicije između paragrafa
- Poboljšati vokabular (raznolikost sinonima)
- Popraviti gramatiku i interpunkciju
- Učiniti uvod atraktivnijim

ZABRANJENO:
- Dodavati nove brojeve koji nisu u originalnom tekstu
- Dodavati nova imena igrača ili timova
- Brisati golove, kartone ili ključne događaje
- Dodavati spekulacije, predikcije ili mišljenja
- Koristiti zabranjene klišeje
- Mijenjati rezultat, minute golova ili statistiku
- Dodavati informacije iz svog znanja
- NIKADA ne spominjati kockanje, klađenje, kvote, kladionice ili bilo kakav sadržaj vezan za kockanje

Vrati SAMO poboljšani HTML tekst. Bez JSON-a. Bez objašnjenja. Samo čisti HTML (<p>, <h2> tagovi).`;

  const result = await callStyleLLM(stylePrompt);

  if (!result) {
    return {
      original_html: article.content_html,
      refined_html: article.content_html,
      changes_made: ['Style refinement failed — using original'],
      style_score: 5,
      tokens_in: 0,
      tokens_out: 0,
    };
  }

  // Detect what changed
  const changes: string[] = [];
  if (result.text !== article.content_html) {
    changes.push('content_html refined');
    const origWords = stripHtml(article.content_html).split(/\s+/).length;
    const refinedWords = stripHtml(result.text).split(/\s+/).length;
    const diff = Math.abs(refinedWords - origWords);
    if (diff > 0) {
      changes.push(`Word count: ${origWords} → ${refinedWords} (${refinedWords > origWords ? '+' : '-'}${diff})`);
    }
  }

  return {
    original_html: article.content_html,
    refined_html: result.text,
    changes_made: changes.length > 0 ? changes : ['No changes detected'],
    style_score: 8,
    tokens_in: result.tokens_in,
    tokens_out: result.tokens_out,
  };
}

// ═══ LLM Caller with Anthropic + OpenAI fallback ═══

interface LLMResult {
  text: string;
  tokens_in: number;
  tokens_out: number;
}

// Response shapes for type safety
interface AnthropicResponse {
  content?: { text?: string }[];
  usage?: { input_tokens?: number; output_tokens?: number };
}

interface OpenAIResponse {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

async function callStyleLLM(prompt: string): Promise<LLMResult | null> {
  // Try Anthropic first
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          temperature: 0.4,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await res.json() as AnthropicResponse;
      let text: string = data.content?.[0]?.text || '';

      // Strip any markdown wrapping
      text = text.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();

      // Must contain HTML tags to be valid
      if (text.includes('<p>') || text.includes('<h2>')) {
        return {
          text,
          tokens_in: data.usage?.input_tokens ?? 0,
          tokens_out: data.usage?.output_tokens ?? 0,
        };
      }

      console.error('[Style Refiner] Anthropic response missing HTML tags');
      return null;
    } catch (e) {
      console.error('[Style Refiner] Anthropic error:', e);
    }
  }

  // Fallback to OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.4,
          max_tokens: 4000,
          messages: [
            { role: 'system', content: 'You are an elite sports editor. Return ONLY refined HTML. No explanations.' },
            { role: 'user', content: prompt },
          ],
        }),
      });

      const data = await res.json() as OpenAIResponse;
      let text: string = data.choices?.[0]?.message?.content || '';
      text = text.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();

      if (text.includes('<p>') || text.includes('<h2>')) {
        return {
          text,
          tokens_in: data.usage?.prompt_tokens ?? 0,
          tokens_out: data.usage?.completion_tokens ?? 0,
        };
      }

      console.error('[Style Refiner] OpenAI response missing HTML tags');
      return null;
    } catch (e) {
      console.error('[Style Refiner] OpenAI error:', e);
    }
  }

  // Fallback to Google Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      systemLog('info', 'ai-engine', 'Style refiner using Gemini fallback').catch(() => {});
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: 'You are an elite sports editor. Return ONLY refined HTML. No explanations.' }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 4000 },
        }),
      });

      const data = await res.json() as GeminiResponse;
      let text: string = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      text = text.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();

      if (text.includes('<p>') || text.includes('<h2>')) {
        return {
          text,
          tokens_in: data.usageMetadata?.promptTokenCount ?? 0,
          tokens_out: data.usageMetadata?.candidatesTokenCount ?? 0,
        };
      }

      console.error('[Style Refiner] Gemini response missing HTML tags');
      return null;
    } catch (e) {
      console.error('[Style Refiner] Gemini error:', e);
    }
  }

  console.error('[Style Refiner] No API key available');
  return null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
