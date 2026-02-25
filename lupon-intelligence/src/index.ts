// Lupon Intelligence Worker V2
// ERPO optimization + per-bidder floors + time-of-day + ad_unit awareness

const PUBLISHER_IDS = [14532, 14596];

// US trading hours UTC (when international demand is highest)
function isUSTradingHours(hourUtc: number): boolean {
  return hourUtc >= 14 && hourUtc <= 22;
}

function isEUTradingHours(hourUtc: number): boolean {
  return hourUtc >= 8 && hourUtc <= 18;
}

function getTimeMultiplier(hourUtc: number): number {
  if (isUSTradingHours(hourUtc)) return 1.20;
  if (isEUTradingHours(hourUtc)) return 1.00;
  return 0.80; // night/early morning
}

function getDayMultiplier(dayOfWeek: number): number {
  // 0=Sun, 1=Mon, 2=Tue ... 6=Sat
  if (dayOfWeek === 0 || dayOfWeek === 6) return 0.85; // weekend
  if (dayOfWeek === 1 || dayOfWeek === 2) return 1.05; // Mon/Tue peak
  return 1.00;
}

interface Env {
  CLICKHOUSE_HOST: string;
  CLICKHOUSE_USER: string;
  CLICKHOUSE_PASSWORD: string;
  CH_EU_HOST: string;
  CH_EU_USER: string;
  CH_EU_PASSWORD: string;
  ANTHROPIC_API_KEY: string;
  FLOORS_KV: KVNamespace;
}

async function chQuery(host: string, user: string, pass: string, sql: string): Promise<any> {
  const res = await fetch(`https://${host}:8443/`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(user + ":" + pass),
      "Content-Type": "text/plain"
    },
    body: sql + " FORMAT JSON"
  });
  if (!res.ok) throw new Error(`CH error: ${res.status} ${await res.text()}`);
  return res.json();
}

async function chInsert(host: string, user: string, pass: string, sql: string): Promise<void> {
  await fetch(`https://${host}:8443/`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(user + ":" + pass),
      "Content-Type": "text/plain"
    },
    body: sql
  });
}

// Fetch bid distribution per ad_unit + geo + bidder from EU CH
async function fetchBidDistribution(env: Env, publisherId: number): Promise<any[]> {
  const sql = `
    SELECT
      gpt_code,
      geo,
      bidder_code,
      count() as total_bids,
      countIf(is_winning=1) as wins,
      round(countIf(is_winning=1)/count()*100, 1) as win_rate,
      round(avg(cpm), 3) as avg_cpm,
      round(quantile(0.5)(cpm), 3) as median_cpm,
      round(quantile(0.75)(cpm), 3) as p75_cpm,
      round(quantile(0.9)(cpm), 3) as p90_cpm,
      round(avg(floor_price_used), 3) as avg_floor,
      round(countIf(is_floor_matched=1)/count()*100, 1) as floor_match_rate,
      round(countIf(is_winning=1)/count()*100 * avg(cpm) / 1000 * count(), 2) as erpo_estimate
    FROM default.auctions
    WHERE publisher_id = ${publisherId}
      AND bidder_code != ''
      AND gpt_code != ''
      AND server_timestamp >= toUnixTimestamp(now() - INTERVAL 2 HOUR)
    GROUP BY gpt_code, geo, bidder_code
    HAVING total_bids > 50
    ORDER BY total_bids DESC
    LIMIT 30
  `;
  try {
    const result = await chQuery(env.CH_EU_HOST, env.CH_EU_USER, env.CH_EU_PASSWORD, sql);
    return result?.data || [];
  } catch (e) {
    console.error("EU CH bid distribution error:", e);
    return [];
  }
}

