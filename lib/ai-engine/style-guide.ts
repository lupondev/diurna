/**
 * Diurna Editorial Style Guide
 *
 * Combines editorial standards from 5 global institutions:
 * - AP Stylebook — Inverted pyramid structure, precision
 * - Reuters Handbook — No speculation, attribution, show don't assume
 * - BBC Editorial Guidelines — Balance, neutrality, multi-perspective
 * - The Economist Style Guide — Clarity, short sentences, analytical without pretension
 * - Al Jazeera Sports Journalism Guidebook — Grab attention, avoid cliches, critical details
 *
 * This is a structured config used by the prompt-builder and style-refiner.
 */

export const DIURNA_STYLE_GUIDE = {

  // ===== STRUCTURE (AP Stylebook) =====
  structure: {
    intro: {
      rule: 'First sentence answers WHO, WHAT, WHERE, WHEN, HOW MUCH',
      constraint: 'Maximum 25 words. Both teams mentioned. Result included.',
      style: 'Start with the STORY, not the score. What made this match significant?',
      examples: {
        bad: 'Real Madrid pobijedio je Benficu rezultatom 1-0 u prvoj utakmici play-off runde Lige Prvaka.',
        good: 'Vinícius Júnior jednim preciznim udarcem osigurao je Real Madridu prednost na Estádio da Luz u play-off dvoboju Lige Prvaka.',
        why: 'Bad version reads like a scoreboard. Good version tells a story — who was the hero, how it happened, where.',
      },
    },
    second_paragraph: {
      rule: 'Expand the intro with the KEY context that explains WHY this matters',
      constraint: 'No new entities. Deepen the intro, do not repeat it.',
      examples: {
        bad: 'Jedini gol na utakmici postigao je Vinícius Júnior u 67. minuti.',
        good: 'Brazilac je u 67. minuti iskoristio asistenciju Jude Bellinghama i matirao domaćeg golmana, donijevši gostima dragocjenu prednost pred revanš.',
        why: 'Bad version restates the intro. Good version adds HOW (assist), WHAT HAPPENED (matirao golmana), and STAKES (prednost pred revanš).',
      },
    },
    body: {
      rule: 'Chronological flow OR thematic blocks. Never a flat list of events.',
      constraint: 'Each paragraph must have a POINT — not just a fact.',
      technique: 'Group related events. Don\'t write "X happened. Then Y happened." Write paragraphs that MEAN something.',
    },
    closing: {
      rule: 'Final paragraph looks backward (summary) not forward (prediction).',
      constraint: 'No speculation. No "will", "should", "expected to".',
      technique: 'End with a resonant factual detail that sticks with the reader.',
    },
  },

  // ===== FACTUAL DISCIPLINE (Reuters) =====
  factual: {
    attribution: 'Every claim must trace to data. No unsourced assertions.',
    speculation_ban: 'NEVER: "X wanted to prove...", "Y was frustrated...", "Z will likely..."',
    show_dont_assume: {
      bad: 'Benfica je bila frustrirana nedostatkom šansi.',
      good: 'Benfica je u cijeloj utakmici uputila samo 4 udarca u okvir gola.',
      why: 'Bad version ASSUMES emotion. Good version SHOWS the fact that implies it.',
    },
    numbers: 'Always exact. Never "around", "approximately" unless data says so.',
    context_not_opinion: {
      bad: 'To je bio impresivan nastup Real Madrida.',
      good: 'Real Madrid je kontrolirao 55% posjeda i uputio 18 udaraca, sedam u okvir.',
      why: 'Let the numbers tell the reader it was impressive. Don\'t tell them what to think.',
    },
  },

  // ===== BALANCE (BBC) =====
  balance: {
    rule: 'Both teams get proportional coverage. Neither is "hero" or "villain".',
    first_sentence: 'Must mention both teams.',
    perspective: 'Alternate between home and away perspectives throughout.',
    technique: 'After describing what the winning team did, describe what the losing team attempted.',
  },

  // ===== CLARITY (The Economist) =====
  clarity: {
    sentences: 'Average 15-20 words. Never exceed 30 words in a single sentence.',
    vocabulary: 'Use common words. "postigao gol" not "zatresao mrežu" unless it adds meaning.',
    paragraphs: 'Maximum 3 sentences per paragraph. White space is your friend.',
    precision: 'Every word must earn its place. If removing a word doesn\'t change meaning, remove it.',
    active_voice: 'Always prefer active voice. "Vinícius je postigao gol" not "Gol je postignut od strane Viníciusa".',
  },

  // ===== SPORTS-SPECIFIC (Al Jazeera + Phil Andrews) =====
  sports: {
    intro_grab: 'The intro must make the reader want to continue. Not just state the result.',
    cliche_ban: [
      'zatresao mrežu', 'pokazao zube', 'stavio tačku na utakmicu',
      'pružio ruku spasa', 'proigrao šansu', 'maestralna predstava',
      'borba do posljednjeg daha', 'ispustio pobjedu iz ruku',
      'dominirao od prve minute', 'preslišao protivnika',
    ],
    detail_over_general: {
      bad: 'Utakmica je bila zanimljiva s puno prilika.',
      good: 'Benfica je u prvom poluvremenu uputila samo 3 udarca, dok je Real Madrid u drugom dijelu udvostručio pritisak sa 12 pokušaja.',
      why: 'Specific numbers tell a better story than vague descriptions.',
    },
    match_report_flow: [
      '1. HOOK — What is the story of this match? (1 sentence)',
      '2. RESULT — Score, competition, venue (integrated into hook or second sentence)',
      '3. KEY MOMENT — The goal/incident that defined the match (1-2 paragraphs)',
      '4. TACTICAL STORY — How the match unfolded (2 paragraphs, chronological)',
      '5. NUMBERS — Statistical picture woven into narrative (1 paragraph)',
      '6. DISCIPLINE — Cards, injuries, substitutions (1 paragraph if relevant)',
      '7. CLOSE — What this result means in context (1 sentence, no prediction)',
    ],
    vocabulary_enrichment: {
      goal_verbs: ['postigao', 'zabio', 'pogodio', 'matirao golmana', 'uputio loptu u mrežu', 'realizovao'],
      match_nouns: ['utakmica', 'dvoboj', 'susret', 'ogledi', 'duel'],
      win_nouns: ['pobjeda', 'slavlje', 'trijumf', 'uspjeh'],
      loss_nouns: ['poraz', 'neuspjeh', 'gubitak'],
      player_refs: ['igrač', 'napadač', 'veznjak', 'golman', 'defanzivac', 'Brazilac', 'Argentinac'],
    },
  },

  // ===== LANGUAGE QUALITY (GRAMMAR) =====
  grammar: {
    rule: 'Native-level Bosnian/Croatian/Serbian with proper grammar',
    diacritics: 'Always use: š, đ, č, ć, ž — never skip diacritics',
    consistency: 'Pick either ijekavica or ekavica and stick with it. Diurna uses IJEKAVICA.',
    punctuation: 'Proper use of commas before subordinate clauses. No comma splicing.',
    sports_terminology: {
      correct: 'posjed lopte, udarac u okvir, korner, prekršaj, slobodan udarac, jedanaesterac',
      avoid: 'ball possession (English terms mixed into Bosnian text)',
    },
  },
};

