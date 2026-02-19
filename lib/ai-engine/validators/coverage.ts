import type { MatchEvent, CoverageResult, ValidationError } from '../types';

/**
 * Coverage Validator — ensures the generated article mentions
 * all critical match events (goals, red cards, penalties, injuries).
 *
 * Uses event weights to calculate a coverage score:
 * - goal: 5, red_card: 4, penalty: 4, injury: 3, tactical_change: 3
 * - yellow_card: 2, substitution: 1
 *
 * Minimum coverage threshold: 85%
 * All events with weight >= 3 are mandatory (critical).
 */
export function validateCoverage(eventsCovered: string[], allEvents: MatchEvent[]): CoverageResult {
  const errors: ValidationError[] = [];

  // Calculate weighted coverage
  const totalWeight = allEvents.reduce((sum, e) => sum + e.weight, 0);
  const coveredWeight = allEvents
    .filter(e => eventsCovered.includes(e.id))
    .reduce((sum, e) => sum + e.weight, 0);
  const score = totalWeight > 0 ? (coveredWeight / totalWeight) * 100 : 100;

  // Check critical events (weight >= 3) — these MUST be mentioned
  const criticalEvents = allEvents.filter(e => e.weight >= 3);
  const missingCritical = criticalEvents
    .filter(e => !eventsCovered.includes(e.id))
    .map(e => e.id);

  if (missingCritical.length > 0) {
    for (const id of missingCritical) {
      const event = allEvents.find(e => e.id === id);
      if (!event) continue;
      errors.push({
        type: 'missing_critical_event',
        message: `Kritični događaj nije spomenut: ${event.type} (${event.player_name}, ${event.minute}')`,
        severity: 'critical',
        context: event.id,
      });
    }
  }

  if (score < 85) {
    errors.push({
      type: 'low_coverage',
      message: `Coverage score ${score.toFixed(1)}% je ispod minimuma od 85%`,
      severity: 'critical',
    });
  }

  return {
    passed: errors.length === 0,
    errors,
    score: Math.round(score * 10) / 10,
    missing_critical: missingCritical,
  };
}
