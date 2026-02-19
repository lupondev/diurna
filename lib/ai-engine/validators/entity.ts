import type { NormalizedSnapshot, EntityResult, ValidationError } from '../types';

/**
 * Entity Validator — ensures every player/team name referenced in
 * the article exists in the source data snapshot.
 * Prevents hallucination of non-existent players or wrong team names.
 */
export function validateEntities(
  entitiesUsed: { name: string; id: string; mentions: number }[],
  snapshot: NormalizedSnapshot
): EntityResult {
  const errors: ValidationError[] = [];
  const unmatchedEntities: string[] = [];

  // Build set of valid entity IDs from snapshot
  const validPlayers = new Map(snapshot.data.players.map(p => [p.id, p]));
  const validTeams = new Set([
    snapshot.data.match.home,
    snapshot.data.match.away,
    snapshot.data.match.home_short,
    snapshot.data.match.away_short,
  ]);

  // Also allow competition, venue, referee as valid entity names
  const validMisc = new Set([
    snapshot.data.match.competition,
    snapshot.data.match.venue,
    snapshot.data.match.referee,
  ]);

  for (const entity of entitiesUsed) {
    // Skip team names — always valid
    if (validTeams.has(entity.name)) continue;

    // Skip competition/venue/referee
    if (validMisc.has(entity.name)) continue;

    // Check if entity is a player with valid ID
    if (!validPlayers.has(entity.id)) {
      unmatchedEntities.push(entity.name);
      errors.push({
        type: 'unknown_entity',
        message: `Entitet "${entity.name}" (id: ${entity.id}) ne postoji u izvornim podacima`,
        severity: 'critical',
      });
      continue;
    }

    // Verify entity name roughly matches the player ID
    const player = validPlayers.get(entity.id)!;
    if (!namesMatch(entity.name, player.name)) {
      errors.push({
        type: 'entity_name_mismatch',
        message: `Entitet "${entity.name}" ne odgovara igraču "${player.name}" za ID ${entity.id}`,
        severity: 'warning',
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
 * Fuzzy name matching — handles partial names, accented characters, etc.
 * "Vinícius Júnior" matches "Vinícius" or "Júnior" or "V. Júnior"
 */
function namesMatch(entityName: string, playerName: string): boolean {
  const e = entityName.toLowerCase();
  const p = playerName.toLowerCase();

  // Exact match
  if (e === p) return true;

  // One contains the other
  if (p.includes(e) || e.includes(p)) return true;

  // Check if any part of the player name matches the entity name
  const playerParts = p.split(/\s+/);
  const entityParts = e.split(/\s+/);

  for (const ep of entityParts) {
    if (ep.length <= 2) continue; // Skip initials like "V."
    for (const pp of playerParts) {
      if (pp.includes(ep) || ep.includes(pp)) return true;
    }
  }

  return false;
}
