import type { NormalizedSnapshot, CDIResult, ValidationResult } from './types';
import { validateNumbers } from './validators/numeric';
import { validateTone } from './validators/tone';

/**
 * Post-Style Validator — ensures the style refinement pass
 * did NOT introduce hallucinations or alter facts.
 *
 * Compares original HTML vs refined HTML and checks:
 * 1. Numeric validation on refined text (all numbers must trace to source)
 * 2. Tone validation on refined text (CDI + language variant rules)
 * 3. All key events still present (goal scorers, red cards)
 * 4. Critical numbers preserved (scores, goal minutes)
 */

export interface PostStyleValidation {
  passed: boolean;
  numeric: ValidationResult;
  tone: ValidationResult;
  events_preserved: boolean;
  numbers_preserved: boolean;
}

export function validatePostStyle(
  originalHtml: string,
  refinedHtml: string,
  snapshot: NormalizedSnapshot,
  cdi: CDIResult,
  languageCode: string = 'bs'
): PostStyleValidation {
  // 1. Numeric validation on refined text
  const numeric = validateNumbers(refinedHtml, snapshot);

  // 2. Tone validation on refined text
  const tone = validateTone(refinedHtml, cdi, languageCode);

  // 3. Check that all key events are still present
  const events = snapshot.data.events.filter(e => e.weight >= 3);
  const refinedText = stripHtml(refinedHtml).toLowerCase();

  const eventsPreserved = events.every(e => {
    const fullName = e.player_name.toLowerCase();
    const lastName = e.player_name.split(' ').pop()?.toLowerCase() || '';
    return refinedText.includes(fullName) || refinedText.includes(lastName);
  });

  // 4. Check that critical numbers are preserved
  const criticalNumbers = [
    snapshot.data.match.score_home,
    snapshot.data.match.score_away,
    ...events.map(e => e.minute),
  ];

  const numbersPreserved = criticalNumbers.every(num => {
    return refinedText.includes(String(num));
  });

  return {
    passed: numeric.passed && tone.passed && eventsPreserved && numbersPreserved,
    numeric,
    tone,
    events_preserved: eventsPreserved,
    numbers_preserved: numbersPreserved,
  };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
