import type { NormalizedSnapshot, CDIResult, GeneratedArticle, MasterValidationResult } from '../types';
import { validateNumbers } from './numeric';
import { validateCoverage } from './coverage';
import { validateTone } from './tone';
import { validateEntities } from './entity';

/**
 * Master Validation Pipeline — runs all 4 validators on a generated article.
 *
 * Validators extract data from content_html directly:
 * 1. Numeric — every number must trace to source data
 * 2. Coverage — all critical events must be mentioned (extracted from text)
 * 3. Tone — language must match CDI (no "dominantan" for balanced matches)
 * 4. Entity — every name in text must exist in source data (extracted from text)
 *
 * Now language-aware: passes language code to tone validator for variant checking.
 *
 * If any validator fails, retry_instructions are generated for the LLM.
 */
export function validateArticle(
  article: GeneratedArticle,
  snapshot: NormalizedSnapshot,
  cdi: CDIResult,
  languageCode: string = 'bs'
): MasterValidationResult {
  const numeric = validateNumbers(article.content_html, snapshot);
  const coverage = validateCoverage(article.content_html, snapshot.data.events);
  const tone = validateTone(article.content_html, cdi, languageCode);
  const entity = validateEntities(article.content_html, snapshot);

  const passed = numeric.passed && coverage.passed && tone.passed && entity.passed;

  let retry_instructions: string | null = null;
  if (!passed) {
    const allErrors = [
      ...numeric.errors.map(e => `[BROJ] ${e.message}`),
      ...coverage.errors.map(e => `[POKRIVENOST] ${e.message}`),
      ...tone.errors.map(e => `[TON] ${e.message}`),
      ...entity.errors.map(e => `[ENTITET] ${e.message}`),
    ];
    retry_instructions = [
      'PRETHODNI POKUŠAJ ODBIJEN. GREŠKE:',
      ...allErrors,
      '',
      'ISPRAVI SVE GREŠKE:',
      '- Ne dodaji nove brojeve koji nisu u izvornim podacima.',
      '- Ne koristi zabranjene riječi za ovaj CDI nivo.',
      '- Ne koristi termine iz pogrešne jezičke varijante.',
      '- Spomeni sve kritične događaje (golovi, crveni kartoni, penali).',
      '- Ne spominji igrače koji nisu u izvornim podacima.',
    ].join('\n');
  }

  return { passed, numeric, coverage, tone, entity, retry_instructions };
}

// Re-export individual validators for direct usage
export { validateNumbers } from './numeric';
export { validateCoverage } from './coverage';
export { validateTone } from './tone';
export { validateEntities } from './entity';
