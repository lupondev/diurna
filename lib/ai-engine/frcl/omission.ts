import type { MatchEvent } from '../types';

export interface OmissionResult {
  omission_risk: number;
  passed: boolean;
  missing_events: string[];
  recommendation: 'PASS' | 'BLOCK';
}

export function checkOmissionBias(
  contentHtml: string,
  allEvents: MatchEvent[]
): OmissionResult {
  const text = stripHtml(contentHtml).toLowerCase();

  // Calculate importance for each event (weight >= 2)
  const ranked = allEvents
    .filter(e => e.weight >= 2)
    .map(e => ({
      ...e,
      importance: e.weight * (e.minute <= 30 ? 1.0 : e.minute <= 75 ? 1.1 : 1.3),
    }))
    .sort((a, b) => b.importance - a.importance);

  // Find top 60% cumulative importance events
  const totalImportance = ranked.reduce((s, e) => s + e.importance, 0);
  let cumulative = 0;
  const mustMention: typeof ranked = [];

  for (const event of ranked) {
    cumulative += event.importance;
    mustMention.push(event);
    if (cumulative / totalImportance >= 0.60) break;
  }

  // Check which must-mention events appear in text
  const missing = mustMention.filter(e => {
    const playerLastName = e.player_name.split(' ').pop()?.toLowerCase() || '';
    return !text.includes(e.player_name.toLowerCase()) &&
      !(playerLastName.length > 3 && text.includes(playerLastName));
  });

  return {
    omission_risk: mustMention.length > 0 ? missing.length / mustMention.length : 0,
    passed: missing.length === 0,
    missing_events: missing.map(e => `${e.type}: ${e.player_name} (${e.minute}')`),
    recommendation: missing.length > 0 ? 'BLOCK' : 'PASS',
  };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
