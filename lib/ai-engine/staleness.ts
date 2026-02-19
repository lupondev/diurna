import type { ArticleType } from './types';

export interface StalenessResult {
  status: 'OK' | 'WARN' | 'REJECT';
  disclaimer: string | null;
  age_seconds: number;
  window_seconds: number;
}

/** Maximum freshness windows per article type (in seconds) */
const FRESHNESS_WINDOWS: Record<ArticleType, number> = {
  match_report: 30 * 60,        // 30 minutes
  preview: 6 * 3600,            // 6 hours
  tactical_analysis: 2 * 3600,  // 2 hours
  transfer: 6 * 3600,           // 6 hours
  historical_recap: 24 * 3600,  // 24 hours
};

/**
 * Check if a data snapshot is still fresh enough for the given article type.
 *
 * - OK: Data is within freshness window
 * - WARN: Data is stale (1x-2x window) — article gets disclaimer
 * - REJECT: Data is too old (>2x window) — refuse to generate
 */
export function checkStaleness(snapshotTimestamp: string, articleType: ArticleType): StalenessResult {
  const age = (Date.now() - new Date(snapshotTimestamp).getTime()) / 1000;
  const window = FRESHNESS_WINDOWS[articleType];

  if (age > window * 2) {
    return { status: 'REJECT', disclaimer: null, age_seconds: age, window_seconds: window };
  }
  if (age > window) {
    return {
      status: 'WARN',
      disclaimer: 'Podaci su bazirani na dostupnim informacijama u trenutku završetka utakmice.',
      age_seconds: age,
      window_seconds: window,
    };
  }
  return { status: 'OK', disclaimer: null, age_seconds: age, window_seconds: window };
}
