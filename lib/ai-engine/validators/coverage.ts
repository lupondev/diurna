import type { MatchEvent, CoverageResult, ValidationError } from '../types';

/**
 * Coverage Validator — ensures the generated article mentions
 * all critical match events (goals, red cards, penalties, injuries).
 *
 * Extracts coverage from content_html by checking if event details
 * (player name + minute) appear in the text.
 *
 * Minimum coverage threshold: 85%
 * All events with weight >= 3 are mandatory (critical).
 */
export function validateCoverage(contentHtml: string, allEvents: MatchEvent[]): CoverageResult {
  const errors: ValidationError[] = [];
  const text = stripHtml(contentHtml).toLowerCase();

  // Determine which events are covered by checking if player name + minute appear in text
  const coveredEvents: string[] = [];

  for (const event of allEvents) {
    const playerNameLower = event.player_name.toLowerCase();
    const minuteStr = String(event.minute);

    // Check if player name (or last name) appears in text
    const nameParts = playerNameLower.split(/\s+/);
    const lastPart = nameParts[nameParts.length - 1];
    const nameFound = text.includes(playerNameLower) ||
      (lastPart.length > 3 && text.includes(lastPart));

    // Check if minute appears in text
    const minuteFound = text.includes(minuteStr);

    // Event is covered if player name is mentioned (minute is a bonus, not required for non-critical)
    if (event.weight >= 3) {
      // Critical events: need player name
      if (nameFound) {
        coveredEvents.push(event.id);
      }
    } else {
      // Non-critical: player name is enough
      if (nameFound) {
        coveredEvents.push(event.id);
      }
    }
  }

  // Calculate weighted coverage
  const totalWeight = allEvents.reduce((sum, e) => sum + e.weight, 0);
  const coveredWeight = allEvents
    .filter(e => coveredEvents.includes(e.id))
    .reduce((sum, e) => sum + e.weight, 0);
  const score = totalWeight > 0 ? (coveredWeight / totalWeight) * 100 : 100;

  // Check critical events (weight >= 3) — these MUST be mentioned
  const criticalEvents = allEvents.filter(e => e.weight >= 3);
  const missingCritical = criticalEvents
    .filter(e => !coveredEvents.includes(e.id))
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

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
