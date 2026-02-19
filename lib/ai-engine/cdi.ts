import type { MatchStats, CDIResult, ToneLevel } from './types';

const CDI_WEIGHTS = {
  goals: 0.45,
  xg: 0.20,
  shots_on_target: 0.15,
  possession: 0.10,
  dangerous_attacks: 0.10,
};

/**
 * Calculate Contextual Dominance Index (CDI) for a match.
 * Returns a value between 0-1 for each team, where higher = more dominant.
 * The CDI drives tone enforcement in generated articles.
 */
export function calculateCDI(stats: MatchStats, scoreHome: number, scoreAway: number): CDIResult {
  let totalWeight = 0;
  let homeWeighted = 0;

  // Goals (45% weight)
  const totalGoals = scoreHome + scoreAway;
  if (totalGoals > 0) {
    homeWeighted += CDI_WEIGHTS.goals * (scoreHome / totalGoals);
    totalWeight += CDI_WEIGHTS.goals;
  }

  // xG (20% weight)
  if (stats.xg_home !== null && stats.xg_away !== null) {
    const totalXg = stats.xg_home + stats.xg_away;
    if (totalXg > 0) {
      homeWeighted += CDI_WEIGHTS.xg * (stats.xg_home / totalXg);
      totalWeight += CDI_WEIGHTS.xg;
    }
  }

  // Shots on target (15% weight)
  const totalSot = stats.shots_on_target_home + stats.shots_on_target_away;
  if (totalSot > 0) {
    homeWeighted += CDI_WEIGHTS.shots_on_target * (stats.shots_on_target_home / totalSot);
    totalWeight += CDI_WEIGHTS.shots_on_target;
  }

  // Possession (10% weight)
  const totalPoss = stats.possession_home + stats.possession_away;
  if (totalPoss > 0) {
    homeWeighted += CDI_WEIGHTS.possession * (stats.possession_home / totalPoss);
    totalWeight += CDI_WEIGHTS.possession;
  }

  // Dangerous attacks (10% weight)
  if (stats.dangerous_attacks_home !== null && stats.dangerous_attacks_away !== null) {
    const totalDa = stats.dangerous_attacks_home + stats.dangerous_attacks_away;
    if (totalDa > 0) {
      homeWeighted += CDI_WEIGHTS.dangerous_attacks * (stats.dangerous_attacks_home / totalDa);
      totalWeight += CDI_WEIGHTS.dangerous_attacks;
    }
  }

  // Normalize: redistribute missing metric weights proportionally
  const homeCDI = totalWeight > 0 ? homeWeighted / totalWeight : 0.5;
  const awayCDI = 1 - homeCDI;

  return {
    home: Math.round(homeCDI * 100) / 100,
    away: Math.round(awayCDI * 100) / 100,
    home_tone: getToneLevel(homeCDI),
    away_tone: getToneLevel(awayCDI),
  };
}

function getToneLevel(cdi: number): ToneLevel {
  if (cdi >= 0.85) return 'dominant';
  if (cdi >= 0.65) return 'strong';
  if (cdi >= 0.40) return 'balanced';
  return 'neutral';
}

// Adjective enforcement maps — allowed words per tone level
export const TONE_ALLOWED: Record<ToneLevel, string[]> = {
  neutral: ['neutralan', 'ravnopravan', 'ujednačen'],
  balanced: ['blaga prednost', 'nešto bolji', 'aktivniji', 'neznatno bolji'],
  strong: ['kontrolirao', 'snažan', 'impresivan', 'uvjerljiv', 'nadmoćniji'],
  dominant: ['dominantan', 'superioran', 'sveobuhvatan', 'potpuna kontrola'],
};

// Words forbidden at each tone level (cannot use these if CDI is at this level)
export const TONE_FORBIDDEN: Record<ToneLevel, string[]> = {
  neutral: ['dominantan', 'kontrola', 'superioran', 'demolirao', 'ponizio', 'uništio'],
  balanced: ['dominantan', 'superioran', 'demolirao', 'ponizio', 'uništio'],
  strong: ['demolirao', 'ponizio', 'uništio', 'katastrofalan'],
  dominant: [],
};
