import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';

// AI Engine V2 modules
import { ingestMatchData, createSnapshotFromData } from '@/lib/ai-engine/ingestion';
import { calculateCDI } from '@/lib/ai-engine/cdi';
import { checkStaleness } from '@/lib/ai-engine/staleness';
import { buildPrompt } from '@/lib/ai-engine/prompt-builder';
import { validateArticle } from '@/lib/ai-engine/validators';
import { placeWidgets } from '@/lib/ai-engine/widget-placer';
import { assembleWidgets } from '@/lib/ai-engine/widget-assembler';
import { findMatchVideo } from '@/lib/ai-engine/video-finder';
import type { NormalizedSnapshot, GeneratedArticle, MasterValidationResult, ArticleType, MatchData } from '@/lib/ai-engine/types';
import type { WidgetPlacementResult } from '@/lib/ai-engine/widget-placer';
import type { VideoFinderResult } from '@/lib/ai-engine/video-finder';
import type { AssemblyResult } from '@/lib/ai-engine/widget-assembler';
import type { StalenessResult } from '@/lib/ai-engine/staleness';
import type { CDIResult } from '@/lib/ai-engine/types';

const client = new Anthropic();

// ═══ Input Schema ═══

const EngineInputSchema = z.object({
  // Data source: either matchId (fetch from API) or matchData (manual/test)
  matchId: z.string().optional(),
  matchData: z.any().optional(),
  articleType: z.enum(['match_report', 'preview', 'tactical_analysis', 'transfer', 'historical_recap']).default('match_report'),
  maxRetries: z.number().min(0).max(3).default(2),
  includeVideo: z.boolean().default(true),
  includeWidgets: z.boolean().default(true),
});

// ═══ Timing Helper ═══

interface TimingEntry {
  step: string;
  duration_ms: number;
  status: 'ok' | 'error' | 'skipped';
  detail?: string;
}

function timer() {
  const entries: TimingEntry[] = [];
  const totalStart = Date.now();

  return {
    async measure<T>(step: string, fn: () => Promise<T>): Promise<T> {
      const start = Date.now();
      try {
        const result = await fn();
        entries.push({ step, duration_ms: Date.now() - start, status: 'ok' });
        return result;
      } catch (err) {
        entries.push({
          step,
          duration_ms: Date.now() - start,
          status: 'error',
          detail: err instanceof Error ? err.message : 'unknown error',
        });
        throw err;
      }
    },
    measureSync<T>(step: string, fn: () => T): T {
      const start = Date.now();
      try {
        const result = fn();
        entries.push({ step, duration_ms: Date.now() - start, status: 'ok' });
        return result;
      } catch (err) {
        entries.push({
          step,
          duration_ms: Date.now() - start,
          status: 'error',
          detail: err instanceof Error ? err.message : 'unknown error',
        });
        throw err;
      }
    },
    skip(step: string, reason: string) {
      entries.push({ step, duration_ms: 0, status: 'skipped', detail: reason });
    },
    getEntries() { return entries; },
    getTotalMs() { return Date.now() - totalStart; },
  };
}

// ═══ Main Handler ═══

