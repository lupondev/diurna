import type { NormalizedSnapshot, ValidationResult, ValidationError } from '../types';

/**
 * Numeric Validator — ensures every number in the generated article
 * can be traced back to the source data snapshot.
 * Prevents AI hallucination of statistics.
 */
export function validateNumbers(contentHtml: string, snapshot: NormalizedSnapshot): ValidationResult {
  const text = stripHtml(contentHtml);
  const errors: ValidationError[] = [];

  // Build allowed numbers set from snapshot data
  const allowedNumbers = buildAllowedNumbers(snapshot);

  // Find all numbers in text
  const foundNumbers = extractNumbers(text);

  // Check each found number against allowed set
  for (const found of foundNumbers) {
    if (!isNumberAllowed(found.value, allowedNumbers) && !isExemptNumber(found)) {
      errors.push({
        type: 'numeric_mismatch',
        message: `Broj "${found.raw}" nije pronađen u izvornim podacima`,
        severity: 'critical',
        context: found.surrounding,
      });
    }
  }

  return { passed: errors.length === 0, errors };
}

/**
 * Build a set of all valid numbers from the snapshot data.
 * Includes scores, stats, event minutes, player ages, ratings, etc.
 */
function buildAllowedNumbers(snapshot: NormalizedSnapshot): Set<number> {
  const nums = new Set<number>();
  const d = snapshot.data;

  // Match score
  nums.add(d.match.score_home);
  nums.add(d.match.score_away);
  if (d.match.attendance !== null) nums.add(d.match.attendance);

  // Stats — add all numeric stat values
  const statsObj = d.stats;
  for (const key of Object.keys(statsObj) as (keyof typeof statsObj)[]) {
    const v = statsObj[key];
    if (typeof v === 'number') nums.add(v);
  }

  // Events — minutes and added time
  for (const e of d.events) {
    nums.add(e.minute);
    if (e.added_time !== null) nums.add(e.added_time);
  }

  // Players — age, rating, goals, assists, minutes, cards
  for (const p of d.players) {
    nums.add(p.age);
    if (p.rating !== null) {
      nums.add(p.rating);
      nums.add(Math.round(p.rating * 10) / 10);
    }
    nums.add(p.goals);
    nums.add(p.assists);
    nums.add(p.minutes_played);
    nums.add(p.yellow_cards);
    nums.add(p.red_cards);
  }

  // Standings
  if (d.standings) {
    if (d.standings.home_position !== null) nums.add(d.standings.home_position);
    if (d.standings.away_position !== null) nums.add(d.standings.away_position);
  }

  return nums;
}

/**
 * Check if a number is allowed, with tolerance for floating point.
 */
function isNumberAllowed(value: number, allowed: Set<number>): boolean {
  if (allowed.has(value)) return true;
  // Check with small tolerance for floats (e.g., 8.2 vs 8.19999)
  const arr = Array.from(allowed);
  for (let i = 0; i < arr.length; i++) {
    if (Math.abs(arr[i] - value) < 0.05) return true;
  }
  return false;
}

/**
 * Extract all numbers from plain text with their surrounding context.
 */
function extractNumbers(text: string): Array<{ value: number; raw: string; surrounding: string }> {
  const results: Array<{ value: number; raw: string; surrounding: string }> = [];
  const regex = /\d+\.?\d*/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const value = parseFloat(match[0]);
    if (isNaN(value)) continue;
    const start = Math.max(0, match.index - 30);
    const end = Math.min(text.length, match.index + match[0].length + 30);
    results.push({
      value,
      raw: match[0],
      surrounding: text.slice(start, end),
    });
  }
  return results;
}

/**
 * Numbers exempt from validation:
 * - Years (2020-2030)
 * - Small ordinals (1, 2) that are common in language
 */
function isExemptNumber(found: { value: number; raw: string; surrounding: string }): boolean {
  // Years
  if (found.value >= 2020 && found.value <= 2030) return true;
  // Small ordinals used in language (e.g., "1. poluvrijeme", "2. gol")
  if (found.raw.length === 1 && found.value <= 2) return true;
  return false;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
