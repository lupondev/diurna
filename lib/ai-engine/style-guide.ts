/**
 * Style Guide — Editorial standards inspired by AP, Reuters, BBC, Economist, Al Jazeera.
 * Adapted for Bosnian-language sports journalism.
 *
 * This module provides:
 * 1. Structural rules (inverted pyramid, paragraph length, lead formula)
 * 2. Vocabulary enrichment maps (common word → richer alternatives)
 * 3. Sentence-level guidelines (active voice, concision, rhythm)
 * 4. Bosnian-specific conventions (number formatting, name formatting)
 */

// ═══ Structural Rules ═══

export interface StyleRule {
  id: string;
  name: string;
  description: string;
  check: (html: string) => StyleRuleResult;
}

export interface StyleRuleResult {
  passed: boolean;
  detail: string;
}

export const STRUCTURAL_RULES: StyleRule[] = [
  {
    id: 'inverted_pyramid',
    name: 'Inverted Pyramid',
    description: 'Lead paragraph must contain the most important information (result + key event)',
    check: (html: string) => {
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
    description: 'Each paragraph should be 2-3 sentences, max 60 words',
    check: (html: string) => {
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
    description: 'No more than 2 consecutive sentences starting with the same word',
    check: (html: string) => {
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
    description: 'Minimize passive constructions (je bio/bila/bilo + past participle)',
    check: (html: string) => {
      const text = stripHtml(html).toLowerCase();
      // Bosnian passive patterns
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
    description: 'Avoid overused sports journalism cliches',
    check: (html: string) => {
      const text = stripHtml(html).toLowerCase();
      const cliches = [
        'pokazao zube', 'zlatna generacija', 'sjajni meč',
        'pravo lice', 'bolji dio igre', 'fantastičan meč',
        'u stilu', 'pravi spektakl', 'briljantna igra',
        'maestralni', 'fenomenalan', 'historijska pobjeda',
        'nerješiv', 'nemoguća misija', 'čudo se desilo',
      ];
      const found = cliches.filter(c => text.includes(c));
      return {
        passed: found.length === 0,
        detail: found.length === 0
          ? 'No cliches detected'
          : `Cliches found: ${found.join(', ')}`,
      };
    },
  },
];

// ═══ Vocabulary Enrichment ═══

export interface VocabularyMapping {
  common: string;
  alternatives: string[];
  context: string;
}

/**
 * Maps overused sports terms to richer alternatives.
 * The style refiner should rotate through alternatives to avoid repetition.
 */
export const VOCABULARY_ENRICHMENT: VocabularyMapping[] = [
  // Goal-related
  { common: 'postigao gol', alternatives: ['zatresao mrežu', 'pronašao put do mreže', 'pogodio za', 'upisao se u strijelce'], context: 'goal_scoring' },
  { common: 'dao gol', alternatives: ['postigao pogodak', 'zatresao mrežu', 'pogodio'], context: 'goal_scoring' },
  { common: 'zabio', alternatives: ['postigao pogodak', 'pogodio', 'pronašao mrežu'], context: 'goal_scoring' },

  // Match flow
  { common: 'utakmica je počela', alternatives: ['sudijski zvižduk označio je početak', 'prvi udarac lopte', 'susret je otvoren'], context: 'match_start' },
  { common: 'završila je', alternatives: ['susret je okončan', 'sudija je označio kraj', 'posljednji zvižduk'], context: 'match_end' },
  { common: 'dobra igra', alternatives: ['uvjerljiv nastup', 'kvalitetan pristup', 'disciplinirana igra', 'organiziran nastup'], context: 'performance' },
  { common: 'loša igra', alternatives: ['neuvjerljiv nastup', 'ispod očekivanja', 'nedovoljno angažovano'], context: 'performance' },

  // Possession & control
  { common: 'imao posjed', alternatives: ['kontrolirao loptu', 'držao igru pod kontrolom', 'diktirao tempo'], context: 'possession' },
  { common: 'držao loptu', alternatives: ['kontrolirao posjed', 'diktirao ritam', 'upravljao tempom igre'], context: 'possession' },

  // Shots & chances
  { common: 'šut na gol', alternatives: ['pokušaj ka golu', 'udarac prema okviru', 'udarac u smjeru gola'], context: 'shots' },
  { common: 'prilika', alternatives: ['šansa', 'prigoda', 'mogućnost za pogodak'], context: 'chances' },
  { common: 'velika prilika', alternatives: ['izrazita šansa', 'zrela prilika', 'jasna prigoda'], context: 'chances' },

  // Cards & fouls
  { common: 'dobio žuti karton', alternatives: ['zaradio opomenu', 'kažnjen žutim kartonom', 'opomenut'], context: 'cards' },
  { common: 'dobio crveni karton', alternatives: ['isključen', 'kažnjen crvenim kartonom', 'morao napustiti teren'], context: 'cards' },

  // Transitions & connectors
  { common: 'nakon toga', alternatives: ['potom', 'u nastavku', 'nedugo zatim'], context: 'transition' },
  { common: 'međutim', alternatives: ['no', 'ipak', 'uprkos tome'], context: 'transition' },
  { common: 'također', alternatives: ['isto tako', 'uz to', 'pored toga'], context: 'transition' },

  // Defensive actions
  { common: 'odbranio', alternatives: ['sačuvao mrežu', 'intervenirao', 'zaustavio pokušaj'], context: 'defense' },
  { common: 'blokirao', alternatives: ['zaustavio udarac', 'stao na put', 'presreo'], context: 'defense' },

  // Substitutions
  { common: 'zamijenjen', alternatives: ['ustupio mjesto', 'napustio teren', 'prepustio poziciju'], context: 'substitution' },
  { common: 'ušao u igru', alternatives: ['uključen u igru', 'dobio priliku sa klupe', 'pojačao tim'], context: 'substitution' },
];

// ═══ Sentence Rhythm Guidelines ═══

export const RHYTHM_GUIDELINES = {
  /** Ideal sentence length range (words) */
  sentence_length_min: 8,
  sentence_length_max: 25,
  /** Target ratio of short sentences (<12 words) to long sentences (>18 words) */
  short_to_long_ratio: 0.4,
  /** Max words before requiring a comma or clause break */
  max_words_without_break: 15,
};

// ═══ Lead Formula ═══

export const LEAD_FORMULA = {
  /** First sentence must contain: BOTH teams + result */
  required_elements: ['both_teams', 'score'],
  /** Second sentence should provide key context (goal scorer, minute, significance) */
  context_elements: ['scorer', 'minute', 'competition_context'],
  /** Max words in lead paragraph */
  max_lead_words: 35,
};

// ═══ Number Formatting (Bosnian Convention) ═══

export const NUMBER_FORMATTING = {
  /** Spell out numbers 1-10 in flowing text, use digits for stats */
  spell_out_max: 10,
  /** Always use digits for: scores, minutes, percentages, player numbers */
  always_digits: ['scores', 'minutes', 'percentages', 'player_numbers', 'attendance'],
  /** Thousands separator for large numbers (Bosnian uses period) */
  thousands_separator: '.',
  /** Decimal separator (Bosnian uses comma) */
  decimal_separator: ',',
};

// ═══ Style Refiner Prompt Template ═══

/**
 * Builds the system prompt for Pass 2 (style refinement).
 * This prompt instructs Claude to polish the article while preserving all facts.
 */
export function buildStyleRefinerPrompt(vocabularyHints: string[]): string {
  return `Ti si urednik sportske redakcije sa iskustvom AP, Reuters, BBC Sport, Economist i Al Jazeera standarda.
Tvoj zadatak je STILSKO POLIRANJE postojećeg članka. NE mijenjaj činjenice.

APSOLUTNA PRAVILA:
1. SAČUVAJ SVE brojeve, imena, rezultate, minute, statistike iz originala. NE dodaji nove.
2. SAČUVAJ SVE HTML tagove (<p>, <h2>, <ul>, <li>). NE dodaji nove tipove tagova.
3. NE dodaji nove činjenice, citate, ili informacije.
4. NE dodaji kauzalne fraze (jer, zato što, frustriran, motivisan).
5. NE dodaji predikcije ili spekulacije.
6. NE mijenjaj značenje rečenica.

ŠTA SMJEŠ MIJENJATI:
- Zamijeniti generične glagole jačim: ${vocabularyHints.slice(0, 8).join(', ')}
- Poboljšati ritam rečenica (izmjenjivati kratke i duge)
- Eliminisati ponavljanja istih riječi u uzastopnim rečenicama
- Poboljšati tranzicije između paragrafa
- Zamijeniti pasivne konstrukcije aktivnim
- Eliminisati klišeje sportskog novinarstva
- Učiniti uvod (lead) jačim i direktnijim

STIL:
- Obraćaj se čitaocu kao informirani novinar, ne navijač
- Koristi aktivan glas kad god je moguće
- Rečenice: 8-25 riječi, izmjenjuj kratke i duge
- Paragrafi: 2-3 rečenice, svaki nosi novu informaciju
- Uvod: rezultat + ključni događaj u prvoj rečenici

Output SAMO validan JSON sa istom strukturom kao input:
{"title":"...","excerpt":"...","content_html":"...","tags":[...]}

KRITIČNO: Svaki broj i ime iz originala MORA ostati u poliranoj verziji.`;
}

// ═══ Helpers ═══

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Get a random subset of vocabulary hints for the refiner prompt.
 * Rotates through alternatives to keep each refinement fresh.
 */
export function getVocabularyHints(count: number = 10): string[] {
  const hints: string[] = [];
  const shuffled = [...VOCABULARY_ENRICHMENT].sort(() => Math.random() - 0.5);
  for (const mapping of shuffled.slice(0, count)) {
    const alt = mapping.alternatives[Math.floor(Math.random() * mapping.alternatives.length)];
    hints.push(`"${mapping.common}" → "${alt}"`);
  }
  return hints;
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
