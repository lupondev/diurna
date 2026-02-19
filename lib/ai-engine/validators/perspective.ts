import type { NormalizedSnapshot } from '../types';

export interface PerspectiveResult {
  home_mentions: number;
  away_mentions: number;
  ratio: number;
  first_sentence_neutral: boolean;
  passed: boolean;
  recommendation: 'PASS' | 'REVIEW' | 'BLOCK';
}

export function checkPerspectiveBalance(
  contentHtml: string,
  snapshot: NormalizedSnapshot
): PerspectiveResult {
  const text = stripHtml(contentHtml).toLowerCase();
  const m = snapshot.data.match;

  // Count home team mentions (team name + short code + player last names)
  const homePlayers = snapshot.data.players.filter(p => p.team === 'home').map(p => p.name.toLowerCase());
  const awayPlayers = snapshot.data.players.filter(p => p.team === 'away').map(p => p.name.toLowerCase());

  let homeMentions = countOccurrences(text, m.home.toLowerCase()) + countOccurrences(text, m.home_short.toLowerCase());
  let awayMentions = countOccurrences(text, m.away.toLowerCase()) + countOccurrences(text, m.away_short.toLowerCase());

  // Add player name mentions
  for (const name of homePlayers) {
    const lastName = name.split(' ').pop() || name;
    if (lastName.length > 3) homeMentions += countOccurrences(text, lastName);
  }
  for (const name of awayPlayers) {
    const lastName = name.split(' ').pop() || name;
    if (lastName.length > 3) awayMentions += countOccurrences(text, lastName);
  }

  const total = homeMentions + awayMentions;
  const ratio = total > 0 ? Math.min(homeMentions, awayMentions) / Math.max(homeMentions, awayMentions) : 1;

  // Check first sentence — should mention both teams (or result)
  const firstSentence = text.split(/[.!?]/)[0] || '';
  const firstHome = firstSentence.includes(m.home.toLowerCase()) || firstSentence.includes(m.home_short.toLowerCase());
  const firstAway = firstSentence.includes(m.away.toLowerCase()) || firstSentence.includes(m.away_short.toLowerCase());
  const firstNeutral = firstHome && firstAway;

  return {
    home_mentions: homeMentions,
    away_mentions: awayMentions,
    ratio: Math.round(ratio * 100) / 100,
    first_sentence_neutral: firstNeutral,
    passed: ratio >= 0.4 && firstNeutral,
    recommendation: ratio < 0.3 ? 'BLOCK' : ratio < 0.4 ? 'REVIEW' : 'PASS',
  };
}

function countOccurrences(text: string, term: string): number {
  if (!term || term.length < 2) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(term, pos)) !== -1) {
    count++;
    pos += term.length;
  }
  return count;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
