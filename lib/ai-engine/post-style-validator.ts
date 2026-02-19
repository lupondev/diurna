import type { GeneratedArticle, NormalizedSnapshot } from './types';

/**
 * Post-Style Validator — ensures the style refinement pass
 * did NOT introduce hallucinations or alter facts.
 *
 * Compares original (Pass 1) vs refined (Pass 2) article and checks:
 * 1. All numbers from original are preserved in refined
 * 2. All entity names from original are preserved in refined
 * 3. No new numbers were introduced (not in source data)
 * 4. Content length didn't change drastically (±30%)
 * 5. All events referenced in original still appear in refined
 */

export interface PostStyleValidationResult {
  passed: boolean;
  checks: {
    numbers_preserved: CheckResult;
    entities_preserved: CheckResult;
    no_new_numbers: CheckResult;
    length_stable: CheckResult;
    events_preserved: CheckResult;
  };
  recommendation: 'USE_REFINED' | 'USE_ORIGINAL' | 'REVIEW';
}

interface CheckResult {
  passed: boolean;
  detail: string;
}

export function validatePostStyle(
  original: GeneratedArticle,
  refined: GeneratedArticle,
  snapshot: NormalizedSnapshot
): PostStyleValidationResult {
  const origText = stripHtml(original.content_html).toLowerCase();
  const refinedText = stripHtml(refined.content_html).toLowerCase();

  // 1. Numbers preserved
  const numbersPreserved = checkNumbersPreserved(origText, refinedText);

  // 2. Entities preserved
  const entitiesPreserved = checkEntitiesPreserved(origText, refinedText, snapshot);

  // 3. No new numbers introduced
  const noNewNumbers = checkNoNewNumbers(origText, refinedText, snapshot);

  // 4. Length stability
  const lengthStable = checkLengthStability(original.content_html, refined.content_html);

  // 5. Events preserved
  const eventsPreserved = checkEventsPreserved(origText, refinedText, snapshot);

  const allChecks = [numbersPreserved, entitiesPreserved, noNewNumbers, lengthStable, eventsPreserved];
  const criticalFailed = !numbersPreserved.passed || !entitiesPreserved.passed || !noNewNumbers.passed;
  const softFailed = !lengthStable.passed || !eventsPreserved.passed;

  return {
    passed: !criticalFailed,
    checks: {
      numbers_preserved: numbersPreserved,
      entities_preserved: entitiesPreserved,
      no_new_numbers: noNewNumbers,
      length_stable: lengthStable,
      events_preserved: eventsPreserved,
    },
    recommendation: criticalFailed
      ? 'USE_ORIGINAL'
      : softFailed
        ? 'REVIEW'
        : 'USE_REFINED',
  };
}

/**
 * Check that all numbers from the original article appear in the refined version.
 */
function checkNumbersPreserved(origText: string, refinedText: string): CheckResult {
  const origNumbers = extractNumbers(origText);
  const refinedNumbers = new Set(extractNumbers(refinedText));

  const missing: string[] = [];
  for (const num of origNumbers) {
    // Check if the number appears in refined text
    if (!refinedNumbers.has(num) && !refinedText.includes(num)) {
      missing.push(num);
    }
  }

  // Deduplicate
  const uniqueMissing = Array.from(new Set(missing));

  return {
    passed: uniqueMissing.length === 0,
    detail: uniqueMissing.length === 0
      ? `All ${origNumbers.length} numbers preserved`
      : `Missing numbers: ${uniqueMissing.join(', ')}`,
  };
}

/**
 * Check that key entity names from the original appear in the refined version.
 * Uses stem-based matching for Bosnian declension.
 */
function checkEntitiesPreserved(
  origText: string,
  refinedText: string,
  snapshot: NormalizedSnapshot
): CheckResult {
  const d = snapshot.data;
  const keyEntities = [
    d.match.home.toLowerCase(),
    d.match.away.toLowerCase(),
    d.match.home_short.toLowerCase(),
    d.match.away_short.toLowerCase(),
  ];

  // Add goal scorers — these MUST appear
  for (const event of d.events) {
    if (event.type === 'goal') {
      const lastName = event.player_name.split(' ').pop()?.toLowerCase();
      if (lastName && lastName.length > 3) keyEntities.push(lastName);
    }
  }

  // Check each entity that was in original also appears in refined
  const missing: string[] = [];
  for (const entity of keyEntities) {
    if (origText.includes(entity) && !refinedText.includes(entity)) {
      // Try stem match (first 5+ chars)
      const stem = entity.length >= 6 ? entity.substring(0, Math.min(entity.length - 1, 6)) : entity;
      if (!refinedText.includes(stem)) {
        missing.push(entity);
      }
    }
  }

  const uniqueMissing = Array.from(new Set(missing));

  return {
    passed: uniqueMissing.length === 0,
    detail: uniqueMissing.length === 0
      ? 'All key entities preserved'
      : `Missing entities: ${uniqueMissing.join(', ')}`,
  };
}

