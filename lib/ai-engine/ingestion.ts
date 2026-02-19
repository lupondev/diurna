import { v4 as uuidv4 } from 'uuid';
import type {
  ArticleType,
  NormalizedSnapshot,
  MatchData,
  MatchEvent,
  MatchStats,
  PlayerData,
} from './types';

// Auto-assign event weights
const EVENT_WEIGHTS: Record<MatchEvent['type'], number> = {
  goal: 5,
  red_card: 4,
  penalty: 4,
  injury: 3,
  tactical_change: 3,
  yellow_card: 2,
  substitution: 1,
};

// Source weights for confidence calculation
const SOURCE_WEIGHTS: Record<string, number> = {
  opta: 1.0,
  official_league: 0.95,
  'api-football': 0.85,
  secondary: 0.70,
};

/**
 * Ingest match data from API-Football and normalize into a snapshot.
 * Uses the existing API-Football integration from Diurna.
 */
export async function ingestMatchData(
  matchId: string,
  articleType: ArticleType
): Promise<NormalizedSnapshot> {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) throw new Error('API_FOOTBALL_KEY not configured');

  const fetchedAt = new Date().toISOString();
  let fixtureResponse: ApiFootballFixtureResponse;

  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures?id=${matchId}`,
      { headers: { 'x-apisports-key': apiKey }, next: { revalidate: 0 } }
    );
    if (!res.ok) throw new Error(`API-Football returned ${res.status}`);
    fixtureResponse = await res.json() as ApiFootballFixtureResponse;
  } catch (err) {
    return {
      snapshot_id: uuidv4(),
      snapshot_timestamp: fetchedAt,
      article_type: articleType,
      confidence_score: 0,
      conflict_status: 'clean',
      sources_used: [{
        source: 'api-football',
        weight: SOURCE_WEIGHTS['api-football'],
        fetched_at: fetchedAt,
        status: 'error',
      }],
      data: emptyMatchData(),
    };
  }

  const normalizedData = normalizeApiFootball(fixtureResponse);

  return {
    snapshot_id: uuidv4(),
    snapshot_timestamp: fetchedAt,
    article_type: articleType,
    confidence_score: SOURCE_WEIGHTS['api-football'],
    conflict_status: 'clean',
    sources_used: [{
      source: 'api-football',
      weight: SOURCE_WEIGHTS['api-football'],
      fetched_at: fetchedAt,
      status: 'ok',
    }],
    data: normalizedData,
  };
}

/**
 * Create a snapshot from pre-existing data (for testing or manual input).
 */
export function createSnapshotFromData(
  data: MatchData,
  articleType: ArticleType,
  source: string = 'manual'
): NormalizedSnapshot {
  return {
    snapshot_id: uuidv4(),
    snapshot_timestamp: new Date().toISOString(),
    article_type: articleType,
    confidence_score: SOURCE_WEIGHTS[source] ?? 0.70,
    conflict_status: 'clean',
    sources_used: [{
      source,
      weight: SOURCE_WEIGHTS[source] ?? 0.70,
      fetched_at: new Date().toISOString(),
      status: 'ok',
    }],
    data,
  };
}

// ===== API-Football Response Types =====

interface ApiFootballFixtureResponse {
  response?: ApiFootballFixture[];
}

interface ApiFootballFixture {
  fixture: {
    id: number;
    date: string;
    referee: string | null;
    venue: { name: string | null; capacity: number | null } | null;
  };
  league: { name: string; round: string | null };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: { home: number | null; away: number | null };
  score: Record<string, unknown>;
  events?: ApiFootballEvent[];
  statistics?: ApiFootballTeamStats[];
  lineups?: unknown[];
  players?: ApiFootballTeamPlayers[];
}

interface ApiFootballEvent {
  type: string;
  detail: string;
  time: { elapsed: number | null; extra: number | null };
  team: { id: number; name: string } | null;
  player: { id: number | null; name: string | null } | null;
  assist: { id: number | null; name: string | null } | null;
}

interface ApiFootballTeamStats {
  team: { id: number };
  statistics: { type: string; value: string | number | null }[];
}

interface ApiFootballTeamPlayers {
  team: { id: number };
  players: {
    player: { id: number; name: string; nationality: string | null; age: number | null; photo: string | null };
    statistics: {
      games: { position: string | null; rating: string | null; minutes: number | null };
      goals: { total: number | null; assists: number | null };
      cards: { yellow: number | null; red: number | null };
    }[];
  }[];
}

// ===== Normalization Functions =====

function normalizeApiFootball(response: ApiFootballFixtureResponse): MatchData {
  const fixture = response.response?.[0];
  if (!fixture) throw new Error('No fixture data in API-Football response');

  const teams = fixture.teams;
  const goals = fixture.goals;
  const events = fixture.events || [];
  const stats = fixture.statistics || [];
  const players = fixture.players || [];

  return {
    match: {
      home: teams.home.name,
      away: teams.away.name,
      home_short: teams.home.name.substring(0, 3).toUpperCase(),
      away_short: teams.away.name.substring(0, 3).toUpperCase(),
      score_home: goals.home ?? 0,
      score_away: goals.away ?? 0,
      date: fixture.fixture.date?.split('T')[0] || '',
      kickoff: fixture.fixture.date || '',
      competition: fixture.league.name,
      round: fixture.league.round || '',
      venue: fixture.fixture.venue?.name || '',
      referee: fixture.fixture.referee || '',
      attendance: fixture.fixture.venue?.capacity || null,
    },
    events: normalizeEvents(events, teams),
    stats: normalizeStats(stats),
    players: normalizePlayers(players, teams),
    standings: null,
  };
}

function normalizeEvents(
  events: ApiFootballEvent[],
  teams: { home: { id: number }; away: { id: number } }
): MatchEvent[] {
  return events.map((e, i) => {
    let type: MatchEvent['type'] = 'substitution';
    if (e.type === 'Goal') type = e.detail === 'Penalty' ? 'penalty' : 'goal';
    else if (e.type === 'Card' && e.detail === 'Red Card') type = 'red_card';
    else if (e.type === 'Card' && e.detail === 'Yellow Card') type = 'yellow_card';
    else if (e.type === 'subst') type = 'substitution';

    const teamSide: 'home' | 'away' = e.team?.id === teams.home.id ? 'home' : 'away';

    return {
      id: `${type}_${i + 1}`,
      type,
      minute: e.time?.elapsed || 0,
      added_time: e.time?.extra || null,
      player_id: String(e.player?.id || ''),
      player_name: e.player?.name || '',
      team: teamSide,
      detail: e.detail || '',
      assist_player_id: e.assist?.id ? String(e.assist.id) : null,
      assist_player_name: e.assist?.name || null,
      weight: EVENT_WEIGHTS[type] || 1,
    };
  });
}

function normalizeStats(statistics: ApiFootballTeamStats[]): MatchStats {
  const home = statistics[0]?.statistics || [];
  const away = statistics[1]?.statistics || [];

  const getStat = (arr: { type: string; value: string | number | null }[], name: string): number => {
    const found = arr.find(s => s.type === name);
    if (!found || found.value === null) return 0;
    const val = found.value;
    if (typeof val === 'string' && val.includes('%')) return parseFloat(val);
    return typeof val === 'number' ? val : parseFloat(val) || 0;
  };

  return {
    possession_home: getStat(home, 'Ball Possession'),
    possession_away: getStat(away, 'Ball Possession'),
    shots_home: getStat(home, 'Total Shots'),
    shots_away: getStat(away, 'Total Shots'),
    shots_on_target_home: getStat(home, 'Shots on Goal'),
    shots_on_target_away: getStat(away, 'Shots on Goal'),
    xg_home: getStat(home, 'expected_goals') || null,
    xg_away: getStat(away, 'expected_goals') || null,
    corners_home: getStat(home, 'Corner Kicks'),
    corners_away: getStat(away, 'Corner Kicks'),
    fouls_home: getStat(home, 'Fouls'),
    fouls_away: getStat(away, 'Fouls'),
    yellow_cards_home: getStat(home, 'Yellow Cards'),
    yellow_cards_away: getStat(away, 'Yellow Cards'),
    red_cards_home: getStat(home, 'Red Cards'),
    red_cards_away: getStat(away, 'Red Cards'),
    dangerous_attacks_home: null,
    dangerous_attacks_away: null,
  };
}

function normalizePlayers(
  playersData: ApiFootballTeamPlayers[],
  teams: { home: { id: number }; away: { id: number } }
): PlayerData[] {
  const result: PlayerData[] = [];
  for (const teamPlayers of playersData) {
    const teamSide: 'home' | 'away' = teamPlayers.team?.id === teams.home.id ? 'home' : 'away';
    for (const p of teamPlayers.players || []) {
      const stats = p.statistics?.[0];
      result.push({
        id: String(p.player?.id || ''),
        name: p.player?.name || '',
        team: teamSide,
        position: stats?.games?.position || '',
        nationality: p.player?.nationality || '',
        age: p.player?.age || 0,
        rating: stats?.games?.rating ? parseFloat(stats.games.rating) : null,
        goals: stats?.goals?.total || 0,
        assists: stats?.goals?.assists || 0,
        yellow_cards: stats?.cards?.yellow || 0,
        red_cards: stats?.cards?.red || 0,
        minutes_played: stats?.games?.minutes || 0,
        market_value: null,
        photo_url: p.player?.photo || null,
        db_player_id: null,
      });
    }
  }
  return result;
}

function emptyMatchData(): MatchData {
  return {
    match: {
      home: '', away: '', home_short: '', away_short: '',
      score_home: 0, score_away: 0, date: '', kickoff: '',
      competition: '', round: '', venue: '', referee: '', attendance: null,
    },
    events: [],
    stats: {
      possession_home: 0, possession_away: 0,
      shots_home: 0, shots_away: 0,
      shots_on_target_home: 0, shots_on_target_away: 0,
      xg_home: null, xg_away: null,
      corners_home: 0, corners_away: 0,
      fouls_home: 0, fouls_away: 0,
      yellow_cards_home: 0, yellow_cards_away: 0,
      red_cards_home: 0, red_cards_away: 0,
      dangerous_attacks_home: null, dangerous_attacks_away: null,
    },
    players: [],
    standings: null,
  };
}
