/**
 * Language Configuration for AI Engine — BCMS + International
 *
 * Provides language-specific vocabulary, grammar rules, forbidden terms,
 * and cliches for generating sports journalism in the correct variant.
 *
 * BCMS = Bosnian, Croatian, Montenegrin, Serbian — four national standard
 * varieties of one pluricentric language with real lexical, phonological,
 * and morphological differences that MUST be respected.
 */

export type LanguageCode = 'bs' | 'hr' | 'sr-cyrl' | 'sr-latn' | 'cnj' | 'en' | 'ar' | 'tr';

export interface SportsTerm {
  sport_football: string;
  goalkeeper: string;
  referee: string;
  match: string;
  coach: string;
  penalty: string;
  corner: string;
  yellow_card: string;
  red_card: string;
  offside: string;
  league: string;
  championship: string;
  transfer: string;
  injury: string;
}

export interface LanguageConfig {
  code: LanguageCode;
  locale: string;
  name: string;
  direction: 'ltr' | 'rtl';
  phonology: 'ijekavica' | 'ekavica' | null;
  infinitive_style: 'infinitive' | 'da_prezent';
  future_tense: 'ću_infinitive' | 'ću_da_prezent';
  sports_terms: SportsTerm;
  forbidden_terms: string[];
  cliche_list: string[];
}

