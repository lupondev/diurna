export interface Env {
  CLICKHOUSE_HOST: string;
  CLICKHOUSE_USER: string;
  CLICKHOUSE_PASSWORD: string;
  ANTHROPIC_API_KEY: string;
  FLOORS_KV: KVNamespace;
}

const PUBLISHER_IDS = [14532, 14596];
const GLUKKON_API_URL = "https://4u7och96q0.execute-api.us-west-2.amazonaws.com/Prod/get_predicts";

async function clickhouseQuery(env: Env, sql: string): Promise<any> {
  const url = `https://${env.CLICKHOUSE_HOST}:8443/?query=${encodeURIComponent(sql)}&default_format=JSON`;
  const res = await fetch(url, {
    headers: { Authorization: "Basic " + btoa(env.CLICKHOUSE_USER + ":" + env.CLICKHOUSE_PASSWORD) },
  });
  const body = await res.text();
  if (!res.ok) throw new Error("ClickHouse error: " + body);
  return JSON.parse(body);
}

async function clickhouseInsert(env: Env, sql: string): Promise<void> {
  const url = `https://${env.CLICKHOUSE_HOST}:8443/`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${env.CLICKHOUSE_USER}:${env.CLICKHOUSE_PASSWORD}`),
      "Content-Type": "text/plain",
    },
    body: sql,
  });
  await res.text(); if (!res.ok) throw new Error(`ClickHouse insert error: ${await res.text()}`);
}

async function fetchGlukkon(publisherId: number): Promise<Record<string, number>> {
  const res = await fetch(GLUKKON_API_URL + "?metric=geo&publisher_id=" + publisherId);
  if (!res.ok) return {};
  const data: any = await res.json();
  return data.predictions || {};
}

async function getRecentStats(env: Env, publisherId: number): Promise<any[]> {
  const sql = `SELECT geo, bidder_code, countIf(event_type='RESPONSE') as bids, countIf(is_winning=1) as wins, countIf(event_type='TIMEOUT') as timeouts, round(avgIf(cpm, is_winning=1), 4) as avg_cpm, round(avgIf(floor_price_used, floor_price_used > 0), 4) as avg_floor FROM lupon.auctions WHERE publisher_id = ${publisherId} AND ts >= now() - INTERVAL 2 HOUR GROUP BY geo, bidder_code ORDER BY bids DESC LIMIT 30 FORMAT JSON`;
  const result = await clickhouseQuery(env, sql);
  return result?.data || [];
}

async function getBaseline(env: Env, publisherId: number): Promise<Record<string, number>> {
  const sql = `SELECT geo, round(avgIf(cpm, is_winning=1), 4) as baseline_cpm FROM lupon.auctions WHERE publisher_id = ${publisherId} AND ts >= now() - INTERVAL 30 DAY GROUP BY geo FORMAT JSON`;
  const result = await clickhouseQuery(env, sql);
  const baseline: Record<string, number> = {};
  for (const row of result?.data || []) baseline[row.geo] = row.baseline_cpm;
  return baseline;
}

async function analyzeWithClaude(env: Env, publisherId: number, glukkon: Record<string, number>, stats: any[], baseline: Record<string, number>): Promise<any> {
  const prompt = `You are a programmatic advertising optimizer for Lupon Media SSP (UAE, MENA, Balkans).
Publisher: ${publisherId}
Glukkon floor predictions: ${JSON.stringify(glukkon)}
Recent 2h stats (may be empty if no live data): ${JSON.stringify(stats.slice(0, 15))}
30d baseline CPM (may be empty): ${JSON.stringify(baseline)}
Rules: Use Glukkon predictions as base. XX geo = unknown countries, NOT bots - optimize normally. MC = suspicious datacenter, be conservative. If no live stats available, still optimize based on Glukkon predictions alone using geo knowledge (US/CA/GB = premium, Balkans = lower CPM). Never refuse to make recommendations - always output floor_updates for every geo in predictions.
Respond ONLY valid JSON: {"floor_updates":[{"publisher_id":${publisherId},"geo":"","current_floor":0,"recommended_floor":0,"confidence":0,"reason":""}],"anomalies":[{"type":"","publisher_id":${publisherId},"bidder":"","geo":"","severity":"","description":""}],"summary":""}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data: any = await res.json();
  const text = data?.content?.[0]?.text || "{}";
  const clean=text.replace(/```json|```/g,"").trim(); try{return JSON.parse(clean);}catch{return{floor_updates:[],anomalies:[],summary:"err:"+text.slice(0,80)};}
}

