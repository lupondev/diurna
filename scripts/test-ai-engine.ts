/**
 * AI Engine V2 — Test Script
 *
 * Tests the complete data foundation + validation pipeline:
 * 1. Creates a mock NormalizedSnapshot (Benfica 0-1 Real Madrid)
 * 2. Calculates CDI
 * 3. Checks staleness
 * 4. Runs all 4 validators on a GOOD article (should PASS)
 * 5. Runs all 4 validators on a BAD article (should FAIL)
 *
 * Run: npx tsx scripts/test-ai-engine.ts
 */

import { createSnapshotFromData } from '../lib/ai-engine/ingestion';
import { calculateCDI } from '../lib/ai-engine/cdi';
import { checkStaleness } from '../lib/ai-engine/staleness';
import { validateArticle } from '../lib/ai-engine/validators';
import type { MatchData, GeneratedArticle } from '../lib/ai-engine/types';

// ══════════════════════════════════════════════
// Mock Data: Benfica 0-1 Real Madrid
// ══════════════════════════════════════════════

const mockMatchData: MatchData = {
  match: {
    home: 'Benfica',
    away: 'Real Madrid',
    home_short: 'BEN',
    away_short: 'RMA',
    score_home: 0,
    score_away: 1,
    date: '2026-02-18',
    kickoff: '2026-02-18T21:00:00+01:00',
    competition: 'Liga Prvaka',
    round: 'Play-off, 1. utakmica',
    venue: 'Estádio da Luz',
    referee: 'Slavko Vinčić',
    attendance: 64642,
  },
  events: [
    {
      id: 'goal_1',
      type: 'goal',
      minute: 67,
      added_time: null,
      player_id: '1100',
      player_name: 'Vinícius Júnior',
      team: 'away',
      detail: 'Normal Goal',
      assist_player_id: '1101',
      assist_player_name: 'Jude Bellingham',
      weight: 5,
    },
    {
      id: 'yellow_card_1',
      type: 'yellow_card',
      minute: 34,
      added_time: null,
      player_id: '1200',
      player_name: 'Nicolás Otamendi',
      team: 'home',
      detail: 'Yellow Card',
      assist_player_id: null,
      assist_player_name: null,
      weight: 2,
    },
    {
      id: 'yellow_card_2',
      type: 'yellow_card',
      minute: 58,
      added_time: null,
      player_id: '1201',
      player_name: 'Gianluca Prestianni',
      team: 'home',
      detail: 'Yellow Card',
      assist_player_id: null,
      assist_player_name: null,
      weight: 2,
    },
    {
      id: 'yellow_card_3',
      type: 'yellow_card',
      minute: 73,
      added_time: null,
      player_id: '1202',
      player_name: 'Fredrik Aursnes',
      team: 'home',
      detail: 'Yellow Card',
      assist_player_id: null,
      assist_player_name: null,
      weight: 2,
    },
    {
      id: 'yellow_card_4',
      type: 'yellow_card',
      minute: 81,
      added_time: null,
      player_id: '1102',
      player_name: 'Federico Valverde',
      team: 'away',
      detail: 'Yellow Card',
      assist_player_id: null,
      assist_player_name: null,
      weight: 2,
    },
    {
      id: 'substitution_1',
      type: 'substitution',
      minute: 70,
      added_time: null,
      player_id: '1203',
      player_name: 'Ángel Di María',
      team: 'home',
      detail: 'Substitution',
      assist_player_id: null,
      assist_player_name: null,
      weight: 1,
    },
    {
      id: 'substitution_2',
      type: 'substitution',
      minute: 78,
      added_time: null,
      player_id: '1103',
      player_name: 'Rodrygo',
      team: 'away',
      detail: 'Substitution',
      assist_player_id: null,
      assist_player_name: null,
      weight: 1,
    },
  ],
  stats: {
    possession_home: 45,
    possession_away: 55,
    shots_home: 12,
    shots_away: 18,
    shots_on_target_home: 4,
    shots_on_target_away: 7,
    xg_home: null,
    xg_away: null,
    corners_home: 5,
    corners_away: 8,
    fouls_home: 14,
    fouls_away: 11,
    yellow_cards_home: 3,
    yellow_cards_away: 1,
    red_cards_home: 0,
    red_cards_away: 0,
    dangerous_attacks_home: null,
    dangerous_attacks_away: null,
  },
  players: [
    {
      id: '1100', name: 'Vinícius Júnior', team: 'away', position: 'LW',
      nationality: 'Brazil', age: 25, rating: 8.2, goals: 1, assists: 0,
      yellow_cards: 0, red_cards: 0, minutes_played: 90, market_value: '€150M',
      photo_url: null, db_player_id: null,
    },
    {
      id: '1101', name: 'Jude Bellingham', team: 'away', position: 'CM',
      nationality: 'England', age: 22, rating: 7.8, goals: 0, assists: 1,
      yellow_cards: 0, red_cards: 0, minutes_played: 90, market_value: '€120M',
      photo_url: null, db_player_id: null,
    },
    {
      id: '1102', name: 'Federico Valverde', team: 'away', position: 'CM',
      nationality: 'Uruguay', age: 27, rating: 7.1, goals: 0, assists: 0,
      yellow_cards: 1, red_cards: 0, minutes_played: 90, market_value: '€100M',
      photo_url: null, db_player_id: null,
    },
    {
      id: '1103', name: 'Rodrygo', team: 'away', position: 'RW',
      nationality: 'Brazil', age: 25, rating: 6.8, goals: 0, assists: 0,
      yellow_cards: 0, red_cards: 0, minutes_played: 78, market_value: '€80M',
      photo_url: null, db_player_id: null,
    },
    {
      id: '1200', name: 'Nicolás Otamendi', team: 'home', position: 'CB',
      nationality: 'Argentina', age: 37, rating: 6.2, goals: 0, assists: 0,
      yellow_cards: 1, red_cards: 0, minutes_played: 90, market_value: '€3M',
      photo_url: null, db_player_id: null,
    },
    {
      id: '1201', name: 'Gianluca Prestianni', team: 'home', position: 'RW',
      nationality: 'Argentina', age: 18, rating: 5.8, goals: 0, assists: 0,
      yellow_cards: 1, red_cards: 0, minutes_played: 90, market_value: '€15M',
      photo_url: null, db_player_id: null,
    },
    {
      id: '1202', name: 'Fredrik Aursnes', team: 'home', position: 'CM',
      nationality: 'Norway', age: 26, rating: 6.5, goals: 0, assists: 0,
      yellow_cards: 1, red_cards: 0, minutes_played: 90, market_value: '€20M',
      photo_url: null, db_player_id: null,
    },
    {
      id: '1203', name: 'Ángel Di María', team: 'home', position: 'RW',
      nationality: 'Argentina', age: 37, rating: 6.0, goals: 0, assists: 0,
      yellow_cards: 0, red_cards: 0, minutes_played: 70, market_value: '€5M',
      photo_url: null, db_player_id: null,
    },
  ],
  standings: null,
};