export const LANGUAGE_CONFIGS: Record<LanguageCode, LanguageConfig> = {
  bs: {
    code: 'bs',
    locale: 'bs-BA',
    name: 'Bosanski',
    direction: 'ltr',
    phonology: 'ijekavica',
    infinitive_style: 'da_prezent',
    future_tense: 'ću_da_prezent',
    sports_terms: {
      sport_football: 'fudbal',
      goalkeeper: 'golman',
      referee: 'sudija',
      match: 'utakmica',
      coach: 'trener',
      penalty: 'penal',
      corner: 'korner',
      yellow_card: 'žuti karton',
      red_card: 'crveni karton',
      offside: 'ofsajd',
      league: 'liga',
      championship: 'prvak',
      transfer: 'transfer',
      injury: 'povreda',
    },
    forbidden_terms: [
      'nogomet', 'vratar', 'sudac', 'zaleđe', 'ozljeda',
      'momčad', 'tisuća', 'povijest', 'glazba', 'jedanaesterac',
    ],
    cliche_list: [
      'zatresao mrežu', 'pokazao zube', 'stavio tačku na utakmicu',
      'pružio ruku spasa', 'maestralna predstava', 'borba do posljednjeg daha',
      'dominirao od prve minute', 'preslišao protivnika', 'ispustio pobjedu iz ruku',
      'proigrao šansu', 'zlatna generacija', 'sjajni meč',
    ],
  },
  hr: {
    code: 'hr',
    locale: 'hr-HR',
    name: 'Hrvatski',
    direction: 'ltr',
    phonology: 'ijekavica',
    infinitive_style: 'infinitive',
    future_tense: 'ću_infinitive',
    sports_terms: {
      sport_football: 'nogomet',
      goalkeeper: 'vratar',
      referee: 'sudac',
      match: 'utakmica',
      coach: 'trener',
      penalty: 'jedanaesterac',
      corner: 'korner',
      yellow_card: 'žuti karton',
      red_card: 'crveni karton',
      offside: 'zaleđe',
      league: 'liga',
      championship: 'prvak',
      transfer: 'transfer',
      injury: 'ozljeda',
    },
    forbidden_terms: [
      'fudbal', 'golman', 'sudija', 'penal', 'ofsajd', 'povreda',
      'hiljada', 'historija', 'muzika', 'kahva',
    ],
    cliche_list: [
      'zatresao mrežu', 'pokazao zube', 'stavio točku na utakmicu',
      'pružio ruku spasa', 'maestralna predstava', 'borba do posljednjeg daha',
      'dominirao od prve minute', 'preslišao protivnika', 'ispustio pobjedu iz ruku',
      'proigrao priliku', 'zlatna generacija', 'sjajni dvoboj',
    ],
  },
  'sr-cyrl': {
    code: 'sr-cyrl',
    locale: 'sr-Cyrl-RS',
    name: 'Српски (Ћирилица)',
    direction: 'ltr',
    phonology: 'ekavica',
    infinitive_style: 'da_prezent',
    future_tense: 'ću_da_prezent',
    sports_terms: {
      sport_football: 'фудбал',
      goalkeeper: 'голман',
      referee: 'судија',
      match: 'утакмица',
      coach: 'тренер',
      penalty: 'пенал',
      corner: 'корнер',
      yellow_card: 'жути картон',
      red_card: 'црвени картон',
      offside: 'офсајд',
      league: 'лига',
      championship: 'првак',
      transfer: 'трансфер',
      injury: 'повреда',
    },
    forbidden_terms: [
      'nogomet', 'vratar', 'sudac', 'momčad', 'tisuća',
      'povijest', 'glazba', 'zaleđe', 'tjedan', 'ozljeda',
    ],
    cliche_list: [
      'затресао мрежу', 'показао зубе', 'ставио тачку на утакмицу',
      'пружио руку спаса', 'маестрална представа', 'борба до последњег даха',
      'доминирао од прве минуте', 'преслишао противника',
    ],
  },
  'sr-latn': {
    code: 'sr-latn',
    locale: 'sr-Latn-RS',
    name: 'Srpski (Latinica)',
    direction: 'ltr',
    phonology: 'ekavica',
    infinitive_style: 'da_prezent',
    future_tense: 'ću_da_prezent',
    sports_terms: {
      sport_football: 'fudbal',
      goalkeeper: 'golman',
      referee: 'sudija',
      match: 'utakmica',
      coach: 'trener',
      penalty: 'penal',
      corner: 'korner',
      yellow_card: 'žuti karton',
      red_card: 'crveni karton',
      offside: 'ofsajd',
      league: 'liga',
      championship: 'prvak',
      transfer: 'transfer',
      injury: 'povreda',
    },
    forbidden_terms: [
      'nogomet', 'vratar', 'sudac', 'momčad', 'tisuća',
      'povijest', 'glazba', 'zaleđe', 'tjedan', 'ozljeda',
    ],
    cliche_list: [
      'zatresao mrežu', 'pokazao zube', 'stavio tačku na utakmicu',
      'pružio ruku spasa', 'maestralna predstava', 'borba do poslednjeg daha',
      'dominirao od prve minute', 'preslišao protivnika',
    ],
  },
  cnj: {
    code: 'cnj',
    locale: 'cnr-ME',
    name: 'Crnogorski',
    direction: 'ltr',
    phonology: 'ijekavica',
    infinitive_style: 'da_prezent',
    future_tense: 'ću_da_prezent',
    sports_terms: {
      sport_football: 'fudbal',
      goalkeeper: 'golman',
      referee: 'sudija',
      match: 'utakmica',
      coach: 'trener',
      penalty: 'penal',
      corner: 'korner',
      yellow_card: 'žuti karton',
      red_card: 'crveni karton',
      offside: 'ofsajd',
      league: 'liga',
      championship: 'prvak',
      transfer: 'transfer',
      injury: 'povreda',
    },
    forbidden_terms: [
      'nogomet', 'vratar', 'sudac', 'momčad', 'tisuća',
      'povijest', 'glazba', 'zaleđe', 'tjedan', 'ozljeda',
      'mleko', 'lep', 'pobeda',
    ],
    cliche_list: [
      'zatresao mrežu', 'pokazao zube', 'stavio tačku na utakmicu',
      'pružio ruku spasa', 'maestralna predstava', 'borba do posljednjeg daha',
      'dominirao od prve minute', 'preslišao protivnika',
    ],
  },
  en: {
    code: 'en',
    locale: 'en-GB',
    name: 'English',
    direction: 'ltr',
    phonology: null,
    infinitive_style: 'infinitive',
    future_tense: 'ću_infinitive',
    sports_terms: {
      sport_football: 'football',
      goalkeeper: 'goalkeeper',
      referee: 'referee',
      match: 'match',
      coach: 'coach',
      penalty: 'penalty',
      corner: 'corner',
      yellow_card: 'yellow card',
      red_card: 'red card',
      offside: 'offside',
      league: 'league',
      championship: 'champion',
      transfer: 'transfer',
      injury: 'injury',
    },
    forbidden_terms: [],
    cliche_list: [
      'a game of two halves', 'sick as a parrot', 'over the moon',
      'at the end of the day', 'the beautiful game',
    ],
  },
  ar: {
    code: 'ar',
    locale: 'ar-SA',
    name: 'العربية',
    direction: 'rtl',
    phonology: null,
    infinitive_style: 'infinitive',
    future_tense: 'ću_infinitive',
    sports_terms: {
      sport_football: 'كرة القدم',
      goalkeeper: 'حارس المرمى',
      referee: 'حكم',
      match: 'مباراة',
      coach: 'مدرب',
      penalty: 'ركلة جزاء',
      corner: 'ركلة ركنية',
      yellow_card: 'بطاقة صفراء',
      red_card: 'بطاقة حمراء',
      offside: 'تسلل',
      league: 'دوري',
      championship: 'بطل',
      transfer: 'انتقال',
      injury: 'إصابة',
    },
    forbidden_terms: [],
    cliche_list: [],
  },
  tr: {
    code: 'tr',
    locale: 'tr-TR',
    name: 'Türkçe',
    direction: 'ltr',
    phonology: null,
    infinitive_style: 'infinitive',
    future_tense: 'ću_infinitive',
    sports_terms: {
      sport_football: 'futbol',
      goalkeeper: 'kaleci',
      referee: 'hakem',
      match: 'maç',
      coach: 'teknik direktör',
      penalty: 'penaltı',
      corner: 'köşe vuruşu',
      yellow_card: 'sarı kart',
      red_card: 'kırmızı kart',
      offside: 'ofsayt',
      league: 'lig',
      championship: 'şampiyon',
      transfer: 'transfer',
      injury: 'sakatlık',
    },
    forbidden_terms: [],
    cliche_list: [],
  },
};