// Fetch hourly stats for time-of-day awareness
async function fetchHourlyStats(env: Env, publisherId: number): Promise<any[]> {
  const sql = `
    SELECT
      gpt_code,
      geo,
      toHour(fromUnixTimestamp(server_timestamp)) as hour_utc,
      count() as bids,
      countIf(is_winning=1) as wins,
      round(countIf(is_winning=1)/count()*100, 1) as fill_rate,
      round(avg(cpm), 3) as avg_cpm,
      round(countIf(is_floor_matched=1)/count()*100, 1) as floor_match_rate
    FROM default.auctions
    WHERE publisher_id = ${publisherId}
      AND bidder_code != ''
      AND gpt_code != ''
      AND server_timestamp >= toUnixTimestamp(now() - INTERVAL 7 DAY)
    GROUP BY gpt_code, geo, hour_utc
    HAVING bids > 500
    ORDER BY gpt_code, geo, hour_utc
  `;
  try {
    const result = await chQuery(env.CH_EU_HOST, env.CH_EU_USER, env.CH_EU_PASSWORD, sql);
    return result?.data || [];
  } catch (e) {
    console.error("Hourly stats error:", e);
    return [];
  }
}

// Fetch floor_match_rate guardrail — last 3 hours per ad_unit+geo
async function fetchGuardrailStats(env: Env, publisherId: number): Promise<Record<string, any>> {
  const sql = `
    SELECT
      gpt_code,
      geo,
      round(countIf(is_winning=1)/count()*100, 1) as fill_rate,
      round(countIf(is_floor_matched=1)/count()*100, 1) as floor_match_rate,
      count() as bids
    FROM default.auctions
    WHERE publisher_id = ${publisherId}
      AND bidder_code != ''
      AND gpt_code != ''
      AND server_timestamp >= toUnixTimestamp(now() - INTERVAL 3 HOUR)
    GROUP BY gpt_code, geo
    HAVING bids > 50
  `;
  try {
    const result = await chQuery(env.CH_EU_HOST, env.CH_EU_USER, env.CH_EU_PASSWORD, sql);
    const guardrails: Record<string, any> = {};
    for (const row of result?.data || []) {
      guardrails[`${row.gpt_code}__${row.geo}`] = {
        fill_rate: parseFloat(row.fill_rate),
        floor_match_rate: parseFloat(row.floor_match_rate)
      };
    }
    return guardrails;
  } catch (e) {
    return {};
  }
}

// Calculate optimal floor using ERPO logic
function calculateOptimalFloor(
  medianCpm: number,
  p75Cpm: number,
  winRate: number,
  floorMatchRate: number,
  hourUtc: number,
  dayOfWeek: number,
  adUnit: string,
  bidderCode: string
): number {
  // Base floor = 70-85% of median CPM depending on win rate
  let baseFactor = 0.75;
  if (winRate > 25) baseFactor = 0.85;
  else if (winRate > 15) baseFactor = 0.78;
  else if (winRate > 8) baseFactor = 0.72;
  else baseFactor = 0.65;

  let floor = medianCpm * baseFactor;

  // Guardrail: if floor_match_rate < 15% → floors too high, reduce
  if (floorMatchRate < 10) floor *= 0.75;
  else if (floorMatchRate < 15) floor *= 0.85;
  // Guardrail: if floor_match_rate > 45% → floors too low, increase
  else if (floorMatchRate > 45) floor *= 1.15;
  else if (floorMatchRate > 35) floor *= 1.08;

  // Time-of-day multiplier
  floor *= getTimeMultiplier(hourUtc);

  // Day-of-week multiplier
  floor *= getDayMultiplier(dayOfWeek);

  // Per-bidder adjustments based on known profiles
  const bidderMultipliers: Record<string, number> = {
    'adf': 1.20,       // premium bidder, high CPM
    'adagio': 1.10,    // good CPM, good win rate
    'oftmedia': 1.05,  // decent win rate
    'rubicon': 1.00,   // baseline
    'sovrn': 0.90,     // volume bidder
    'criteo': 0.85,    // investigate low CPM
    'rtbhouse': 0.70,  // very low CPM volume bidder
    'sharethrough': 0.90,
  };
  const bidderMult = bidderMultipliers[bidderCode] || 1.00;
  floor *= bidderMult;

  // Ad unit premium — content placements worth more
  if (adUnit.includes('content') || adUnit.includes('article') || adUnit.includes('inArticle')) {
    floor *= 1.15;
  } else if (adUnit.includes('anchor') || adUnit.includes('sticky') || adUnit.includes('bottom')) {
    floor *= 0.90;
  }

  // Never go below absolute minimums per bidder tier
  const minimums: Record<string, number> = {
    'adf': 0.30, 'adagio': 0.20, 'oftmedia': 0.15,
    'rubicon': 0.10, 'sovrn': 0.08, 'criteo': 0.05,
    'rtbhouse': 0.03, 'default': 0.05
  };
  const minFloor = minimums[bidderCode] || minimums['default'];
  floor = Math.max(floor, minFloor);

  // Cap at p75 CPM to avoid being too aggressive
  floor = Math.min(floor, p75Cpm * 0.95);

  return Math.round(floor * 1000) / 1000;
}

