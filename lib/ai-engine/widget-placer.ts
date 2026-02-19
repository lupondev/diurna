import type { NormalizedSnapshot, CDIResult, MatchEvent, PlayerData } from './types';

/**
 * Widget Placement Engine — deterministic rules for placing widgets
 * in generated articles based on match data and CDI.
 *
 * Rules:
 * 1. Match widget → always first (after opening paragraph)
 * 2. Player card → top-rated player with goal/assist, after paragraph 2
 * 3. Stats table → if CDI difference > 0.15 (interesting stat split), after paragraph 3
 * 4. Video → if YouTube video found, after paragraph 4
 * 5. Poll → always at end (before TLDR)
 * 6. Quiz → after poll
 * 7. Tags → very last
 */

export interface WidgetPlacement {
  widget_type: string;
  position: 'after_p1' | 'after_p2' | 'after_p3' | 'after_p4' | 'before_tldr' | 'end';
  data: Record<string, unknown>;
  reason: string;
}

export interface WidgetPlacementResult {
  placements: WidgetPlacement[];
  decisions: string[];
}

export function placeWidgets(
  snapshot: NormalizedSnapshot,
  cdi: CDIResult,
  videoId: string | null,
  tags: string[]
): WidgetPlacementResult {
  const placements: WidgetPlacement[] = [];
  const decisions: string[] = [];
  const d = snapshot.data;

  // 1. Match Widget — ALWAYS placed after first paragraph
  placements.push({
    widget_type: 'match',
    position: 'after_p1',
    data: {
      home: d.match.home,
      away: d.match.away,
      homeShort: d.match.home_short,
      awayShort: d.match.away_short,
      homeScore: d.match.score_home,
      awayScore: d.match.score_away,
      competition: d.match.competition,
      round: d.match.round,
      date: d.match.date,
      venue: d.match.venue,
      events: d.events
        .filter(e => e.type === 'goal' || e.type === 'penalty' || e.type === 'red_card')
        .map(e => ({
          type: e.type,
          minute: e.minute,
          addedTime: e.added_time,
          playerName: e.player_name,
          team: e.team,
          detail: e.detail,
        })),
    },
    reason: 'Match widget always placed after opening paragraph',
  });
  decisions.push('MATCH: Always included after P1');

  // 2. Player Card — top-rated player who scored or assisted
  const heroPlayer = findHeroPlayer(d.players, d.events);
  if (heroPlayer) {
    placements.push({
      widget_type: 'player-card',
      position: 'after_p2',
      data: {
        name: heroPlayer.name,
        position: heroPlayer.position,
        nationality: heroPlayer.nationality,
        age: heroPlayer.age,
        rating: heroPlayer.rating,
        goals: heroPlayer.goals,
        assists: heroPlayer.assists,
        minutesPlayed: heroPlayer.minutes_played,
        yellowCards: heroPlayer.yellow_cards,
        redCards: heroPlayer.red_cards,
        photoUrl: heroPlayer.photo_url,
        team: heroPlayer.team === 'home' ? d.match.home : d.match.away,
      },
      reason: `Hero player: ${heroPlayer.name} (rating: ${heroPlayer.rating}, goals: ${heroPlayer.goals}, assists: ${heroPlayer.assists})`,
    });
    decisions.push(`PLAYER: ${heroPlayer.name} — rating ${heroPlayer.rating}, ${heroPlayer.goals}G ${heroPlayer.assists}A`);
  } else {
    decisions.push('PLAYER: Skipped — no standout performer found');
  }

  // 3. Stats Table — if CDI difference is interesting (> 0.15)
  const cdiDiff = Math.abs(cdi.home - cdi.away);
  if (cdiDiff > 0.15) {
    placements.push({
      widget_type: 'stats',
      position: 'after_p3',
      data: {
        homeTeam: d.match.home_short,
        awayTeam: d.match.away_short,
        stats: buildStatsData(d.stats),
      },
      reason: `CDI difference ${cdiDiff.toFixed(2)} > 0.15 threshold — stats are interesting`,
    });
    decisions.push(`STATS: Included — CDI diff ${cdiDiff.toFixed(2)} shows clear statistical story`);
  } else {
    decisions.push(`STATS: Skipped — CDI diff ${cdiDiff.toFixed(2)} < 0.15, stats are balanced`);
  }

  // 4. Video — if YouTube video was found
  if (videoId) {
    placements.push({
      widget_type: 'video',
      position: 'after_p4',
      data: {
        videoId,
        title: `${d.match.home} vs ${d.match.away} — Highlights`,
      },
      reason: `YouTube video found: ${videoId}`,
    });
    decisions.push(`VIDEO: Included — YouTube ID: ${videoId}`);
  } else {
    decisions.push('VIDEO: Skipped — no video found');
  }

  // 5. Poll — always included before TLDR
  const pollData = generatePoll(d, cdi);
  placements.push({
    widget_type: 'poll',
    position: 'before_tldr',
    data: pollData,
    reason: 'Poll always included for engagement',
  });
  decisions.push(`POLL: "${pollData.question}"`);

  // 6. Quiz — if enough events for meaningful questions
  if (d.events.filter(e => e.weight >= 3).length >= 1) {
    const quizData = generateQuiz(d);
    placements.push({
      widget_type: 'quiz',
      position: 'before_tldr',
      data: quizData,
      reason: `${d.events.filter(e => e.weight >= 3).length} critical events — quiz is viable`,
    });
    decisions.push(`QUIZ: ${quizData.questions.length} questions generated`);
  } else {
    decisions.push('QUIZ: Skipped — not enough critical events');
  }

  // 7. Tags — always at the end
  if (tags.length > 0) {
    placements.push({
      widget_type: 'tags',
      position: 'end',
      data: { tags },
      reason: `${tags.length} tags from generated article`,
    });
    decisions.push(`TAGS: ${tags.length} tags included`);
  }

  return { placements, decisions };
}

