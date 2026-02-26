# Lupon/Diurna — Claude Spec (READ BEFORE ANY CHANGE)

## Projects
- Diurna: AI sports publishing SaaS (Next.js, Prisma, Vercel Hobby)
- Lupon Cloud: Ad tech diagnostics platform
- Lupon Command: Central ops hub [PLANNED — build after Diurna 100%]

## Rules (always apply)
- Read this file before making any change
- ALL UI strings must be in Bosnian (bs) for todayfootballmatch.com
- Article content in Bosnian (bs) is correct — never change it
- No console.log in production code
- No mock/placeholder/hardcoded data — real API calls only
- No comments in code
- No TypeScript errors — never use `any` unless unavoidable
- No unused imports or variables

## Build & Deploy
- rm -rf .next && npm run build — must pass clean before every commit
- git push origin main
- Do NOT run vercel deploy — manual only: npx vercel --prod
- Vercel webhook auto-deploys on push to main

## Architecture (do not change without asking)
- Framework: Next.js 14 App Router
- Database: Prisma + PostgreSQL (Neon)
- Auth: NextAuth
- Styling: Tailwind + CSS variables (--sba-* design tokens) + shadcn/ui
- Deployment: Vercel Hobby
- Crons: cron-job.org (not Vercel — Hobby plan limitation)
- ML: AutoGluon on AWS Lambda
- API-Football: Mega plan ($39/mo, 150k requests/day)

## API-Football Quota Rules (CRITICAL)
- NEVER fetch all data at once — use lazy loading per tab/section
- Match page: base load = fixture + events (2 API calls)
- Stats/Lineups/H2H fetched ONLY when user clicks that tab (1 call each)
- All API calls go through cachedFetch() in lib/api-football-cache.ts
- Cache TTLs: live=60s, finished/scheduled=300s, H2H/standings=3600s
- Design for 100 sites × 1000 views/day = must stay under 150k/day
- NEVER add new API-Football endpoints without checking quota impact
- Route: /api/match/[id]?section= (stats|lineups|h2h) for lazy loading

## Match Page Architecture
- Route: /utakmica/[id]
- layout.tsx: Server component — fetches fixture for SEO metadata (og:title, schema.org)
- page.tsx: Client component — fetches from /api/match/[id] with lazy tab loading
- API route: app/api/match/[id]/route.ts — proxies API-Football with DB caching
- Tabs: Pregled (events), Statistika, Postave (lineups+pitch), H2H
- Live matches: auto-poll every 30s (base data only)
- Team logos: from API-Football CDN (media.api-sports.io)
- DO NOT add hardcoded/mock match data — every value must come from API

## Newsroom Rules
- Time filters 1H/6H/12H/24H/ALL must all return results
- Use latestItem datetime field for cluster time filtering
- Site switcher: deduplicate by name, prefer site with domain
- Default active site: always the one with domain set

## NEWSROOM PIPELINE INVARIANTS (NEVER break these)
- FeedSource uniqueness is per-site: @@unique([url, siteId])
- Every NewsItem.create/upsert MUST include siteId (from FeedSource.siteId)
- Every StoryCluster MUST have siteId set (cluster-engine uses per-site key suffix)
- fetch-feeds cron MUST set siteId on every NewsItem and MUST return results array (no silent swallow)
- Newsroom GET /api/newsroom/clusters MUST scope to session's siteId (via query param)
- crossSourceDedup and cluster-engine MUST respect siteId (per-site grouping)
- These rules apply to EVERY code change touching newsroom/feeds/clusters

## Category Normalization
- Articles must use Bosnian category names: VIJESTI, TRANSFERI, POVREDE, ANALIZE
- Autopilot maps English→Bosnian: NEWS→VIJESTI, TRANSFERS→TRANSFERI, etc.
- Never create English category names in the database

## Settings Page (always English for admin)
Tabs: General | API Keys | Team | Invites | Logs | Sync | System Health

## Before Every Commit
Run: rm -rf .next && npm run build
Build must pass with zero errors before pushing.

## Decisions
- Never ask questions — make a decision and proceed
- If multiple approaches exist — pick the simpler one
- If something is broken — fix it before moving on
- If a file doesn't exist — create it
- If unsure about data shape — fetch the relevant API endpoint to check live data first

## Commit Format
- fix: bug fixes
- feat: new features
- perf: performance/quota optimization
- chore: maintenance/cleanup
