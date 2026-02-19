export interface Env {
  CLICKHOUSE_HOST: string;
  CLICKHOUSE_USER: string;
  CLICKHOUSE_PASSWORD: string;
  ANTHROPIC_API_KEY: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
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
  const resText = await res.text();
  if (!res.ok) throw new Error(`ClickHouse insert error: ${resText}`);
}


async function syncS3ToClickHouse(env: Env): Promise<string> {
  // Get current hour file name: YYYYMMDDHHOO
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fileName = `${now.getUTCFullYear()}${pad(now.getUTCMonth()+1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}00.csv`;
  const url = `https://lupon-auctions.s3.us-west-2.amazonaws.com/${fileName}`;

  // AWS Signature V4
  const region = 'us-west-2';
  const service = 's3';
  const accessKey = env.AWS_ACCESS_KEY_ID;
  const secretKey = env.AWS_SECRET_ACCESS_KEY;
  const host = 'lupon-auctions.s3.us-west-2.amazonaws.com';
  const dateStamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth()+1)}${pad(now.getUTCDate())}`;
  const amzDate = `${dateStamp}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-date';
  const canonicalRequest = `GET\n/${fileName}\n\n${canonicalHeaders}\n${signedHeaders}\ne3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`;
  
  const credScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const strToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credScope}\n${await sha256hex(canonicalRequest)}`;
  
  const sigKey = await getSignatureKey(secretKey, dateStamp, region, service);
  const signature = await hmacHex(sigKey, strToSign);
  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(url, { headers: { 'x-amz-date': amzDate, 'Authorization': authHeader } });
  if (!res.ok) return `S3 fetch failed: ${res.status} ${fileName}`;
  
  const csv = await res.text();
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',');
  
  // Batch insert in chunks of 1000
  let inserted = 0;
  for (let i = 1; i < lines.length; i += 1000) {
    const chunk = lines.slice(i, i + 1000);
    const values = chunk.map(line => {
      const cols = line.split(',');
      const get = (field: string) => cols[headers.indexOf(field)] || '';
      const cpm = parseFloat(get('cpm')) || 0;
      const isWin = get('is_winning') === 'true' ? 1 : 0;
      const floor = parseFloat(get('floor_price_used')) || 0;
      const pid = parseInt(get('publisher_id')) || 0;
      const geo = (get('geo') || 'XX').replace(/'/g, '');
      const device = (get('device_type') || '').replace(/'/g, '');
      const bidder = (get('bidder_code') || '').replace(/'/g, '');
      const event = (get('event_type') || '').replace(/'/g, '');
      return `(now(),${pid},'${geo}','${device}','${event}','${bidder}',${cpm},${isWin},${floor})`;
    }).join(',');
    await clickhouseInsert(env, `INSERT INTO lupon.auctions (ts,publisher_id,geo,device_type,event_type,bidder_code,cpm,is_winning,floor_price_used) VALUES ${values}`);
    inserted += chunk.length;
  }
  return `Synced ${inserted} rows from ${fileName}`;
}

async function sha256hex(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacHex(key: ArrayBuffer, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacBuf(key: ArrayBuffer | string, message: string): Promise<ArrayBuffer> {
  const keyBuf = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey('raw', keyBuf, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

async function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmacBuf('AWS4' + key, dateStamp);
  const kRegion = await hmacBuf(kDate, region);
  const kService = await hmacBuf(kRegion, service);
  return hmacBuf(kService, 'aws4_request');
}


async function fetchFloorData(publisherId: number, env: Env): Promise<{ floors: Record<string, number>, stats: Record<string, any> }> {
  try {
    const sql = `SELECT geo, count() as total, round(countIf(is_winning=1)/count()*100,1) as fill_pct, round(avgIf(cpm, is_winning=1),3) as avg_cpm FROM lupon.auctions WHERE publisher_id=${publisherId} GROUP BY geo HAVING count() > 10000 FORMAT JSON`;
    const result = await clickhouseQuery(env, sql);
    const floors: Record<string, number> = {};
    const stats: Record<string, any> = {};
    for (const row of result?.data || []) {
      const fill = parseFloat(row.fill_pct);
      const cpm = parseFloat(row.avg_cpm);
      const total = parseInt(row.total);
      const factor = fill > 20 ? 0.90 : fill > 15 ? 0.80 : fill > 10 ? 0.70 : 0.60;
      floors[row.geo] = Math.round(cpm * factor * 1000) / 1000;
      stats[row.geo] = { total, fill_pct: fill, avg_cpm: cpm };
    }
    return { floors, stats };
  } catch(e) {
    const res = await fetch(GLUKKON_API_URL + "?metric=geo&publisher_id=" + publisherId);
    if (!res.ok) return { floors: {}, stats: {} };
    const data: any = await res.json();
    return { floors: data.predictions || {}, stats: {} };
  }
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

async function analyzeWithClaude(env: Env, publisherId: number, floors: Record<string, number>, recentStats: any[], baseline: Record<string, number>): Promise<any> {
  const prompt = `You are a programmatic advertising optimizer for Lupon Media SSP.