export async function POST(req: NextRequest) {
  const t = timer();

  try {
    // ─── Auth ───
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const body = await req.json();
    const input = EngineInputSchema.parse(body);

    // ─── Step 1: Data Ingestion ───
    let snapshot: NormalizedSnapshot;

    if (input.matchData) {
      snapshot = t.measureSync('ingestion', () =>
        createSnapshotFromData(input.matchData as MatchData, input.articleType as ArticleType, 'manual')
      );
    } else if (input.matchId) {
      snapshot = await t.measure('ingestion', () =>
        ingestMatchData(input.matchId!, input.articleType as ArticleType)
      );
    } else {
      return NextResponse.json(
        { error: 'Either matchId or matchData is required' },
        { status: 400 }
      );
    }

    if (snapshot.confidence_score === 0) {
      return NextResponse.json(
        { error: 'Data ingestion failed — no data available', timing: t.getEntries() },
        { status: 502 }
      );
    }

    // ─── Step 2: Staleness Check ───
    const staleness: StalenessResult = t.measureSync('staleness', () =>
      checkStaleness(snapshot.snapshot_timestamp, snapshot.article_type)
    );

    if (staleness.status === 'REJECT') {
      return NextResponse.json({
        error: 'Data is too stale for this article type',
        staleness,
        timing: t.getEntries(),
      }, { status: 422 });
    }

    // ─── Step 3: CDI Calculation ───
    const cdi: CDIResult = t.measureSync('cdi', () =>
      calculateCDI(snapshot.data.stats, snapshot.data.match.score_home, snapshot.data.match.score_away)
    );

    // ─── Step 4: Build Prompt ───
    const prompt = t.measureSync('prompt_build', () =>
      buildPrompt(snapshot, cdi)
    );

    // ─── Step 5: Video Search (parallel with LLM) ───
    let videoResult: VideoFinderResult | null = null;
    const videoPromise = input.includeVideo
      ? t.measure('video_search', () =>
          findMatchVideo(snapshot.data.match.home, snapshot.data.match.away, snapshot.data.match.date)
        ).catch((err) => {
          t.skip('video_search', `Error: ${err instanceof Error ? err.message : 'unknown'}`);
          return null;
        })
      : Promise.resolve(null);

    if (!input.includeVideo) {
      t.skip('video_search', 'Disabled by input');
    }

    // ─── Step 6: LLM Generation (with retries) ───
    let article: GeneratedArticle | null = null;
    let validation: MasterValidationResult | null = null;
    let retryCount = 0;
    let llmTokensIn = 0;
    let llmTokensOut = 0;
    let llmModel = '';
    let retryInstructions: string | null = null;

    for (let attempt = 0; attempt <= input.maxRetries; attempt++) {
      const stepName = attempt === 0 ? 'llm_generate' : `llm_retry_${attempt}`;

      const generatedArticle = await t.measure(stepName, async () => {
        const userPrompt = retryInstructions
          ? `${prompt.user}\n\n═══ ISPRAVKE ═══\n${retryInstructions}`
          : prompt.user;

        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: prompt.max_tokens,
          temperature: 0.3,
          system: prompt.system,
          messages: [{ role: 'user', content: userPrompt }],
        });

        llmModel = response.model;
        llmTokensIn += response.usage.input_tokens;
        llmTokensOut += response.usage.output_tokens;

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        let cleaned = text.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        try {
          return JSON.parse(cleaned) as GeneratedArticle;
        } catch (parseErr) {
          console.error('[AI Engine] JSON parse failed. Raw response:', cleaned.substring(0, 500));
          // Fallback: find last complete "}" and try parsing up to there
          const lastBrace = cleaned.lastIndexOf('}');
          if (lastBrace > 0) {
            const truncated = cleaned.substring(0, lastBrace + 1);
            console.log('[AI Engine] Trying truncated JSON parse (up to last "}")');
            try {
              return JSON.parse(truncated) as GeneratedArticle;
            } catch {
              console.error('[AI Engine] Truncated parse also failed. Full raw:', cleaned);
            }
          }
          throw parseErr;
        }
      });

      article = generatedArticle;

      // ─── Step 7: Validate ───
      validation = t.measureSync(`validation_${attempt}`, () =>
        validateArticle(generatedArticle, snapshot, cdi)
      );

      if (validation.passed) {
        break;
      }

      // Prepare retry instructions
      retryInstructions = validation.retry_instructions;
      retryCount = attempt + 1;

      if (attempt === input.maxRetries) {
        // Last attempt failed — return with validation errors
        break;
      }
    }

    if (!article || !validation) {
      return NextResponse.json({
        error: 'LLM generation failed after all attempts',
        timing: t.getEntries(),
      }, { status: 500 });
    }

    // Wait for video search to complete
    videoResult = await videoPromise;

    // ─── Step 8: Widget Placement ───
    let widgetResult: WidgetPlacementResult | null = null;
    let assemblyResult: AssemblyResult | null = null;

    if (input.includeWidgets) {
      widgetResult = t.measureSync('widget_placement', () =>
        placeWidgets(
          snapshot,
          cdi,
          videoResult?.video?.video_id ?? null,
          article!.tags || []
        )
      );

      assemblyResult = t.measureSync('widget_assembly', () =>
        assembleWidgets(article!.content_html, widgetResult!.placements)
      );

      // Replace content_html with widget-enriched version
      article.content_html = assemblyResult.html;
    } else {
      t.skip('widget_placement', 'Disabled by input');
      t.skip('widget_assembly', 'Disabled by input');
    }

    // ─── Build Response ───
    return NextResponse.json({
      // Article
      article,

      // Pipeline metadata
      pipeline: {
        snapshot_id: snapshot.snapshot_id,
        confidence: snapshot.confidence_score,
        staleness,
        cdi,
        validation: {
          passed: validation.passed,
          retries: retryCount,
          numeric: { passed: validation.numeric.passed, errors: validation.numeric.errors.length },
          coverage: { passed: validation.coverage.passed, score: validation.coverage.score, missing: validation.coverage.missing_critical },
          tone: { passed: validation.tone.passed, violations: validation.tone.violations.length },
          entity: { passed: validation.entity.passed, unmatched: validation.entity.unmatched_entities },
        },
        widgets: widgetResult ? {
          placements: widgetResult.placements.length,
          decisions: widgetResult.decisions,
        } : null,
        assembly: assemblyResult ? {
          widgets_inserted: assemblyResult.widgets_inserted,
          log: assemblyResult.assembly_log,
        } : null,
        video: videoResult,
        llm: {
          model: llmModel,
          tokens_in: llmTokensIn,
          tokens_out: llmTokensOut,
          retries: retryCount,
        },
        timing: {
          steps: t.getEntries(),
          total_ms: t.getTotalMs(),
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors, timing: t.getEntries() },
        { status: 400 }
      );
    }

    console.error('AI Engine V2 error:', error);
    return NextResponse.json(
      {
        error: 'AI Engine generation failed',
        detail: error instanceof Error ? error.message : 'unknown error',
        timing: t.getEntries(),
      },
      { status: 500 }
    );
  }
}