// ══════════════════════════════════════════════
// GOOD Article (should PASS all validators)
// ══════════════════════════════════════════════

const goodArticle: GeneratedArticle = {
  title: 'Vinícius Júnior donio pobjedu Real Madridu na Estádio da Luz',
  excerpt: 'Real Madrid ostvario pobjedu 1:0 nad Benficom u prvoj utakmici play-offa Lige Prvaka.',
  content_html: `
    <p>Real Madrid je ostvario važnu pobjedu 1:0 nad Benficom na Estádio da Luz u prvoj utakmici play-off runde Lige Prvaka.</p>
    <p>Gol odluke postigao je Vinícius Júnior u 67. minuti, nakon asistencije Judea Bellinghama. Brazilski napadač, koji je ocijenjen ocjenom 8.2, bio je ključni igrač utakmice.</p>
    <p>Real Madrid je imao nešto bolji posjed lopte sa 55% naspram 45% za Benficu. Gosti su uputili 18 udaraca, od čega 7 u okvir gola, dok je Benfica imala 12 udaraca sa 4 u okvir.</p>
    <p>Utakmica je bila obilježena sa 4 žuta kartona — Otamendi u 34., Prestianni u 58. i Aursnes u 73. minuti za domaćine, te Valverde u 81. za Real Madrid.</p>
    <p>Benfica je imala 5 kornera naspram 8 za Real Madrid, a domaćin je napravio 14 prekršaja prema 11 za goste.</p>
  `,
  entities_used: [
    { name: 'Vinícius Júnior', id: '1100', mentions: 2 },
    { name: 'Jude Bellingham', id: '1101', mentions: 1 },
    { name: 'Otamendi', id: '1200', mentions: 1 },
    { name: 'Prestianni', id: '1201', mentions: 1 },
    { name: 'Aursnes', id: '1202', mentions: 1 },
    { name: 'Valverde', id: '1102', mentions: 1 },
    { name: 'Real Madrid', id: 'team', mentions: 4 },
    { name: 'Benfica', id: 'team', mentions: 3 },
  ],
  events_covered: ['goal_1', 'yellow_card_1', 'yellow_card_2', 'yellow_card_3', 'yellow_card_4'],
  numbers_used: [
    { value: '1', source_field: 'match.score_away' },
    { value: '0', source_field: 'match.score_home' },
    { value: '67', source_field: 'events[0].minute' },
    { value: '8.2', source_field: 'players[0].rating' },
    { value: '55', source_field: 'stats.possession_away' },
    { value: '45', source_field: 'stats.possession_home' },
    { value: '18', source_field: 'stats.shots_away' },
    { value: '7', source_field: 'stats.shots_on_target_away' },
    { value: '12', source_field: 'stats.shots_home' },
    { value: '4', source_field: 'stats.shots_on_target_home' },
    { value: '34', source_field: 'events[1].minute' },
    { value: '58', source_field: 'events[2].minute' },
    { value: '73', source_field: 'events[3].minute' },
    { value: '81', source_field: 'events[4].minute' },
    { value: '5', source_field: 'stats.corners_home' },
    { value: '8', source_field: 'stats.corners_away' },
    { value: '14', source_field: 'stats.fouls_home' },
    { value: '11', source_field: 'stats.fouls_away' },
  ],
  tags: ['Liga Prvaka', 'Real Madrid', 'Benfica', 'Vinícius Júnior'],
};

