'use client';

import { useState } from 'react';

interface TimingEntry {
  step: string;
  duration_ms: number;
  status: 'ok' | 'error' | 'skipped';
  detail?: string;
}

interface ValidationErrorDetail {
  type: string;
  message: string;
  severity: string;
  context?: string;
}

interface PipelineResult {
  article?: {
    title: string;
    excerpt: string;
    content_html: string;
    tags: string[];
  };
  pipeline?: {
    snapshot_id: string;
    confidence: number;
    language?: string;
    staleness: { status: string; age_seconds: number; window_seconds: number };
    cdi: { home: number; away: number; home_tone: string; away_tone: string };
    validation: {
      passed: boolean;
      retries: number;
      numeric: { passed: boolean; errors: number };
      coverage: { passed: boolean; score: number; missing: string[] };
      tone: { passed: boolean; violations: number };
      entity: { passed: boolean; unmatched: string[] };
    };
    validation_details?: {
      numeric: { passed: boolean; errors: ValidationErrorDetail[] };
      coverage: { passed: boolean; score: number; missing_critical: string[]; errors: ValidationErrorDetail[] };
      tone: { passed: boolean; violations: { word: string; cdi_range: string; allowed_range: string }[]; errors: ValidationErrorDetail[] };
      entity: { passed: boolean; unmatched_entities: string[]; errors: ValidationErrorDetail[] };
    };
    quality_analysis?: {
      frcl: {
        fri: number;
        status: string;
        subjectivity_score: number;
        subjectivity_flagged: { word: string; weight: number; context: string }[];
        omission_risk: number;
        omission_missing: string[];
      };
      perspective: {
        home_mentions: number;
        away_mentions: number;
        ratio: number;
        first_sentence_neutral: boolean;
        status: string;
      };
    };
    style_refinement?: {
      applied: boolean;
      changes_made: string[];
      style_score: number;
      original_content_html: string;
      fallback_to_original: boolean;
      tokens_in: number;
      tokens_out: number;
    } | null;
    post_style_validation?: {
      passed: boolean;
      numeric: boolean;
      tone: boolean;
      events_preserved: boolean;
      numbers_preserved: boolean;
    } | null;
    widgets: { placements: number; decisions: string[] } | null;
    assembly: { widgets_inserted: number; log: string[] } | null;
    video: {
      video: { video_id: string; title: string; channel: string } | null;
      search_query: string;
      candidates_found: number;
      decision: string;
      timing_ms: number;
    } | null;
    llm: { model: string; tokens_in: number; tokens_out: number; retries: number };
    timing: { steps: TimingEntry[]; total_ms: number };
  };
  error?: string;
  detail?: string;
}