// ═══ Structural Rules (Programmatic Checks) ═══

export interface StyleRuleResult {
  passed: boolean;
  detail: string;
}

export const STRUCTURAL_RULES = [
  {
    id: 'inverted_pyramid',
    name: 'Inverted Pyramid',
    check: (html: string): StyleRuleResult => {
      const firstP = html.match(/<p>(.*?)<\/p>/)?.[1] || '';
      const hasNumber = /\d/.test(firstP);
      const wordCount = stripHtml(firstP).split(/\s+/).filter(Boolean).length;
      return {
        passed: hasNumber && wordCount >= 8 && wordCount <= 40,
        detail: hasNumber
          ? `Lead OK: ${wordCount} words with data`
          : `Lead missing: no numbers/result in first paragraph (${wordCount} words)`,
      };
    },
  },
  {
    id: 'paragraph_length',
    name: 'Paragraph Discipline',
    check: (html: string): StyleRuleResult => {
      const paragraphs = html.match(/<p>(.*?)<\/p>/g) || [];
      const violations: string[] = [];
      for (let i = 0; i < paragraphs.length; i++) {
        const text = stripHtml(paragraphs[i]);
        const words = text.split(/\s+/).filter(Boolean).length;
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
        if (words > 70) violations.push(`P${i + 1}: ${words} words (max 70)`);
        if (sentences > 4) violations.push(`P${i + 1}: ${sentences} sentences (max 4)`);
      }
      return {
        passed: violations.length === 0,
        detail: violations.length === 0
          ? `All ${paragraphs.length} paragraphs within limits`
          : violations.join('; '),
      };
    },
  },
  {
    id: 'sentence_variety',
    name: 'Sentence Variety',
    check: (html: string): StyleRuleResult => {
      const text = stripHtml(html);
      const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
      let maxConsecutive = 1;
      let current = 1;
      for (let i = 1; i < sentences.length; i++) {
        const prevFirst = sentences[i - 1].split(/\s+/)[0]?.toLowerCase();
        const currFirst = sentences[i].split(/\s+/)[0]?.toLowerCase();
        if (prevFirst === currFirst && prevFirst) {
          current++;
          maxConsecutive = Math.max(maxConsecutive, current);
        } else {
          current = 1;
        }
      }
      return {
        passed: maxConsecutive <= 2,
        detail: maxConsecutive <= 2
          ? 'Good sentence variety'
          : `${maxConsecutive} consecutive sentences start with same word`,
      };
    },
  },
  {
    id: 'active_voice',
    name: 'Active Voice Preference',
    check: (html: string): StyleRuleResult => {
      const text = stripHtml(html).toLowerCase();
      const passivePatterns = [
        /je\s+bi[oa]\s+\w+[aeiou]n[aoe]?\b/g,
        /su\s+bil[ie]\s+\w+[aeiou]n[ie]?\b/g,
        /je\s+bi[oa]\s+\w+t[aoe]?\b/g,
      ];
      let passiveCount = 0;
      for (const pattern of passivePatterns) {
        const matches = text.match(pattern);
        if (matches) passiveCount += matches.length;
      }
      return {
        passed: passiveCount <= 2,
        detail: passiveCount <= 2
          ? `Active voice OK (${passiveCount} passive constructions)`
          : `${passiveCount} passive constructions found (max 2)`,
      };
    },
  },
  {
    id: 'no_cliches',
    name: 'No Cliches',
    check: (html: string): StyleRuleResult => {
      const text = stripHtml(html).toLowerCase();
      const found = DIURNA_STYLE_GUIDE.sports.cliche_ban.filter(c => text.includes(c));
      return {
        passed: found.length === 0,
        detail: found.length === 0
          ? 'No cliches detected'
          : `Cliches found: ${found.join(', ')}`,
      };
    },
  },
];

// ═══ Helpers ═══

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Run all structural rules against an article.
 */
export function checkStructuralRules(contentHtml: string): {
  passed: boolean;
  results: { rule: string; passed: boolean; detail: string }[];
} {
  const results = STRUCTURAL_RULES.map(rule => {
    const result = rule.check(contentHtml);
    return { rule: rule.id, passed: result.passed, detail: result.detail };
  });
  return {
    passed: results.every(r => r.passed),
    results,
  };
}
