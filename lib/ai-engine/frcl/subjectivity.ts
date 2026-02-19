import type { ValidationError } from '../types';

// Bosnian subjectivity lexicon — handcrafted, NOT LLM-generated
const SUBJECTIVITY_LEXICON: Record<string, number> = {
  // Weight 3 — HIGH RISK
  'demolirao': 3, 'ponizio': 3, 'katastrofalan': 3, 'skandalozan': 3,
  'sramotan': 3, 'žalostan': 3, 'bijedan': 3, 'uništio': 3,
  'masakr': 3, 'debakl': 3, 'fijasko': 3, 'nokaut': 3,

  // Weight 2 — MEDIUM RISK
  'dominantan': 2, 'dramatičan': 2, 'šokantan': 2, 'zasluženo': 2,
  'nezasluženo': 2, 'klinički': 2, 'haotičan': 2, 'bijesan': 2,
  'frustriran': 2, 'jalovo': 2, 'bezidejno': 2, 'briljantno': 2,
  'maestralno': 2, 'fenomenalno': 2, 'spektakularno': 2,
  'superioran': 2, 'inferioran': 2, 'bespomoćan': 2,

  // Weight 1 — LOW RISK (monitor)
  'impresivan': 1, 'solidan': 1, 'razočaravajuć': 1, 'uvjerljiv': 1,
  'dinamičan': 1, 'intenzivan': 1, 'neizvjestan': 1, 'zanimljiv': 1,
  'atraktivan': 1, 'efikasan': 1, 'precizan': 1, 'hrabar': 1,
};

export interface SubjectivityResult {
  score: number;
  passed: boolean;
  flagged_words: Array<{ word: string; weight: number; context: string }>;
  recommendation: 'PASS' | 'REVIEW' | 'BLOCK';
}

export function calculateSubjectivityScore(html: string): SubjectivityResult {
  const text = stripHtml(html).toLowerCase();
  const words = text.split(/\s+/);
  let weightedMatches = 0;
  const flagged: Array<{ word: string; weight: number; context: string }> = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^a-zšđčćž]/gi, '');
    if (!word) continue;
    // Check exact match and stem-like matching
    for (const [term, weight] of Object.entries(SUBJECTIVITY_LEXICON)) {
      const stemLen = Math.min(term.length, 6);
      if (word.startsWith(term.substring(0, stemLen))) {
        weightedMatches += weight;
        const contextStart = Math.max(0, i - 3);
        const contextEnd = Math.min(words.length, i + 4);
        flagged.push({
          word: words[i],
          weight,
          context: words.slice(contextStart, contextEnd).join(' '),
        });
        break;
      }
    }
  }

  const score = words.length > 0 ? weightedMatches / words.length : 0;

  return {
    score: Math.round(score * 10000) / 10000,
    passed: score <= 0.018,
    flagged_words: flagged,
    recommendation: score > 0.025 ? 'BLOCK' : score > 0.018 ? 'REVIEW' : 'PASS',
  };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