/**
 * Find the "hero" player — highest-rated player who scored or assisted.
 * Falls back to highest-rated player overall.
 */
function findHeroPlayer(players: PlayerData[], events: MatchEvent[]): PlayerData | null {
  if (players.length === 0) return null;

  // Players who scored or assisted
  const scorerIds = new Set(
    events
      .filter(e => e.type === 'goal' || e.type === 'penalty')
      .flatMap(e => [e.player_id, e.assist_player_id].filter(Boolean))
  );

  const scorers = players.filter(p => scorerIds.has(p.id));

  // Pick highest-rated scorer/assister
  if (scorers.length > 0) {
    return scorers.reduce((best, p) =>
      (p.rating ?? 0) > (best.rating ?? 0) ? p : best
    );
  }

  // Fallback: highest-rated player overall (if rating >= 7.5)
  const sorted = [...players].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  if (sorted[0] && (sorted[0].rating ?? 0) >= 7.5) {
    return sorted[0];
  }

  return null;
}

function buildStatsData(stats: NormalizedSnapshot['data']['stats']): Array<{ label: string; home: number; away: number }> {
  const result: Array<{ label: string; home: number; away: number }> = [];

  result.push({ label: 'Posjed (%)', home: stats.possession_home, away: stats.possession_away });
  result.push({ label: 'Udarci', home: stats.shots_home, away: stats.shots_away });
  result.push({ label: 'U okvir', home: stats.shots_on_target_home, away: stats.shots_on_target_away });
  if (stats.xg_home !== null && stats.xg_away !== null) {
    result.push({ label: 'xG', home: stats.xg_home, away: stats.xg_away });
  }
  result.push({ label: 'Korneri', home: stats.corners_home, away: stats.corners_away });
  result.push({ label: 'Prekršaji', home: stats.fouls_home, away: stats.fouls_away });

  return result;
}

function generatePoll(
  d: NormalizedSnapshot['data'],
  cdi: CDIResult
): { question: string; options: string[] } {
  const goals = d.events.filter(e => e.type === 'goal' || e.type === 'penalty');

  // If there were goals, ask about MOTM
  if (goals.length > 0) {
    const scorers = goals.map(g => g.player_name);
    const topPlayers = d.players
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 2)
      .map(p => p.name);

    const options = Array.from(new Set([...scorers, ...topPlayers])).slice(0, 4);
    if (options.length < 3) options.push('Niko poseban');

    return {
      question: `Ko je bio najbolji igrač utakmice ${d.match.home_short} vs ${d.match.away_short}?`,
      options,
    };
  }

  // 0-0 or no goals — ask about the match quality
  return {
    question: `Kako ocjenjujete utakmicu ${d.match.home_short} vs ${d.match.away_short}?`,
    options: ['Odlična utakmica', 'Prosječna', 'Razočaravajuća', 'Nisam gledao/la'],
  };
}

function generateQuiz(d: NormalizedSnapshot['data']): {
  title: string;
  questions: Array<{ question: string; options: string[]; correct: number }>;
} {
  const questions: Array<{ question: string; options: string[]; correct: number }> = [];

  // Q1: Who scored? (if goals exist)
  const goals = d.events.filter(e => e.type === 'goal' || e.type === 'penalty');
  if (goals.length > 0) {
    const scorer = goals[0];
    const wrongPlayers = d.players
      .filter(p => p.id !== scorer.player_id && p.goals === 0)
      .slice(0, 3)
      .map(p => p.name);

    if (wrongPlayers.length >= 2) {
      const options = [scorer.player_name, ...wrongPlayers.slice(0, 3)];
      questions.push({
        question: `Ko je postigao gol u ${scorer.minute}. minuti?`,
        options,
        correct: 0,
      });
    }
  }

  // Q2: What was the final score?
  const correct = `${d.match.score_home}:${d.match.score_away}`;
  const wrongScores = generateWrongScores(d.match.score_home, d.match.score_away);
  questions.push({
    question: `Koji je bio konačan rezultat?`,
    options: [correct, ...wrongScores],
    correct: 0,
  });

  return {
    title: `Kviz: ${d.match.home_short} vs ${d.match.away_short}`,
    questions,
  };
}

function generateWrongScores(home: number, away: number): string[] {
  const wrong: string[] = [];
  wrong.push(`${home + 1}:${away}`);
  wrong.push(`${home}:${away + 1}`);
  if (home > 0) wrong.push(`${home - 1}:${away}`);
  else wrong.push(`${away}:${home}`);
  return wrong.slice(0, 3);
}