// ═══ Mock Match Data (Benfica 0-1 Real Madrid) ═══
const MOCK_MATCH_DATA = {
  match: {
    home: 'Benfica', away: 'Real Madrid',
    home_short: 'BEN', away_short: 'RMA',
    score_home: 0, score_away: 1,
    date: '2026-02-18', kickoff: '2026-02-18T21:00:00+01:00',
    competition: 'Liga Prvaka', round: 'Play-off, 1. utakmica',
    venue: 'Estádio da Luz', referee: 'Slavko Vinčić', attendance: 64642,
  },
  events: [
    { id: 'goal_1', type: 'goal', minute: 67, added_time: null, player_id: '1100', player_name: 'Vinícius Júnior', team: 'away', detail: 'Normal Goal', assist_player_id: '1101', assist_player_name: 'Jude Bellingham', weight: 5 },
    { id: 'yellow_card_1', type: 'yellow_card', minute: 34, added_time: null, player_id: '1200', player_name: 'Nicolás Otamendi', team: 'home', detail: 'Yellow Card', assist_player_id: null, assist_player_name: null, weight: 2 },
    { id: 'yellow_card_2', type: 'yellow_card', minute: 58, added_time: null, player_id: '1201', player_name: 'Gianluca Prestianni', team: 'home', detail: 'Yellow Card', assist_player_id: null, assist_player_name: null, weight: 2 },
    { id: 'yellow_card_3', type: 'yellow_card', minute: 73, added_time: null, player_id: '1202', player_name: 'Fredrik Aursnes', team: 'home', detail: 'Yellow Card', assist_player_id: null, assist_player_name: null, weight: 2 },
    { id: 'yellow_card_4', type: 'yellow_card', minute: 81, added_time: null, player_id: '1102', player_name: 'Federico Valverde', team: 'away', detail: 'Yellow Card', assist_player_id: null, assist_player_name: null, weight: 2 },
    { id: 'substitution_1', type: 'substitution', minute: 70, added_time: null, player_id: '1203', player_name: 'Ángel Di María', team: 'home', detail: 'Substitution', assist_player_id: null, assist_player_name: null, weight: 1 },
    { id: 'substitution_2', type: 'substitution', minute: 78, added_time: null, player_id: '1103', player_name: 'Rodrygo', team: 'away', detail: 'Substitution', assist_player_id: null, assist_player_name: null, weight: 1 },
  ],
  stats: {
    possession_home: 45, possession_away: 55,
    shots_home: 12, shots_away: 18,
    shots_on_target_home: 4, shots_on_target_away: 7,
    xg_home: null, xg_away: null,
    corners_home: 5, corners_away: 8,
    fouls_home: 14, fouls_away: 11,
    yellow_cards_home: 3, yellow_cards_away: 1,
    red_cards_home: 0, red_cards_away: 0,
    dangerous_attacks_home: null, dangerous_attacks_away: null,
  },
  players: [
    { id: '1100', name: 'Vinícius Júnior', team: 'away', position: 'LW', nationality: 'Brazil', age: 25, rating: 8.2, goals: 1, assists: 0, yellow_cards: 0, red_cards: 0, minutes_played: 90, market_value: '€150M', photo_url: null, db_player_id: null },
    { id: '1101', name: 'Jude Bellingham', team: 'away', position: 'CM', nationality: 'England', age: 22, rating: 7.8, goals: 0, assists: 1, yellow_cards: 0, red_cards: 0, minutes_played: 90, market_value: '€120M', photo_url: null, db_player_id: null },
    { id: '1102', name: 'Federico Valverde', team: 'away', position: 'CM', nationality: 'Uruguay', age: 27, rating: 7.1, goals: 0, assists: 0, yellow_cards: 1, red_cards: 0, minutes_played: 90, market_value: '€100M', photo_url: null, db_player_id: null },
    { id: '1103', name: 'Rodrygo', team: 'away', position: 'RW', nationality: 'Brazil', age: 25, rating: 6.8, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, minutes_played: 78, market_value: '€80M', photo_url: null, db_player_id: null },
    { id: '1200', name: 'Nicolás Otamendi', team: 'home', position: 'CB', nationality: 'Argentina', age: 37, rating: 6.2, goals: 0, assists: 0, yellow_cards: 1, red_cards: 0, minutes_played: 90, market_value: '€3M', photo_url: null, db_player_id: null },
    { id: '1201', name: 'Gianluca Prestianni', team: 'home', position: 'RW', nationality: 'Argentina', age: 18, rating: 5.8, goals: 0, assists: 0, yellow_cards: 1, red_cards: 0, minutes_played: 90, market_value: '€15M', photo_url: null, db_player_id: null },
    { id: '1202', name: 'Fredrik Aursnes', team: 'home', position: 'CM', nationality: 'Norway', age: 26, rating: 6.5, goals: 0, assists: 0, yellow_cards: 1, red_cards: 0, minutes_played: 90, market_value: '€20M', photo_url: null, db_player_id: null },
    { id: '1203', name: 'Ángel Di María', team: 'home', position: 'RW', nationality: 'Argentina', age: 37, rating: 6.0, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, minutes_played: 70, market_value: '€5M', photo_url: null, db_player_id: null },
  ],
  standings: null,
};