// ══════════════════════════════════════════════
// BAD Article (should FAIL multiple validators)
// ══════════════════════════════════════════════

const badArticle: GeneratedArticle = {
  title: 'Real Madrid demolirao Benficu na gostovanju',
  excerpt: 'Real Madrid je dominantan u Lisabonu.',
  content_html: `
    <p>Real Madrid je demolirao Benficu rezultatom 3:0 na Estádio da Luz, jer je tim bio frustriran prethodnim rezultatima.</p>
    <p>Kylian Mbappé je postigao hat-trick sa golovima u 23., 56. i 89. minuti. Francuski napadač je bio superioran i pokazao potpunu kontrolu nad odbranom Benfice.</p>
    <p>Real Madrid je dominantan u Lisabonu sa čak 72% posjeda lopte i 25 udaraca. Benfica je ponižena na vlastitom terenu.</p>
    <p>Očekuje se da Real Madrid lako prođe u sljedeću rundu nakon ovog rezultata.</p>
  `,
  entities_used: [
    { name: 'Kylian Mbappé', id: '9999', mentions: 2 },  // NOT in snapshot
    { name: 'Real Madrid', id: 'team', mentions: 3 },
    { name: 'Benfica', id: 'team', mentions: 2 },
  ],
  events_covered: [],  // NO events covered — missing the goal
  numbers_used: [
    { value: '3', source_field: 'hallucinated' },
    { value: '0', source_field: 'match.score_home' },
    { value: '23', source_field: 'hallucinated' },
    { value: '56', source_field: 'hallucinated' },
    { value: '89', source_field: 'hallucinated' },
    { value: '72', source_field: 'hallucinated' },
    { value: '25', source_field: 'hallucinated' },
  ],
  tags: ['Liga Prvaka', 'Real Madrid', 'Benfica'],
};

// ══════════════════════════════════════════════
// Run Tests
// ══════════════════════════════════════════════

