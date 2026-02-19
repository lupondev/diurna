import type { CDIResult, ToneResult, ToneViolation, ValidationError } from '../types';
import { TONE_FORBIDDEN } from '../cdi';

// Forbidden causality patterns (Bosnian) — AI must not infer motivation
const FORBIDDEN_CAUSALITY = [
  'jer', 'zato što', 'frustriran', 'reagovao na', 'nakon što je dominirao',
  'motivisan', 'ljut', 'razočaran', 'bijesan', 'ponižen',
  'osvetio se', 'dokazao je', 'želio je pokazati',
];

// Forbidden prediction patterns — AI must not speculate about the future
const FORBIDDEN_PREDICTIONS = [
  'će biti', 'očekuje se', 'vjerovatno', 'mogao bi', 'trebao bi',
  'mogli bismo vidjeti', 'naredna utakmica', 'sljedeći korak',
];

/**
 * Tone Validator — ensures the article's language matches the CDI.
 *
 * Rules:
 * 1. CDI-forbidden words cannot appear at the team's tone level
 * 2. Causal language (inferring player motivation) is forbidden
 * 3. Predictions about future events are flagged as warnings
 */
export function validateTone(contentHtml: string, cdi: CDIResult): ToneResult {
  const text = stripHtml(contentHtml).toLowerCase();
  const errors: ValidationError[] = [];
  const violations: ToneViolation[] = [];

  // 1. Check CDI tone enforcement for home team
  const homeForbidden = TONE_FORBIDDEN[cdi.home_tone];
  for (const word of homeForbidden) {
    if (text.includes(word.toLowerCase())) {
      violations.push({
        word,
        cdi_range: cdi.home_tone,
        allowed_range: getRequiredToneForWord(word),
      });
      errors.push({
        type: 'tone_violation',
        message: `Riječ "${word}" zahtijeva CDI rang "${getRequiredToneForWord(word)}", ali domaći tim ima ${cdi.home_tone} ton (CDI: ${cdi.home.toFixed(2)})`,
        severity: 'critical',
      });
    }
  }

  // Check CDI tone enforcement for away team
  const awayForbidden = TONE_FORBIDDEN[cdi.away_tone];
  for (const word of awayForbidden) {
    if (text.includes(word.toLowerCase())) {
      violations.push({
        word,
        cdi_range: cdi.away_tone,
        allowed_range: getRequiredToneForWord(word),
      });
      errors.push({
        type: 'tone_violation',
        message: `Riječ "${word}" zahtijeva CDI rang "${getRequiredToneForWord(word)}", ali gostujući tim ima ${cdi.away_tone} ton (CDI: ${cdi.away.toFixed(2)})`,
        severity: 'critical',
      });
    }
  }

  // 2. Check forbidden causality patterns
  for (const pattern of FORBIDDEN_CAUSALITY) {
    if (text.includes(pattern)) {
      errors.push({
        type: 'causality_violation',
        message: `Zabranjen kauzalni pattern: "${pattern}"`,
        severity: 'critical',
      });
    }
  }

  // 3. Check forbidden predictions
  for (const pattern of FORBIDDEN_PREDICTIONS) {
    if (text.includes(pattern)) {
      errors.push({
        type: 'prediction_violation',
        message: `Zabranjena predikcija: "${pattern}"`,
        severity: 'warning',
      });
    }
  }

  return {
    passed: errors.filter(e => e.severity === 'critical').length === 0,
    errors,
    violations,
  };
}

/**
 * Determine what CDI tone level is required for a given word.
 */
function getRequiredToneForWord(word: string): string {
  if (['demolirao', 'ponizio', 'uništio', 'katastrofalan'].includes(word)) return 'dominant';
  if (['dominantan', 'superioran', 'sveobuhvatan', 'kontrola'].includes(word)) return 'strong+';
  return 'balanced+';
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