const AI_LANGUAGE_OPTIONS = [
  { code: 'bs', label: 'Bosanski', flag: '🇧🇦' },
  { code: 'hr', label: 'Hrvatski', flag: '🇭🇷' },
  { code: 'sr-cyrl', label: 'Srpski (Ćir)', flag: '🇷🇸' },
  { code: 'sr-latn', label: 'Srpski (Lat)', flag: '🇷🇸' },
  { code: 'cnj', label: 'Crnogorski', flag: '🇲🇪' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
];

export default function AIEngineDashboard() {
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLanguage, setAiLanguage] = useState('bs');
  const [activeTab, setActiveTab] = useState<'article' | 'pipeline' | 'quality' | 'style' | 'timing' | 'widgets' | 'raw'>('article');

  async function runEngine() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ai/engine', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchData: MOCK_MATCH_DATA,
          articleType: 'match_report',
          maxRetries: 2,
          includeVideo: true,
          includeWidgets: true,
          includeStyleRefinement: true,
          language: aiLanguage,
        }),
      });

      if (res.redirected) {
        setResult({ error: `Auth redirect to: ${res.url}. Please log in first.` });
        setLoading(false);
        return;
      }

      const rawText = await res.text();
      console.log('[AI Engine Dashboard] Status:', res.status, '| Content-Type:', res.headers.get('content-type'));
      console.log('[AI Engine Dashboard] Raw response length:', rawText.length);
      console.log('[AI Engine Dashboard] Raw response (first 500):', rawText.substring(0, 500));

      if (!res.ok) {
        let errorMsg = `HTTP ${res.status}: `;
        try {
          const errData = JSON.parse(rawText);
          errorMsg += errData?.error || errData?.message || rawText.substring(0, 200);
        } catch {
          errorMsg += rawText.substring(0, 200) || res.statusText;
        }
        setResult({ error: errorMsg });
        setLoading(false);
        return;
      }

      let data: PipelineResult;
      try {
        data = JSON.parse(rawText) as PipelineResult;
      } catch (parseErr) {
        console.error('[AI Engine Dashboard] JSON parse failed:', parseErr);
        setResult({ error: `JSON parse failed: ${parseErr instanceof Error ? parseErr.message : 'unknown'}`, detail: rawText.substring(0, 300) });
        setLoading(false);
        return;
      }

      console.log('[AI Engine Dashboard] Parsed result:', data);
      setResult(data);
    } catch (err) {
      console.error('[AI Engine Dashboard] Fetch error:', err);
      setResult({ error: err instanceof Error ? err.message : 'Unknown network error' });
    }
    setLoading(false);
  }

  const qa = result?.pipeline?.quality_analysis;

  return (
    <div style={{ padding: '32px', maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>AI Engine V2 — Test Dashboard</h1>
        <p style={{ color: '#6b7280', fontSize: 14 }}>
          Pipeline: Ingestion → CDI → Prompt → LLM → Validation → FRCL → Perspective → Style Refinement → Post-Style Validation → Widgets → Assembly
        </p>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24, padding: 16, background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Test Match</div>
          <div style={{ color: '#6b7280', fontSize: 13 }}>Benfica 0-1 Real Madrid — Liga Prvaka Play-off</div>
        </div>
        <select
          value={aiLanguage}
          onChange={(e) => setAiLanguage(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db',
            fontSize: 13, fontWeight: 500, background: 'white', cursor: 'pointer',
          }}
        >
          {AI_LANGUAGE_OPTIONS.map((l) => (
            <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
          ))}
        </select>
        <button
          onClick={runEngine}
          disabled={loading}
          style={{
            padding: '10px 24px',
            background: loading ? '#9ca3af' : '#2563eb',
            color: 'white', border: 'none', borderRadius: 8,
            fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14,
          }}
        >
          {loading ? 'Running Pipeline...' : 'Run AI Engine'}
        </button>
      </div>

      {result?.error && (
        <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, marginBottom: 24 }}>
          <div style={{ fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>Error</div>
          <div style={{ color: '#991b1b', fontSize: 14 }}>{result.error}</div>
          {result.detail && <div style={{ color: '#b91c1c', fontSize: 13, marginTop: 4 }}>{result.detail}</div>}
        </div>
      )}

      {result?.article && result?.pipeline && (
        <>
          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
            <StatCard label="Total Time" value={`${result.pipeline?.timing?.total_ms ?? '?'}ms`} color={(result.pipeline?.timing?.total_ms ?? 99999) < 15000 ? '#059669' : '#dc2626'} />
            <StatCard label="Validation" value={result.pipeline?.validation?.passed ? 'PASSED' : 'FAILED'} color={result.pipeline?.validation?.passed ? '#059669' : '#dc2626'} />
            <StatCard label="FRCL" value={qa?.frcl?.status ?? 'N/A'} color={qa?.frcl?.status === 'SAFE' ? '#059669' : qa?.frcl?.status === 'WARNING' ? '#d97706' : '#dc2626'} />
            <StatCard label="FRI Score" value={`${qa?.frcl?.fri ?? 'N/A'}`} color={((qa?.frcl?.fri ?? 1) < 0.15) ? '#059669' : '#d97706'} />
            <StatCard label="Perspective" value={qa?.perspective?.status ?? 'N/A'} color={qa?.perspective?.status === 'PASS' ? '#059669' : qa?.perspective?.status === 'REVIEW' ? '#d97706' : '#dc2626'} />
            <StatCard label="Balance" value={`${qa?.perspective?.ratio ?? '?'}`} color={((qa?.perspective?.ratio ?? 0) >= 0.4) ? '#059669' : '#dc2626'} />
            <StatCard label="Style" value={result.pipeline?.style_refinement?.applied ? (result.pipeline?.style_refinement?.fallback_to_original ? 'FALLBACK' : 'REFINED') : 'ORIGINAL'} color={result.pipeline?.style_refinement?.applied && !result.pipeline?.style_refinement?.fallback_to_original ? '#2563eb' : '#6b7280'} />
            <StatCard label="Post-Style" value={result.pipeline?.post_style_validation?.passed ? 'PASSED' : (result.pipeline?.post_style_validation ? 'FAILED' : 'N/A')} color={result.pipeline?.post_style_validation?.passed ? '#059669' : '#dc2626'} />
            <StatCard label="Language" value={result.pipeline?.language?.toUpperCase() ?? '?'} color="#2563eb" />
            <StatCard label="LLM Retries" value={`${result.pipeline?.llm?.retries ?? '?'}`} color={(result.pipeline?.llm?.retries ?? 1) === 0 ? '#059669' : '#d97706'} />
            <StatCard label="Coverage" value={`${result.pipeline?.validation?.coverage?.score ?? '?'}%`} color={result.pipeline?.validation?.coverage?.passed ? '#059669' : '#dc2626'} />
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #e5e7eb' }}>
            {(['article', 'pipeline', 'quality', 'style', 'timing', 'widgets', 'raw'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 16px',
                  background: activeTab === tab ? '#2563eb' : 'transparent',
                  color: activeTab === tab ? 'white' : '#6b7280',
                  border: 'none', borderRadius: '8px 8px 0 0',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
            {activeTab === 'article' && <ArticleTab article={result.article} />}
            {activeTab === 'pipeline' && result.pipeline && <PipelineTab pipeline={result.pipeline} />}
            {activeTab === 'quality' && result.pipeline && <QualityTab pipeline={result.pipeline} />}
            {activeTab === 'style' && result.pipeline && <StyleTab pipeline={result.pipeline} />}
            {activeTab === 'timing' && result.pipeline?.timing && <TimingTab timing={result.pipeline.timing} />}
            {activeTab === 'widgets' && <WidgetsTab widgets={result.pipeline?.widgets ?? null} assembly={result.pipeline?.assembly ?? null} video={result.pipeline?.video ?? null} />}
            {activeTab === 'raw' && <RawTab data={result} />}
          </div>
        </>
      )}
    </div>
  );
}

// ═══ Stat Card ═══

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: 16, background: 'white', border: '1px solid #e5e7eb', borderRadius: 12 }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

// ═══ Article Tab ═══

function ArticleTab({ article }: { article: PipelineResult['article'] }) {
  if (!article) return null;
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{article.title}</h2>
      <p style={{ color: '#6b7280', marginBottom: 16, fontStyle: 'italic' }}>{article.excerpt}</p>
      <div dangerouslySetInnerHTML={{ __html: article.content_html }} style={{ lineHeight: 1.7, fontSize: 15 }} />
      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(article.tags ?? []).map(tag => (
          <span key={tag} style={{ padding: '4px 10px', background: '#eff6ff', color: '#2563eb', borderRadius: 6, fontSize: 12, fontWeight: 500 }}>{tag}</span>
        ))}
      </div>
    </div>
  );
}

// ═══ Pipeline Tab ═══

function PipelineTab({ pipeline }: { pipeline: NonNullable<PipelineResult['pipeline']> }) {
  const vd = pipeline.validation_details;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Section title="Data Snapshot">
        <Row label="Snapshot ID" value={pipeline.snapshot_id ?? 'N/A'} />
        <Row label="Confidence" value={`${((pipeline.confidence ?? 0) * 100).toFixed(0)}%`} />
      </Section>

      <Section title="Staleness Guard">
        <Row label="Status" value={pipeline.staleness?.status ?? 'N/A'} color={pipeline.staleness?.status === 'OK' ? '#059669' : '#dc2626'} />
        <Row label="Age" value={`${pipeline.staleness?.age_seconds?.toFixed?.(0) ?? 'N/A'}s`} />
        <Row label="Window" value={`${pipeline.staleness?.window_seconds ?? 'N/A'}s`} />
      </Section>

      <Section title="CDI (Contextual Dominance Index)">
        <Row label="Home" value={`${pipeline.cdi?.home ?? '?'} — ${pipeline.cdi?.home_tone ?? '?'}`} />
        <Row label="Away" value={`${pipeline.cdi?.away ?? '?'} — ${pipeline.cdi?.away_tone ?? '?'}`} />
      </Section>

      <Section title="Validation Pipeline">
        <Row label="Overall" value={pipeline.validation?.passed ? 'PASSED' : 'FAILED'} color={pipeline.validation?.passed ? '#059669' : '#dc2626'} />
        <Row label="Retries" value={`${pipeline.validation?.retries ?? '?'}`} />
        <Row label="Numeric" value={pipeline.validation?.numeric?.passed ? 'PASS' : `FAIL (${pipeline.validation?.numeric?.errors ?? '?'} errors)`} color={pipeline.validation?.numeric?.passed ? '#059669' : '#dc2626'} />
        <Row label="Coverage" value={`${pipeline.validation?.coverage?.passed ? 'PASS' : 'FAIL'} — ${pipeline.validation?.coverage?.score ?? '?'}%`} color={pipeline.validation?.coverage?.passed ? '#059669' : '#dc2626'} />
        <Row label="Tone" value={pipeline.validation?.tone?.passed ? 'PASS' : `FAIL (${pipeline.validation?.tone?.violations ?? '?'} violations)`} color={pipeline.validation?.tone?.passed ? '#059669' : '#dc2626'} />
        <Row label="Entity" value={pipeline.validation?.entity?.passed ? 'PASS' : `FAIL (${pipeline.validation?.entity?.unmatched?.join(', ') ?? 'N/A'})`} color={pipeline.validation?.entity?.passed ? '#059669' : '#dc2626'} />
      </Section>

      {/* Detailed Validation Errors */}
      {vd && (
        <Section title="Validation Details (all errors)">
          {[
            ...(vd.numeric?.errors ?? []),
            ...(vd.coverage?.errors ?? []),
            ...(vd.tone?.errors ?? []),
            ...(vd.entity?.errors ?? []),
          ].length === 0 ? (
            <div style={{ fontSize: 13, color: '#059669' }}>No validation errors</div>
          ) : (
            [...(vd.numeric?.errors ?? []), ...(vd.coverage?.errors ?? []), ...(vd.tone?.errors ?? []), ...(vd.entity?.errors ?? [])].map((err, i) => (
              <div key={i} style={{ padding: '6px 0', fontSize: 13, borderBottom: '1px solid #f3f4f6', color: err.severity === 'critical' ? '#dc2626' : '#d97706' }}>
                <span style={{ fontWeight: 600 }}>[{err.type}]</span> {err.message}
                {err.context && <span style={{ color: '#6b7280' }}> — {err.context}</span>}
              </div>
            ))
          )}
        </Section>
      )}

      <Section title="LLM">
        <Row label="Model" value={pipeline.llm?.model ?? 'N/A'} />
        <Row label="Tokens In" value={`${pipeline.llm?.tokens_in ?? '?'}`} />
        <Row label="Tokens Out" value={`${pipeline.llm?.tokens_out ?? '?'}`} />
        <Row label="Retries" value={`${pipeline.llm?.retries ?? '?'}`} />
      </Section>
    </div>
  );
}