async function saveResults(env: Env, analysis: any): Promise<void> {
  for (const u of analysis.floor_updates || []) {
    if (u.confidence < 0.5) continue;
    await clickhouseInsert(env, `INSERT INTO lupon.floor_price_audit (ts,publisher_id,geo,device_type,hour_slot,glukkon_floor,claude_floor,overridden,confidence,reason,anomaly_type) VALUES (now(),${u.publisher_id},'${u.geo}','all',0,${u.current_floor},${u.recommended_floor},${u.recommended_floor !== u.current_floor ? 1 : 0},${u.confidence},'${(u.reason||'').replace(/'/g,"''")}','')`);
  }
  for (const a of analysis.anomalies || []) {
    await clickhouseInsert(env, `INSERT INTO lupon.anomalies (ts,publisher_id,anomaly_type,bidder,geo,severity,description,current_value,baseline_value) VALUES (now(),${a.publisher_id},'${a.type}','${a.bidder}','${a.geo}','${a.severity}','${(a.description||'').replace(/'/g,"''")}',0,0)`);
  }
}

async function runAnalysis(env: Env): Promise<string> {
  const results = [];
  for (const publisherId of PUBLISHER_IDS) {
    try {
      const glukkon = await fetchGlukkon(publisherId);
      const stats = await getRecentStats(env, publisherId);
      const baseline = await getBaseline(env, publisherId);
      const analysis = await analyzeWithClaude(env, publisherId, glukkon, stats, baseline);
      await saveResults(env, analysis);
      // Save modified floors to KV
      const originalRes = await fetch(`https://adxbid.info/${publisherId}_gpt_code__geo_latest.json`);
      const originalFloors: any = await originalRes.json();
      for (const update of analysis.floor_updates || []) {
        if (update.confidence < 0.5) continue;
        for (const key of Object.keys(originalFloors.predictions)) {
          if (key.endsWith(`__${update.geo}`)) {
            originalFloors.predictions[key] = update.recommended_floor;
          }
        }
      }
      originalFloors.timestamp = new Date().toISOString();
      originalFloors.claude_override = true;
      await env.FLOORS_KV.put(`floors:${publisherId}`, JSON.stringify(originalFloors));
      results.push({ publisher: publisherId, updates: analysis.floor_updates?.length, anomalies: analysis.anomalies?.length, summary: analysis.summary });
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
      const org = cf.asOrganization || "";
      const asn = cf.asn || 0;
      // Log request geo to ClickHouse async
      const cleanOrg = (org + "").replace(/['"]/g, "");
      const logSql = "INSERT INTO lupon.floor_requests (ts, publisher_id, country, org, asn) VALUES (now(), " + (parseInt(pubId) || 0) + ", '" + country + "', '" + cleanOrg + "', " + asn + ")";
      ctx.waitUntil(fetch("https://" + env.CLICKHOUSE_HOST + ":8443/", {
        method: "POST",
        headers: { Authorization: "Basic " + btoa(env.CLICKHOUSE_USER + ":" + env.CLICKHOUSE_PASSWORD), "Content-Type": "text/plain" },
        body: logSql
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
      const sql = `SELECT publisher_id, geo, glukkon_floor, claude_floor, confidence, reason, ts FROM lupon.floor_price_audit WHERE ts >= now() - INTERVAL ${interval} ORDER BY ts DESC LIMIT 100 FORMAT JSON`;
      const res = await fetch(`https://${env.CLICKHOUSE_HOST}:8443/?query=${encodeURIComponent(sql)}`, {
        headers: { Authorization: "Basic " + btoa(`${env.CLICKHOUSE_USER}:${env.CLICKHOUSE_PASSWORD}`) }
      });
      const data: any = await res.json();
      return new Response(JSON.stringify(data.data || []), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    if (url.pathname === "/api/geo-stats") {
      const sql = "SELECT geo, count() as cnt FROM lupon.auctions GROUP BY geo ORDER BY cnt DESC LIMIT 15 FORMAT JSON";
      const total_sql = "SELECT count() as total FROM lupon.auctions FORMAT JSON";
      const host = env.CLICKHOUSE_HOST;
      const auth = "Basic " + btoa(env.CLICKHOUSE_USER + ":" + env.CLICKHOUSE_PASSWORD);
      const [r1, r2] = await Promise.all([
        fetch("https://" + host + ":8443/?query=" + encodeURIComponent(sql), { headers: { Authorization: auth } }),
        fetch("https://" + host + ":8443/?query=" + encodeURIComponent(total_sql), { headers: { Authorization: auth } })
      ]);
      const d1: any = await r1.json();
      const d2: any = await r2.json();
      const total = parseInt(d2.data[0].total);
      const result = d1.data.map((r: any) => ({ geo: r.geo, cnt: parseInt(r.cnt), pct: (parseInt(r.cnt)/total*100).toFixed(2) }));
      return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    if (url.pathname === "/api/cf-geo") {
      const cf = (req as any).cf || {};
      const result = {
        country: cf.country || "XX",
        city: cf.city || "",
        region: cf.region || "",
        asn: cf.asn || "",
        org: cf.asOrganization || "",
        timezone: cf.timezone || "",
        colo: cf.colo || ""
      };
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
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
      const result = await runAnalysis(env);
      return new Response(result, { headers: { "Content-Type": "application/json" } });
    }
    return new Response("Lupon Intelligence Worker v1.0", { status: 200 });
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runAnalysis(env));
  },
};