Publisher: ${publisherId}
Floor predictions: ${JSON.stringify(floors)}
Recent 2h stats: ${JSON.stringify(recentStats.slice(0, 15))}
30d baseline CPM: ${JSON.stringify(baseline)}
Rules: Use floor predictions as base. XX geo = unknown countries NOT bots. MC = suspicious datacenter. Always output floor_updates for every geo. current_floor MUST be exact prediction value.
Output ONLY this JSON: {"floor_updates":[{"publisher_id":${publisherId},"geo":"XX","current_floor":0.5,"recommended_floor":0.51,"confidence":0.8,"reason":"reason"}],"anomalies":[],"summary":""}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      system: "You are a JSON API. Return ONLY a raw JSON object. No markdown. No backticks. No explanation.",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data: any = JSON.parse(await res.text());
  const text = data?.content?.[0]?.text || "{}";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const extracted = start >= 0 && end >= 0 ? text.slice(start, end + 1) : text;
  try { return JSON.parse(extracted); }
  catch { return { floor_updates: [], anomalies: [], summary: "parse_error:" + text.slice(0, 100) }; }
}

async function saveResults(env: Env, analysis: any, chStats: Record<string, any>): Promise<void> {
  const seen = new Set<string>();
  for (const u of analysis.floor_updates || []) {
    const key = String(u.publisher_id) + "_" + String(u.geo);
    if (seen.has(key)) continue;
    seen.add(key);
    const conf = parseFloat(u.confidence) || 0;
    if (conf < 0.5) continue;
    const pid = parseInt(u.publisher_id) || 0;
    const geo = String(u.geo || "").replace(/'/g, "");
    const cur = parseFloat(u.current_floor) || 0;
    const rec = parseFloat(u.recommended_floor) || 0;
    const reason = String(u.reason || "").replace(/'/g, "''").slice(0, 200);
    const s = chStats[u.geo];
    const total = s ? s.total : 0;
    const fillPct = s ? s.fill_pct : 0;
    const revWithout = s ? Math.round(s.total * (s.fill_pct / 100) * s.avg_cpm * 100) / 100 : 0;
    const uplift = rec > cur ? 1.03 : 1.0;
    const revWith = s ? Math.round(s.total * (s.fill_pct / 100) * s.avg_cpm * uplift * 100) / 100 : 0;
    const sql = `INSERT INTO lupon.floor_price_audit (ts,publisher_id,geo,device_type,hour_slot,glukkon_floor,claude_floor,overridden,confidence,reason,anomaly_type,total_auctions,fill_pct,revenue_without_ai,revenue_with_ai) VALUES (now(),${pid},'${geo}','all',0,${cur},${rec},${rec !== cur ? 1 : 0},${conf},'${reason}','',${total},${fillPct},${revWithout},${revWith})`;
    await clickhouseInsert(env, sql);
  }
  for (const a of analysis.anomalies || []) {
    const pid = parseInt(a.publisher_id) || 0;
    const type = String(a.type || "").replace(/'/g, "");
    const bidder = String(a.bidder || "").replace(/'/g, "");
    const geo = String(a.geo || "").replace(/'/g, "");
    const severity = String(a.severity || "medium").replace(/'/g, "");
    const desc = String(a.description || "").replace(/'/g, "''").slice(0, 300);
    await clickhouseInsert(env, `INSERT INTO lupon.anomalies (ts,publisher_id,anomaly_type,bidder,geo,severity,description,current_value,baseline_value) VALUES (now(),${pid},'${type}','${bidder}','${geo}','${severity}','${desc}',0,0)`);
  }
}

async function runAnalysis(env: Env): Promise<string> {
  try {
    const tr = await fetch(`https://${env.CLICKHOUSE_HOST}:8443/`, {
      method: "POST",
      headers: { Authorization: "Basic " + btoa(env.CLICKHOUSE_USER + ":" + env.CLICKHOUSE_PASSWORD), "Content-Type": "text/plain" },
      body: "TRUNCATE TABLE lupon.floor_price_audit"
    });
    await tr.text();
  } catch(e) {}
  const results = [];
  for (const publisherId of PUBLISHER_IDS) {
    try {
      const { floors, stats: chStats } = await fetchFloorData(publisherId, env);
      const recentStats = await getRecentStats(env, publisherId);
      const baseline = await getBaseline(env, publisherId);
      const analysis = await analyzeWithClaude(env, publisherId, floors, recentStats, baseline);
      await saveResults(env, analysis, chStats);
      const originalRes = await fetch(`https://adxbid.info/${publisherId}_gpt_code__geo_latest.json`);
      const originalFloors: any = await originalRes.json();
      for (const update of analysis.floor_updates || []) {
        if ((parseFloat(update.confidence) || 0) < 0.5) continue;
        for (const key of Object.keys(originalFloors.predictions)) {
          if (key.endsWith(`__${update.geo}`)) {
            originalFloors.predictions[key] = parseFloat(update.recommended_floor) || 0;
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
    if (url.pathname === "/api/geo-stats") {
      const sql = "SELECT geo, count() as cnt FROM lupon.auctions GROUP BY geo ORDER BY cnt DESC LIMIT 15 FORMAT JSON";
      const total_sql = "SELECT count() as total FROM lupon.auctions FORMAT JSON";
      const auth = "Basic " + btoa(env.CLICKHOUSE_USER + ":" + env.CLICKHOUSE_PASSWORD);
      const [r1, r2] = await Promise.all([
        fetch(`https://${env.CLICKHOUSE_HOST}:8443/?query=${encodeURIComponent(sql)}`, { headers: { Authorization: auth } }),
        fetch(`https://${env.CLICKHOUSE_HOST}:8443/?query=${encodeURIComponent(total_sql)}`, { headers: { Authorization: auth } })
      ]);
      const d1: any = await r1.json();
      const d2: any = await r2.json();
      const total = parseInt(d2.data[0].total);
      const result = d1.data.map((r: any) => ({ geo: r.geo, cnt: parseInt(r.cnt), pct: (parseInt(r.cnt)/total*100).toFixed(2) }));
      return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }
    if (url.pathname === "/api/cf-geo") {
      const cf = (req as any).cf || {};
      return new Response(JSON.stringify({ country: cf.country||"XX", city: cf.city||"", region: cf.region||"", asn: cf.asn||"", org: cf.asOrganization||"", timezone: cf.timezone||"", colo: cf.colo||"" }), {
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
    if (url.pathname === "/sync") {
      const result = await syncS3ToClickHouse(env);
      return new Response(JSON.stringify({result}), { headers: { "Content-Type": "application/json" } });
    }
    if (url.pathname === "/sync") {
      const result = await syncS3ToClickHouse(env);
      return new Response(JSON.stringify({result}), { headers: { "Content-Type": "application/json" } });
    }
    if (url.pathname === "/run") {
      const result = await runAnalysis(env);
      return new Response(result, { headers: { "Content-Type": "application/json" } });
    }
    return new Response("Lupon Intelligence Worker v1.0", { status: 200 });
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(syncS3ToClickHouse(env).then(() => runAnalysis(env)));
  },
};