// ═══ Quality Tab (FRCL + Perspective) ═══

function QualityTab({ pipeline }: { pipeline: NonNullable<PipelineResult['pipeline']> }) {
  const qa = pipeline.quality_analysis;
  if (!qa) return <div style={{ color: '#6b7280', fontSize: 13 }}>Quality analysis not available</div>;

  const frcl = qa.frcl;
  const persp = qa.perspective;
  const friColor = frcl.status === 'SAFE' ? '#059669' : frcl.status === 'WARNING' ? '#d97706' : '#dc2626';
  const perspColor = persp.status === 'PASS' ? '#059669' : persp.status === 'REVIEW' ? '#d97706' : '#dc2626';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* FRCL Overview */}
      <Section title={`FRCL — Framing Risk (FRI: ${frcl.fri})`}>
        <Row label="Status" value={frcl.status} color={friColor} />
        <Row label="FRI Score" value={`${frcl.fri}`} color={friColor} />
        <Row label="Subjectivity" value={`${frcl.subjectivity_score}`} color={frcl.subjectivity_score > 0.018 ? '#d97706' : '#059669'} />
        <Row label="Omission Risk" value={`${frcl.omission_risk}`} color={frcl.omission_risk > 0 ? '#dc2626' : '#059669'} />
      </Section>

      {/* Subjectivity Flagged Words */}
      {frcl.subjectivity_flagged.length > 0 && (
        <Section title={`Subjectivity — ${frcl.subjectivity_flagged.length} flagged words`}>
          {frcl.subjectivity_flagged.map((f, i) => (
            <div key={i} style={{ padding: '6px 0', fontSize: 13, borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{
                padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                background: f.weight >= 3 ? '#fef2f2' : f.weight >= 2 ? '#fffbeb' : '#f0fdf4',
                color: f.weight >= 3 ? '#dc2626' : f.weight >= 2 ? '#d97706' : '#059669',
              }}>
                W{f.weight}
              </span>
              <span style={{ fontWeight: 600 }}>{f.word}</span>
              <span style={{ color: '#6b7280', fontFamily: 'monospace', fontSize: 12 }}>...{f.context}...</span>
            </div>
          ))}
        </Section>
      )}

      {/* Omission Missing */}
      {frcl.omission_missing.length > 0 && (
        <Section title={`Omission — ${frcl.omission_missing.length} missing events`}>
          {frcl.omission_missing.map((m, i) => (
            <div key={i} style={{ padding: '4px 0', fontSize: 13, color: '#dc2626' }}>{m}</div>
          ))}
        </Section>
      )}

      {/* Perspective Balance */}
      <Section title="Perspective Balance">
        <Row label="Status" value={persp.status} color={perspColor} />
        <Row label="Home Mentions" value={`${persp.home_mentions}`} />
        <Row label="Away Mentions" value={`${persp.away_mentions}`} />
        <Row label="Balance Ratio" value={`${persp.ratio}`} color={persp.ratio >= 0.4 ? '#059669' : '#dc2626'} />
        <Row label="First Sentence Neutral" value={persp.first_sentence_neutral ? 'Yes' : 'No'} color={persp.first_sentence_neutral ? '#059669' : '#d97706'} />
        {/* Visual balance bar */}
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#6b7280', width: 50, textAlign: 'right' }}>Home</span>
          <div style={{ flex: 1, height: 20, background: '#f3f4f6', borderRadius: 10, overflow: 'hidden', display: 'flex' }}>
            <div style={{
              width: `${persp.home_mentions + persp.away_mentions > 0 ? (persp.home_mentions / (persp.home_mentions + persp.away_mentions)) * 100 : 50}%`,
              background: '#2563eb', height: '100%', borderRadius: '10px 0 0 10px',
            }} />
            <div style={{
              flex: 1, background: '#7c3aed', height: '100%', borderRadius: '0 10px 10px 0',
            }} />
          </div>
          <span style={{ fontSize: 12, color: '#6b7280', width: 50 }}>Away</span>
        </div>
      </Section>
    </div>
  );
}

