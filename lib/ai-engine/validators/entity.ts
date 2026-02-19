import type { NormalizedSnapshot, EntityResult, ValidationError } from '../types';

/**
 * Entity Validator — extracts player/team names from article HTML
 * and checks each one exists in the source data snapshot.
 * Prevents hallucination of non-existent players or wrong team names.
 *
 * Strategy: Build a set of all known name stems from the snapshot,
 * then only flag names that don't fuzzy-match ANY known entity.
 * Uses stem-based matching to handle Bosnian declension.
 */
export function validateEntities(
  contentHtml: string,
  snapshot: NormalizedSnapshot
): EntityResult {
  const errors: ValidationError[] = [];
  const unmatchedEntities: string[] = [];
  const text = stripHtml(contentHtml);

  // Build all known name stems from snapshot (min 4 chars)
  const knownStems = new Set<string>();

  // Team names + declension stems
  addStems(knownStems, snapshot.data.match.home);
  addStems(knownStems, snapshot.data.match.away);
  addStems(knownStems, snapshot.data.match.home_short);
  addStems(knownStems, snapshot.data.match.away_short);

  // Competition, venue, referee — add all word parts
  addStems(knownStems, snapshot.data.match.competition);
  addStems(knownStems, snapshot.data.match.venue);
  addStems(knownStems, snapshot.data.match.referee);

  // All player names
  for (const p of snapshot.data.players) {
    addStems(knownStems, p.name);
    // Also add nationality as valid context word
    if (p.nationality) addStems(knownStems, p.nationality);
  }

  // Extract multi-word capitalized sequences from text (potential person names)
  // Only flag multi-word names (First Last) as these are most likely person names
  const multiWordNamePattern = /[A-ZÁÉÍÓÚÜÑČĆŠŽĐ][a-záéíóúüñčćšžđ]{2,}(?:\s+[A-ZÁÉÍÓÚÜÑČĆŠŽĐ][a-záéíóúüñčćšžđ]{2,})+/g;
  const foundNames = new Set<string>();
  let match;
  while ((match = multiWordNamePattern.exec(text)) !== null) {
    foundNames.add(match[0]);
  }

  for (const name of Array.from(foundNames)) {
    // Check if ALL significant parts of this name match known stems
    const parts = name.toLowerCase().split(/\s+/).filter(p => p.length >= 4);
    if (parts.length === 0) continue;

    // A name is valid if at least one significant part matches a known stem
    const hasKnownPart = parts.some(part => matchesStem(part, knownStems));

    if (!hasKnownPart) {
      unmatchedEntities.push(name);
      errors.push({
        type: 'unknown_entity',
        message: `Ime "${name}" nije pronađeno u izvornim podacima`,
        severity: 'critical',
      });
    }
  }

  return {
    passed: errors.filter(e => e.severity === 'critical').length === 0,
    errors,
    unmatched_entities: unmatchedEntities,
  };
}

/**
 * Add all stems (min 4 chars) from a name string to the set.
 * Stems are the first 4+ characters of each word — handles Bosnian declension.
 * "Benfica" → stems: "benf", "benfi", "benfic", "benfica"
 */
function addStems(set: Set<string>, name: string): void {
  const words = name.toLowerCase().split(/\s+/);
  for (const word of words) {
    if (word.length < 4) continue;
    // Add progressively longer stems
    for (let len = 4; len <= word.length; len++) {
      set.add(word.substring(0, len));
    }
  }
}

/**
 * Check if a word (from article text) matches any known stem.
 * The word's own stems are generated and checked against the known set.
 */
function matchesStem(word: string, knownStems: Set<string>): boolean {
  if (word.length < 4) return false;
  // Check progressive stems of this word
  for (let len = Math.min(word.length, 8); len >= 4; len--) {
    if (knownStems.has(word.substring(0, len))) return true;
  }
  return false;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