/**
 * Check that the refined version didn't introduce numbers not present
 * in the original or source data.
 */
function checkNoNewNumbers(
  origText: string,
  refinedText: string,
  snapshot: NormalizedSnapshot
): CheckResult {
  const origNumbers = new Set(extractNumbers(origText));
  const refinedNumbers = extractNumbers(refinedText);
  const allowedNumbers = buildAllowedNumbers(snapshot);

  const newNumbers: string[] = [];
  for (const num of refinedNumbers) {
    if (!origNumbers.has(num) && !allowedNumbers.has(num)) {
      // Exempt years 2020-2030 and single digits
      const n = parseInt(num, 10);
      if (!isNaN(n) && ((n >= 2020 && n <= 2030) || (n >= 0 && n <= 10))) continue;
      newNumbers.push(num);
    }
  }

  const uniqueNew = Array.from(new Set(newNumbers));

  return {
    passed: uniqueNew.length === 0,
    detail: uniqueNew.length === 0
      ? 'No new numbers introduced'
      : `New numbers found: ${uniqueNew.join(', ')}`,
  };
}

/**
 * Check that content length didn't change drastically (±30%).
 */
function checkLengthStability(origHtml: string, refinedHtml: string): CheckResult {
  const origWords = stripHtml(origHtml).split(/\s+/).filter(Boolean).length;
  const refinedWords = stripHtml(refinedHtml).split(/\s+/).filter(Boolean).length;

  const ratio = origWords > 0 ? refinedWords / origWords : 1;
  const percentChange = Math.round(Math.abs(ratio - 1) * 100);

  return {
    passed: ratio >= 0.7 && ratio <= 1.3,
    detail: `Original: ${origWords} words, Refined: ${refinedWords} words (${ratio > 1 ? '+' : ''}${percentChange}%)`,
  };
}

/**
 * Check that events mentioned in original are still mentioned in refined.
 */
function checkEventsPreserved(
  origText: string,
  refinedText: string,
  snapshot: NormalizedSnapshot
): CheckResult {
  const d = snapshot.data;
  const missing: string[] = [];

  for (const event of d.events) {
    if (event.weight < 3) continue; // Only check important events

    const lastName = event.player_name.split(' ').pop()?.toLowerCase();
    if (!lastName || lastName.length <= 3) continue;

    // If player was mentioned in original, should be in refined
    const stem = lastName.length >= 6 ? lastName.substring(0, Math.min(lastName.length - 1, 6)) : lastName;
    const inOrig = origText.includes(lastName) || origText.includes(stem);
    const inRefined = refinedText.includes(lastName) || refinedText.includes(stem);

    if (inOrig && !inRefined) {
      missing.push(`${event.type}: ${event.player_name} (${event.minute}')`);
    }
  }

  return {
    passed: missing.length === 0,
    detail: missing.length === 0
      ? 'All important events preserved'
      : `Missing events: ${missing.join('; ')}`,
  };
}

// ═══ Helpers ═══

function extractNumbers(text: string): string[] {
  const matches = text.match(/\d+(?:[.,]\d+)?/g) || [];
  return matches;
}

function buildAllowedNumbers(snapshot: NormalizedSnapshot): Set<string> {
  const nums = new Set<string>();
  const d = snapshot.data;

  nums.add(`${d.match.score_home}`);
  nums.add(`${d.match.score_away}`);
  if (d.match.attendance) nums.add(`${d.match.attendance}`);

  nums.add(`${d.stats.possession_home}`);
  nums.add(`${d.stats.possession_away}`);
  nums.add(`${d.stats.shots_home}`);
  nums.add(`${d.stats.shots_away}`);
  nums.add(`${d.stats.shots_on_target_home}`);
  nums.add(`${d.stats.shots_on_target_away}`);
  if (d.stats.xg_home !== null) nums.add(`${d.stats.xg_home}`);
  if (d.stats.xg_away !== null) nums.add(`${d.stats.xg_away}`);
  nums.add(`${d.stats.corners_home}`);
  nums.add(`${d.stats.corners_away}`);
  nums.add(`${d.stats.fouls_home}`);
  nums.add(`${d.stats.fouls_away}`);
  nums.add(`${d.stats.yellow_cards_home}`);
  nums.add(`${d.stats.yellow_cards_away}`);
  nums.add(`${d.stats.red_cards_home}`);
  nums.add(`${d.stats.red_cards_away}`);

  for (const e of d.events) {
    nums.add(`${e.minute}`);
    if (e.added_time) nums.add(`${e.added_time}`);
  }

  for (const p of d.players) {
    if (p.rating !== null) nums.add(`${p.rating}`);
    nums.add(`${p.goals}`);
    nums.add(`${p.assists}`);
    nums.add(`${p.minutes_played}`);
    nums.add(`${p.age}`);
  }

  return nums;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