// ═══ Style Tab (Style Refinement + Post-Style Validation) ═══

function StyleTab({ pipeline }: { pipeline: NonNullable<PipelineResult['pipeline']> }) {
  const sr = pipeline.style_refinement;
  const psv = pipeline.post_style_validation;
  const [showOriginal, setShowOriginal] = useState(false);

  if (!sr) return <div style={{ color: '#6b7280', fontSize: 13 }}>Style refinement not available</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Overview */}
      <Section title="Style Refinement Overview">
        <Row label="Applied" value={sr.applied ? (sr.fallback_to_original ? 'Refined but FALLBACK to original' : 'Yes — using refined') : 'No changes'} color={sr.applied && !sr.fallback_to_original ? '#059669' : '#d97706'} />
        <Row label="Style Score" value={`${sr.style_score}/10`} color={sr.style_score >= 7 ? '#059669' : sr.style_score >= 5 ? '#d97706' : '#dc2626'} />
        <Row label="Tokens In" value={`${sr.tokens_in}`} />
        <Row label="Tokens Out" value={`${sr.tokens_out}`} />
        <Row label="Fallback" value={sr.fallback_to_original ? 'YES — post-style validation failed' : 'No'} color={sr.fallback_to_original ? '#dc2626' : '#059669'} />
      </Section>

      {/* Changes Made */}
      {sr.changes_made.length > 0 && (
        <Section title="Changes Made">
          {sr.changes_made.map((c, i) => (
            <div key={i} style={{ padding: '6px 0', fontSize: 13, borderBottom: '1px solid #f3f4f6' }}>
              {c}
            </div>
          ))}
        </Section>
      )}

      {/* Post-Style Validation */}
      {psv && (
        <Section title={`Post-Style Validation — ${psv.passed ? 'PASSED' : 'FAILED'}`}>
          <Row label="Overall" value={psv.passed ? 'PASSED' : 'FAILED'} color={psv.passed ? '#059669' : '#dc2626'} />
          {[
            { key: 'numeric', label: 'Numeric Validation', passed: psv.numeric },
            { key: 'tone', label: 'Tone Validation', passed: psv.tone },
            { key: 'events', label: 'Events Preserved', passed: psv.events_preserved },
            { key: 'numbers', label: 'Numbers Preserved', passed: psv.numbers_preserved },
          ].map((check) => (
            <div key={check.key} style={{ padding: '4px 0', fontSize: 13, borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{
                width: 16, height: 16, borderRadius: '50%', fontSize: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: check.passed ? '#dcfce7' : '#fef2f2', color: check.passed ? '#059669' : '#dc2626',
              }}>
                {check.passed ? '\u2713' : '\u2717'}
              </span>
              <span style={{ fontWeight: 500 }}>{check.label}</span>
              <span style={{ color: check.passed ? '#059669' : '#dc2626', fontSize: 12, marginLeft: 'auto' }}>
                {check.passed ? 'PASS' : 'FAIL'}
              </span>
            </div>
          ))}
        </Section>
      )}

      {/* Original Content (Pass 1) Preview */}
      {sr.applied && sr.original_content_html && (
        <Section title="Original Content (Pass 1 — before refinement)">
          <div style={{ marginBottom: 8 }}>
            <button
              onClick={() => setShowOriginal(!showOriginal)}
              style={{
                padding: '6px 16px', background: showOriginal ? '#6b7280' : '#2563eb',
                color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {showOriginal ? 'Hide Original' : 'Show Original (Pass 1)'}
            </button>
            <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 8 }}>Compare with the Article tab to see refinement changes</span>
          </div>
          {showOriginal && (
            <div dangerouslySetInnerHTML={{ __html: sr.original_content_html }} style={{ lineHeight: 1.7, fontSize: 14, padding: 12, background: '#fefce8', borderRadius: 8, border: '1px solid #fde047', marginTop: 8 }} />
          )}
        </Section>
      )}
    </div>
  );
}

