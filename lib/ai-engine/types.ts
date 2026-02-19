// ===== CORE TYPES =====

export interface NormalizedSnapshot {
  snapshot_id: string;
  snapshot_timestamp: string;
  article_type: ArticleType;
  confidence_score: number;
  conflict_status: 'clean' | 'conflicted';
  sources_used: SourceReport[];
  data: MatchData;
}

export type ArticleType = 'match_report' | 'preview' | 'tactical_analysis' | 'transfer' | 'historical_recap';

export interface SourceReport {
  source: string;
  weight: number;
  fetched_at: string;
  status: 'ok' | 'error' | 'timeout';
}

export interface MatchData {
  match: {
    home: string;
    away: string;
    home_short: string;
    away_short: string;
    score_home: number;
    score_away: number;
    date: string;
    kickoff: string;
    competition: string;
    round: string;
    venue: string;
    referee: string;
    attendance: number | null;
  };
  events: MatchEvent[];
  stats: MatchStats;
  players: PlayerData[];
  standings: StandingsContext | null;
}

export interface MatchEvent {
  id: string;
  type: 'goal' | 'red_card' | 'penalty' | 'injury' | 'yellow_card' | 'substitution' | 'tactical_change';
  minute: number;
  added_time: number | null;
  player_id: string;
  player_name: string;
  team: 'home' | 'away';
  detail: string;
  assist_player_id: string | null;
  assist_player_name: string | null;
  weight: number;
}

export interface MatchStats {
  possession_home: number;
  possession_away: number;
  shots_home: number;
  shots_away: number;
  shots_on_target_home: number;
  shots_on_target_away: number;
  xg_home: number | null;
  xg_away: number | null;
  corners_home: number;
  corners_away: number;
  fouls_home: number;
  fouls_away: number;
  yellow_cards_home: number;
  yellow_cards_away: number;
  red_cards_home: number;
  red_cards_away: number;
  dangerous_attacks_home: number | null;
  dangerous_attacks_away: number | null;
}

export interface PlayerData {
  id: string;
  name: string;
  team: 'home' | 'away';
  position: string;
  nationality: string;
  age: number;
  rating: number | null;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  minutes_played: number;
  market_value: string | null;
  photo_url: string | null;
  db_player_id: string | null;
}

export interface StandingsContext {
  home_position: number | null;
  away_position: number | null;
  home_form: string | null;
  away_form: string | null;
}

// ===== CDI TYPES =====

export type ToneLevel = 'neutral' | 'balanced' | 'strong' | 'dominant';

export interface CDIResult {
  home: number;
  away: number;
  home_tone: ToneLevel;
  away_tone: ToneLevel;
}

// ===== VALIDATION TYPES =====

export interface ValidationResult {
  passed: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  type: string;
  message: string;
  severity: 'critical' | 'warning';
  context?: string;
}

export interface CoverageResult extends ValidationResult {
  score: number;
  missing_critical: string[];
}

export interface ToneResult extends ValidationResult {
  violations: ToneViolation[];
}

export interface ToneViolation {
  word: string;
  cdi_range: string;
  allowed_range: string;
}

export interface EntityResult extends ValidationResult {
  unmatched_entities: string[];
}

export interface MasterValidationResult {
  passed: boolean;
  numeric: ValidationResult;
  coverage: CoverageResult;
  tone: ToneResult;
  entity: EntityResult;
  retry_instructions: string | null;
}

export interface GeneratedArticle {
  title: string;
  excerpt: string;
  content_html: string;
  tags: string[];
  // Optional — extracted from content_html by validators, not from LLM output
  entities_used?: { name: string; id: string; mentions: number }[];
  events_covered?: string[];
  numbers_used?: { value: string; source_field: string }[];
}