/**
 * Get language config, with fallback to Bosnian.
 */
export function getLanguageConfig(code: string): LanguageConfig {
  if (code in LANGUAGE_CONFIGS) return LANGUAGE_CONFIGS[code as LanguageCode];
  return LANGUAGE_CONFIGS.bs;
}

/**
 * Generate language-specific prompt section for the AI engine.
 */
export function getLanguagePromptSection(config: LanguageConfig): string {
  const parts: string[] = [];

  parts.push(`\nJEZIK: ${config.name} (${config.locale})`);
  parts.push(`SMJER TEKSTA: ${config.direction}`);

  // Phonology
  if (config.phonology) {
    const phonologyExamples = config.phonology === 'ijekavica'
      ? 'mlijeko, lijep, dijete, svijet, rijeka'
      : 'mleko, lep, dete, svet, reka';
    parts.push(`FONOLOGIJA: ${config.phonology.toUpperCase()} — ${phonologyExamples}`);
  }

  // Script for Serbian Cyrillic
  if (config.code === 'sr-cyrl') {
    parts.push('PISMO: ĆIRILICA — sav tekst MORA biti na ćirilici');
  }

  // Grammar style
  if (config.infinitive_style === 'da_prezent') {
    parts.push('GLAGOLSKI STIL: da+prezent (želim da idem, ne: želim ići)');
  } else if (['bs', 'hr', 'cnj', 'sr-latn', 'sr-cyrl'].includes(config.code)) {
    parts.push('GLAGOLSKI STIL: infinitiv (želim ići, ne: želim da idem)');
  }

  // Future tense
  if (config.future_tense === 'ću_da_prezent') {
    parts.push('FUTUR: ću da + prezent (imaću — spojeno)');
  } else if (config.code === 'hr') {
    parts.push('FUTUR: ću + infinitiv (imat ću — odvojeno)');
  }

  // Direction for AR
  if (config.direction === 'rtl') {
    parts.push('NAPOMENA: RTL tekst — desno na lijevo');
  }

  // Forbidden terms
  if (config.forbidden_terms.length > 0) {
    parts.push(`\n★★★ ZABRANJENE RIJEČI (iz pogrešne jezičke varijante — NE KORISTI) ★★★`);
    parts.push(config.forbidden_terms.join(', '));
    parts.push(`★★★ KRAJ ZABRANJENIH RIJEČI ★★★`);
  }

  // Sports terminology
  parts.push(`\nSPORTSKA TERMINOLOGIJA (OBAVEZNO KORISTITI OVE TERMINE):`);
  const st = config.sports_terms;
  parts.push(`- ${config.code === 'sr-cyrl' ? 'фудбал' : 'Football'}: ${st.sport_football}`);
  parts.push(`- ${config.code === 'sr-cyrl' ? 'голман' : 'Goalkeeper'}: ${st.goalkeeper}`);
  parts.push(`- ${config.code === 'sr-cyrl' ? 'судија' : 'Referee'}: ${st.referee}`);
  parts.push(`- ${config.code === 'sr-cyrl' ? 'утакмица' : 'Match'}: ${st.match}`);
  parts.push(`- ${config.code === 'sr-cyrl' ? 'пенал' : 'Penalty'}: ${st.penalty}`);
  parts.push(`- ${config.code === 'sr-cyrl' ? 'офсајд' : 'Offside'}: ${st.offside}`);
  parts.push(`- ${config.code === 'sr-cyrl' ? 'повреда' : 'Injury'}: ${st.injury}`);

  // Cliches
  if (config.cliche_list.length > 0) {
    parts.push(`\nZABRANJENI KLIŠEJI (NE KORISTI):`);
    parts.push(config.cliche_list.join(', '));
  }

  return parts.join('\n');
}