function printHeader(text: string) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${text}`);
  console.log('═'.repeat(60));
}

function printResult(label: string, passed: boolean) {
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`  ${icon}  ${label}`);
}

function main() {
  printHeader('AI ENGINE V2 — TEST SUITE');
  console.log('  Match: Benfica 0-1 Real Madrid');
  console.log('  Competition: Liga Prvaka — Play-off, 1. utakmica');
  console.log('  Date: 2026-02-18');

  // Step 1: Create snapshot
  printHeader('STEP 1: Create Normalized Snapshot');
  const snapshot = createSnapshotFromData(mockMatchData, 'match_report');
  console.log(`  Snapshot ID: ${snapshot.snapshot_id}`);
  console.log(`  Confidence: ${snapshot.confidence_score}`);
  console.log(`  Events: ${snapshot.data.events.length}`);
  console.log(`  Players: ${snapshot.data.players.length}`);
  printResult('Snapshot created', true);

  // Step 2: Calculate CDI
  printHeader('STEP 2: CDI Calculation');
  const cdi = calculateCDI(snapshot.data.stats, snapshot.data.match.score_home, snapshot.data.match.score_away);
  console.log(`  Home CDI (Benfica): ${cdi.home} → ${cdi.home_tone}`);
  console.log(`  Away CDI (Real Madrid): ${cdi.away} → ${cdi.away_tone}`);
  printResult('CDI calculated', true);

  // Step 3: Staleness check
  printHeader('STEP 3: Staleness Guard');
  const staleness = checkStaleness(snapshot.snapshot_timestamp, 'match_report');
  console.log(`  Status: ${staleness.status}`);
  console.log(`  Age: ${staleness.age_seconds.toFixed(0)}s / Window: ${staleness.window_seconds}s`);
  printResult('Staleness check', staleness.status !== 'REJECT');

  // Step 4: Validate GOOD article
  printHeader('STEP 4: Validate GOOD Article');
  const goodResult = validateArticle(goodArticle, snapshot, cdi);
  console.log(`  Overall: ${goodResult.passed ? 'PASSED' : 'FAILED'}`);
  printResult('Numeric validator', goodResult.numeric.passed);
  if (!goodResult.numeric.passed) {
    for (const e of goodResult.numeric.errors) console.log(`    → ${e.message}`);
  }
  printResult('Coverage validator', goodResult.coverage.passed);
  console.log(`    Score: ${goodResult.coverage.score}%`);
  if (goodResult.coverage.missing_critical.length > 0) {
    console.log(`    Missing critical: ${goodResult.coverage.missing_critical.join(', ')}`);
  }
  printResult('Tone validator', goodResult.tone.passed);
  if (!goodResult.tone.passed) {
    for (const e of goodResult.tone.errors) console.log(`    → ${e.message}`);
  }
  printResult('Entity validator', goodResult.entity.passed);
  if (!goodResult.entity.passed) {
    for (const e of goodResult.entity.errors) console.log(`    → ${e.message}`);
  }

  // Step 5: Validate BAD article
  printHeader('STEP 5: Validate BAD Article (expect failures)');
  const badResult = validateArticle(badArticle, snapshot, cdi);
  console.log(`  Overall: ${badResult.passed ? 'PASSED' : 'FAILED'} (expected: FAILED)`);
  printResult('Numeric validator', badResult.numeric.passed);
  for (const e of badResult.numeric.errors.slice(0, 5)) console.log(`    → ${e.message}`);
  if (badResult.numeric.errors.length > 5) console.log(`    → ... and ${badResult.numeric.errors.length - 5} more`);
  printResult('Coverage validator', badResult.coverage.passed);
  console.log(`    Score: ${badResult.coverage.score}%`);
  console.log(`    Missing critical: ${badResult.coverage.missing_critical.join(', ')}`);
  printResult('Tone validator', badResult.tone.passed);
  for (const e of badResult.tone.errors) console.log(`    → ${e.message}`);
  printResult('Entity validator', badResult.entity.passed);
  for (const e of badResult.entity.errors) console.log(`    → ${e.message}`);

  // Print retry instructions
  if (badResult.retry_instructions) {
    printHeader('RETRY INSTRUCTIONS (sent back to LLM)');
    console.log(badResult.retry_instructions);
  }

  // Summary
  printHeader('SUMMARY');
  const goodPassed = goodResult.passed;
  const badFailed = !badResult.passed;
  printResult('Good article passed all validators', goodPassed);
  printResult('Bad article failed validation (expected)', badFailed);
  console.log('');

  if (goodPassed && badFailed) {
    console.log('  🎉 All tests passed! AI Engine V2 validation pipeline is working.');
  } else {
    console.log('  ⚠️  Some tests did not produce expected results.');
    process.exit(1);
  }
}

main();