async function analyzeWithClaudeV2(
  env: Env,
  publisherId: number,
  bidDistribution: any[],
  hourlyStats: any[],
  guardrails: Record<string, any>,
  hourUtc: number,
  dayOfWeek: number
): Promise<any> {
  // Build per-segment floor recommendations
  const segmentFloors: Record<string, Record<string, number>> = {};
  const floorUpdates: any[] = [];

  // Group by gpt_code + geo
  const segments: Record<string, any[]> = {};
  for (const row of bidDistribution) {
    const key = `${row.gpt_code}__${row.geo}`;
    if (!segments[key]) segments[key] = [];
    segments[key].push(row);
  }

  // Calculate per-bidder floors for each segment
  for (const [segKey, bidders] of Object.entries(segments)) {
    const [gptCode, geo] = segKey.split('__');
    const guardrail = guardrails[segKey] || { fill_rate: 15, floor_match_rate: 20 };
    const perBidderFloors: Record<string, number> = {};

    for (const bidder of bidders) {
      const floor = calculateOptimalFloor(
        parseFloat(bidder.median_cpm) || 0.1,
        parseFloat(bidder.p75_cpm) || 0.2,
        parseFloat(bidder.win_rate) || 5,
        guardrail.floor_match_rate,
        hourUtc,
        dayOfWeek,
        gptCode,
        bidder.bidder_code
      );
      perBidderFloors[bidder.bidder_code] = floor;
    }

    // Default floor = average of all bidder floors
    const floors = Object.values(perBidderFloors);
    const defaultFloor = floors.length > 0
      ? Math.round(floors.reduce((a, b) => a + b, 0) / floors.length * 1000) / 1000
      : 0.10;

    segmentFloors[segKey] = { ...perBidderFloors, default: defaultFloor };
  }

  // Build compact summary for Claude to refine
  const topSegments = Object.entries(segments)
    .sort((a, b) => b[1].reduce((s: number, r: any) => s + parseInt(r.total_bids), 0) -
                    a[1].reduce((s: number, r: any) => s + parseInt(r.total_bids), 0))
    .slice(0, 8);

  const summaryForClaude = topSegments.map(([key, bidders]) => {
    const [gptCode, geo] = key.split('__');
    const guardrail = guardrails[key] || {};
    return {
      segment: key,
      gpt_code: gptCode,
      geo,
      fill_rate_3h: guardrail.fill_rate || 0,
      floor_match_rate_3h: guardrail.floor_match_rate || 0,
      bidders: bidders.slice(0, 5).map((b: any) => ({
        bidder: b.bidder_code,
        bids: b.total_bids,
        win_rate: b.win_rate,
        median_cpm: b.median_cpm,
        calculated_floor: segmentFloors[key]?.[b.bidder_code] || 0
      }))
    };
  });

  const prompt = `You are Shaikh AI — Lupon Media's Floor Price Optimizer V2.
Publisher: ${publisherId}
Current UTC hour: ${hourUtc} (US trading: ${isUSTradingHours(hourUtc)}, EU trading: ${isEUTradingHours(hourUtc)})
Day of week: ${dayOfWeek} (0=Sun, weekend=${dayOfWeek === 0 || dayOfWeek === 6})

Pre-calculated per-segment floor recommendations (review and refine):
${JSON.stringify(summaryForClaude, null, 2)}

Rules:
1. ERPO = maximize wins * cpm, NOT just CPM
2. If floor_match_rate_3h < 10%: floors are too high, reduce recommended floor by 15-20%
3. If fill_rate_3h < 8%: floors critically too high, reduce aggressively
4. US trading hours (14-22 UTC): can be more aggressive with floors
5. Balkan geos (RS,BA,HR,ME,MK,AL,SI): lower demand, be conservative with floors
6. XX = unknown countries (NOT bots), treat as Tier 2
7. MC = datacenter traffic, use 🤖 indicator
8. Output floor_updates using default floor per geo (not per bidder) for KV storage

Output ONLY this JSON:
{
  "floor_updates": [{"publisher_id":${publisherId},"geo":"RS","gpt_code":"pink_anchor_bottom","current_floor":0.20,"recommended_floor":0.22,"confidence":0.85,"reason":"brief reason"}],
  "anomalies": [],
  "summary": "one line summary"
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      system: "You are a JSON API. Return ONLY a raw JSON object. No markdown. No backticks. No explanation.",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data: any = await res.json();
  const text = data?.content?.[0]?.text || "{}";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const extracted = start >= 0 && end >= 0 ? text.slice(start, end + 1) : text;
  try {
    return { analysis: JSON.parse(extracted), segmentFloors };
  } catch {
    return { analysis: { floor_updates: [], anomalies: [], summary: "parse_error" }, segmentFloors };
  }
}

async function saveResultsV2(env: Env, analysis: any, segmentFloors: Record<string, Record<string, number>>): Promise<void> {
  const seen = new Set<string>();
  for (const u of analysis.floor_updates || []) {
    const key = `${u.publisher_id}_${u.geo}_${u.gpt_code || 'all'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const conf = parseFloat(u.confidence) || 0;
    if (conf < 0.5) continue;
    const pid = parseInt(u.publisher_id) || 0;
    const geo = String(u.geo || "").replace(/'/g, "");
    const gptCode = String(u.gpt_code || "all").replace(/'/g, "");
    const cur = parseFloat(u.current_floor) || 0;
    const rec = parseFloat(u.recommended_floor) || 0;
    const reason = String(u.reason || "").replace(/'/g, "''").slice(0, 200);
    const sql = `INSERT INTO lupon.floor_price_audit 
      (ts,publisher_id,geo,device_type,hour_slot,glukkon_floor,claude_floor,overridden,confidence,reason,anomaly_type,total_auctions,fill_pct,revenue_without_ai,revenue_with_ai) 
      VALUES (now(),${pid},'${geo}','all',0,${cur},${rec},${rec !== cur ? 1 : 0},${conf},'${reason} [V2:${gptCode}]','',0,0,0,0)`;
    await chInsert(env.CLICKHOUSE_HOST, env.CLICKHOUSE_USER, env.CLICKHOUSE_PASSWORD, sql);
  }
  for (const a of analysis.anomalies || []) {
    const pid = parseInt(a.publisher_id) || 0;
    const type = String(a.type || "").replace(/'/g, "");
    const bidder = String(a.bidder || "").replace(/'/g, "");
    const geo = String(a.geo || "").replace(/'/g, "");
    const severity = String(a.severity || "medium").replace(/'/g, "");
    const desc = String(a.description || "").replace(/'/g, "''").slice(0, 300);
    await chInsert(env.CLICKHOUSE_HOST, env.CLICKHOUSE_USER, env.CLICKHOUSE_PASSWORD,
      `INSERT INTO lupon.anomalies (ts,publisher_id,anomaly_type,bidder,geo,severity,description,current_value,baseline_value) VALUES (now(),${pid},'${type}','${bidder}','${geo}','${severity}','${desc}',0,0)`);
  }
}

async function runAnalysisV2(env: Env): Promise<string> {
  const now = new Date();
  const hourUtc = now.getUTCHours();
  const dayOfWeek = now.getUTCDay();

  // Truncate old audit data
  try {
    await fetch(`https://${env.CLICKHOUSE_HOST}:8443/`, {
      method: "POST",
      headers: { Authorization: "Basic " + btoa(env.CLICKHOUSE_USER + ":" + env.CLICKHOUSE_PASSWORD), "Content-Type": "text/plain" },
      body: "TRUNCATE TABLE lupon.floor_price_audit"
    });
  } catch(e) {}

  const results = [];
  for (const publisherId of PUBLISHER_IDS) {
    try {
      // Fetch all data sources in parallel
      const [bidDistribution, hourlyStats, guardrails] = await Promise.all([
        fetchBidDistribution(env, publisherId),
        Promise.resolve([]),
        fetchGuardrailStats(env, publisherId)
      ]);

      // Get Claude V2 analysis
      const { analysis, segmentFloors } = await analyzeWithClaudeV2(
        env, publisherId, bidDistribution, hourlyStats, guardrails, hourUtc, dayOfWeek
      );

      // Save to audit table
      await saveResultsV2(env, analysis, segmentFloors);

      // Update KV floors — apply per-segment floors to original floor file
      const originalRes = await fetch(`https://adxbid.info/${publisherId}_gpt_code__geo_latest.json`);
      const originalFloors: any = await originalRes.json();

      for (const update of analysis.floor_updates || []) {
        if ((parseFloat(update.confidence) || 0) < 0.5) continue;
        const gptCode = update.gpt_code || null;
        for (const key of Object.keys(originalFloors.predictions || {})) {
          const keyEndsWithGeo = key.endsWith(`__${update.geo}`);
          const keyMatchesAdUnit = !gptCode || key.startsWith(gptCode);
          if (keyEndsWithGeo && keyMatchesAdUnit) {
            originalFloors.predictions[key] = parseFloat(update.recommended_floor) || 0;
          }
        }
      }

      originalFloors.timestamp = now.toISOString();
      originalFloors.version = "v2";
      originalFloors.hour_utc = hourUtc;
      originalFloors.us_trading = isUSTradingHours(hourUtc);

      await env.FLOORS_KV.put(`floors:${publisherId}`, JSON.stringify(originalFloors));

      results.push({
        publisher: publisherId,
        hour_utc: hourUtc,
        us_trading: isUSTradingHours(hourUtc),
        bid_segments: bidDistribution.length,
        updates: analysis.floor_updates?.length,
        anomalies: analysis.anomalies?.length,
        summary: analysis.summary
      });
    } catch (err: any) {
      results.push({ publisher: publisherId, error: err.message });
    }
  }
  return JSON.stringify(results, null, 2);
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname.startsWith("/floors/")) {
      const pubId = url.pathname.split("/")[2];
      const cf = (req as any).cf || {};
      const country = cf.country || "XX";
      const org = String(cf.asOrganization || "").replace(/['"]/g, "");
      const asn = cf.asn || 0;
      ctx.waitUntil(fetch(`https://${env.CLICKHOUSE_HOST}:8443/`, {
        method: "POST",
        headers: { Authorization: "Basic " + btoa(env.CLICKHOUSE_USER + ":" + env.CLICKHOUSE_PASSWORD), "Content-Type": "text/plain" },
        body: `INSERT INTO lupon.floor_requests (ts,publisher_id,country,org,asn) VALUES (now(),${parseInt(pubId)||0},'${country}','${org}',${asn})`
      }));
      const floors = await env.FLOORS_KV.get(`floors:${pubId}`);
      if (!floors) {
        const original = await fetch(`https://adxbid.info/${pubId}_gpt_code__geo_latest.json`);
        const data = await original.text();
        return new Response(data, { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
      return new Response(floors, { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    if (url.pathname.startsWith("/api/floors")) {
      const period = url.searchParams.get("period") || "24h";
      const intervals: Record<string,string> = {"1m":"1 MINUTE","10m":"10 MINUTE","30m":"30 MINUTE","1h":"1 HOUR","6h":"6 HOUR","24h":"24 HOUR","7d":"7 DAY","30d":"30 DAY"};
      const interval = intervals[period] || "24 HOUR";
      const sql = `SELECT publisher_id, geo, glukkon_floor, claude_floor, confidence, reason, total_auctions, fill_pct, revenue_without_ai, revenue_with_ai, ts FROM lupon.floor_price_audit WHERE ts >= now() - INTERVAL ${interval} ORDER BY ts DESC LIMIT 200 FORMAT JSON`;
      const res = await fetch(`https://${env.CLICKHOUSE_HOST}:8443/?query=${encodeURIComponent(sql)}`, {
        headers: { Authorization: "Basic " + btoa(`${env.CLICKHOUSE_USER}:${env.CLICKHOUSE_PASSWORD}`) }
      });
      const data: any = await res.json();
      return new Response(JSON.stringify(data.data || []), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    if (url.pathname === "/api/anomalies") {
      const sql = `SELECT publisher_id, anomaly_type, geo, severity, description, ts FROM lupon.anomalies WHERE resolved = 0 ORDER BY ts DESC LIMIT 20 FORMAT JSON`;
      const res = await fetch(`https://${env.CLICKHOUSE_HOST}:8443/?query=${encodeURIComponent(sql)}`, {
        headers: { Authorization: "Basic " + btoa(`${env.CLICKHOUSE_USER}:${env.CLICKHOUSE_PASSWORD}`) }
      });
      const data: any = await res.json();
      return new Response(JSON.stringify(data.data || []), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    if (url.pathname === "/run") {
      const result = await runAnalysisV2(env);
      await env.FLOORS_KV.put("run:last_result", result);
      await env.FLOORS_KV.put("run:last_ts", new Date().toISOString());
      return new Response(result, { headers: { "Content-Type": "application/json" } });
    }
    if (url.pathname === "/run/result") {
      const result = await env.FLOORS_KV.get("run:last_result");
      const ts = await env.FLOORS_KV.get("run:last_ts");
      return new Response(JSON.stringify({ts, result: result ? JSON.parse(result) : null}), { 
        headers: { "Content-Type": "application/json" } 
      });
    }

    if (url.pathname === "/api/test-insert") {
      try {
        await chInsert(env.CLICKHOUSE_HOST, env.CLICKHOUSE_USER, env.CLICKHOUSE_PASSWORD,
          `INSERT INTO lupon.floor_price_audit (ts,publisher_id,geo,device_type,hour_slot,glukkon_floor,claude_floor,overridden,confidence,reason,anomaly_type,total_auctions,fill_pct,revenue_without_ai,revenue_with_ai) VALUES (now(),14532,'RS','all',0,0.10,0.12,1,0.85,'V2 test insert','',1000,15.0,10.0,12.0)`
        );
        return new Response(JSON.stringify({status:"ok"}), { headers: { "Content-Type": "application/json" } });
      } catch(e: any) {
        return new Response(JSON.stringify({error: e.message}), { headers: { "Content-Type": "application/json" } });
      }
    }
    if (url.pathname === "/api/segment-floors") {
      const pubId = url.searchParams.get("pub") || "14532";
      const bidDist = await fetchBidDistribution(env, parseInt(pubId));
      return new Response(JSON.stringify({ segments: bidDist.length, sample: bidDist.slice(0, 10) }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ version: "V2", hour_utc: new Date().getUTCHours(), us_trading: isUSTradingHours(new Date().getUTCHours()) }), {
      headers: { "Content-Type": "application/json" }
    });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runAnalysisV2(env));
  }
};