// ═══ Timing Tab ═══

function TimingTab({ timing }: { timing: { steps: TimingEntry[]; total_ms: number } }) {
  const maxMs = Math.max(...timing.steps.map(s => s.duration_ms), 1);
  return (
    <div>
      <div style={{ marginBottom: 16, fontSize: 14, color: '#6b7280' }}>
        Total pipeline time: <strong style={{ color: '#111' }}>{timing.total_ms}ms</strong> ({(timing.total_ms / 1000).toFixed(1)}s)
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {timing.steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 140, fontSize: 13, fontWeight: 500, fontFamily: 'monospace' }}>{step.step}</div>
            <div style={{ flex: 1, position: 'relative', height: 24, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.max((step.duration_ms / maxMs) * 100, 2)}%`,
                background: step.status === 'ok' ? '#2563eb' : step.status === 'error' ? '#dc2626' : '#9ca3af',
                borderRadius: 6, transition: 'width 0.3s',
              }} />
            </div>
            <div style={{ width: 70, textAlign: 'right', fontSize: 13, fontFamily: 'monospace', color: step.status === 'error' ? '#dc2626' : '#374151' }}>
              {step.status === 'skipped' ? 'skip' : `${step.duration_ms}ms`}
            </div>
            <div style={{
              width: 16, height: 16, borderRadius: '50%', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: step.status === 'ok' ? '#dcfce7' : step.status === 'error' ? '#fef2f2' : '#f3f4f6',
              color: step.status === 'ok' ? '#059669' : step.status === 'error' ? '#dc2626' : '#9ca3af',
            }}>
              {step.status === 'ok' ? '\u2713' : step.status === 'error' ? '\u2717' : '\u2014'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══ Widgets Tab ═══

function WidgetsTab({ widgets, assembly, video }: {
  widgets: { placements: number; decisions: string[] } | null;
  assembly: { widgets_inserted: number; log: string[] } | null;
  video: { video: { video_id: string; title: string; channel: string } | null; search_query: string; candidates_found: number; decision: string; timing_ms: number } | null;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {widgets && (
        <Section title={`Widget Placement (${widgets.placements} widgets)`}>
          {widgets.decisions.map((d, i) => (
            <div key={i} style={{ padding: '6px 0', fontSize: 13, fontFamily: 'monospace', borderBottom: '1px solid #f3f4f6' }}>{d}</div>
          ))}
        </Section>
      )}
      {assembly && (
        <Section title={`Assembly (${assembly.widgets_inserted} inserted)`}>
          {assembly.log.map((l, i) => (
            <div key={i} style={{ padding: '4px 0', fontSize: 13, fontFamily: 'monospace', color: l.includes('WARNING') ? '#dc2626' : '#374151' }}>{l}</div>
          ))}
        </Section>
      )}
      <Section title="Video Finder">
        {video ? (
          <>
            <Row label="Query" value={video.search_query || 'N/A'} />
            <Row label="Candidates" value={`${video.candidates_found}`} />
            <Row label="Decision" value={video.decision} />
            <Row label="Time" value={`${video.timing_ms}ms`} />
            {video.video && (
              <div style={{ marginTop: 8, padding: 12, background: '#f0fdf4', borderRadius: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{video.video.title}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{video.video.channel}</div>
                <div style={{ fontSize: 12, color: '#2563eb', marginTop: 4 }}>youtube.com/watch?v={video.video.video_id}</div>
              </div>
            )}
          </>
        ) : (
          <div style={{ color: '#6b7280', fontSize: 13 }}>Video search disabled or not run</div>
        )}
      </Section>
    </div>
  );
}

// ═══ Raw Tab ═══

function RawTab({ data }: { data: PipelineResult }) {
  return (
    <pre style={{ fontSize: 12, overflow: 'auto', maxHeight: 600, padding: 16, background: '#1e293b', color: '#e2e8f0', borderRadius: 8, fontFamily: 'monospace' }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

// ═══ Shared Components ═══

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 14 }}>{title}</div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, borderBottom: '1px solid #f9fafb' }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ fontWeight: 500, color: color || '#111', fontFamily: 'monospace' }}>{value}</span>
    </div>
  );
}
