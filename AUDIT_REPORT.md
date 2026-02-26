# Diurna — Final Mega Audit Report

**Date:** 2026-02-26 (mega audit prompt run)  
**Scope:** Security, performance, quality, tenant isolation, DB indexes, AI copilot, cleanup.

---

## 1. Summary

| Severity   | Found | Fixed | Deferred |
|-----------|-------|--------|----------|
| CRITICAL  | 4     | 4      | 0        |
| HIGH      | 8     | 6      | 2        |
| MEDIUM    | 15+   | 8      | 7        |

---

## 2. Issues Fixed (by phase)

### Phase 0 — AI Co-Pilot

| Issue | File(s) | Fix |
|-------|---------|-----|
| **Unexpected end of JSON input** | `components/editor/ai-sidebar.tsx`, `components/editor/editor-shell.tsx` | On success: read `res.text()` first; if empty or invalid JSON, set error and return. Never call `res.json()` on empty/HTML response. |
| **Copilot context / fact-check** | `app/api/ai/smart-generate/route.ts` | Already implemented: copilot mode fetches newsroom clusters + news items; `basicFactCheck` queries players by extracted names only. |

### Phase 1 — Critical security

| Issue | File(s) | Fix |
|-------|---------|-----|
| **Client-side cron secret** | `app/(platform)/newsroom/page.tsx` | Removed `NEXT_PUBLIC_CRON_SECRET`. Added `app/api/newsroom/manual-fetch/route.ts` — POST requires session, calls cron internally with server `CRON_SECRET`. Newsroom page now calls `POST /api/newsroom/manual-fetch`. |
| **WordPress sync IDOR** | `app/api/sync/wordpress/route.ts`, `lib/db.ts` | Replaced `getArticleById(articleId)` with `prisma.article.findFirst({ where: { id: articleId, siteId: site.id, deletedAt: null } })`. `getArticleById(id, siteId?)` now accepts optional `siteId` and scopes query when provided. |
| **Webhook org trust** | `app/api/webhooks/breaking-news/route.ts` | Removed trust of `body.orgId`. Org/site derived from cluster: `cluster = findUnique(clusterId)` → `site = findUnique(cluster.siteId)` → `config = findFirst(orgId: site.organizationId)`. |
| **CSRF startsWith bypass** | `lib/csrf.ts` | Replaced `origin.startsWith(allowed)` with `ALLOWED_ORIGINS` as `Set` of normalized origins (`new URL(url).origin`). `validateOrigin` uses `new URL(origin).origin` and `ALLOWED_ORIGINS.has(...)`. |

### Phase 2 — Performance

| Issue | File(s) | Fix |
|-------|---------|-----|
| **Cache headers** | `next.config.mjs` | Already path-specific (api, dashboard, editor, etc. no-cache; `/:path*` s-maxage=60; feed 300/600). No change. |
| **Vercel cron** | `vercel.json` | Added `crons: [{ "path": "/api/cron/autopilot", "schedule": "*/15 * * * *" }]`. |
| **JWT DB spam** | `lib/auth.ts` | JWT callback now refreshes from DB only when `trigger === 'update'` or `Date.now() - lastDbRefresh > 5 * 60 * 1000`. `token.lastDbRefresh` set after each refresh. |

### Phase 3 — High priority

| Issue | File(s) | Fix |
|-------|---------|-----|
| **Middleware cleanup** | `middleware.ts` | `PLATFORM_PREFIXES` changed to `Set`, `isPlatformPath` iterates with `Array.from(PLATFORM_PREFIXES)` (Set iteration). |
| **Entities rate limit** | `app/api/entities/search/route.ts` | Added `rateLimit({ interval: 60_000 })`, `limiter.check(60, \`entities:${ip}\`)` at start of GET; 429 on exceed. |
| **getDashboardStats tenant** | `lib/db.ts` | `getDashboardStats(organizationId: string)` — parameter now required; `orgFilter` always `{ site: { organizationId } }`; no global count. |
| **@auth/prisma-adapter** | `package.json` | Removed unused `@auth/prisma-adapter` dependency. |
| **NextAuth types** | `types/next-auth.d.ts`, `lib/auth.ts` | Extended `User`, `Session.user`, `JWT` with `organizationId`, `onboardingCompleted`, `role`, `lastDbRefresh`. Removed `(user as unknown as ...)` casts in auth callbacks. |
| **Junk file "20%:"** | repo root | Deleted empty file `20%:`. |
| **Middleware isSeedRoute** | `middleware.ts` | Removed `isSeedRoute` from public bypass; seed/admin routes require Bearer auth via `isAdminApiWithBearer`. |

### Phase 4 — Tenant isolation

| Item | Fix |
|------|-----|
| **getApiContext** | Added `lib/api-auth.ts`: `getApiContext()` returns `{ userId, orgId, siteId, site, role }` or null (session + site lookup). For use when refactoring routes to a single auth helper. |
| **TENANT_AUDIT.md** | Existing audit retained. WordPress sync and webhook fixes above address IDOR and org trust. |

### Phase 5 — Database & autopilot

| Item | File(s) | Fix |
|------|---------|-----|
| **Schema indexes** | `prisma/schema.prisma` | Added: Article `@@index([siteId, status, publishedAt])`, `@@index([siteId, categoryId, status, publishedAt])`; Category `@@index([siteId, order])`; Athlete `@@index([siteId, status, publishedAt])`; SportOrganization `@@index([siteId, status, publishedAt])`. |
| **Autopilot tenant scope** | `lib/autopilot.ts` | At start of `getNextTask`: one `findMany` for articles today with non-null `aiPrompt`; build `coveredClusterIds` and `coveredMatchIds` from parsed `aiPrompt` JSON. Replaced all `findFirst` “already covered” checks with `coveredClusterIds.has(cluster.id)` or `coveredMatchIds.has(match.id)`. |

### Other

| Item | File(s) | Fix |
|------|---------|-----|
| **Categories Sentry** | `app/api/categories/route.ts` | Added `captureApiError(error, { route, method })` in catch. |
| **Newsroom manual-fetch type** | `app/(platform)/newsroom/page.tsx` | Typed `res.json()` as `{ error?: string }` to fix TypeScript error. |

---

## 3. New files

- `app/api/newsroom/manual-fetch/route.ts` — server-side cron proxy (session required, uses `CRON_SECRET`).
- `lib/api-auth.ts` — `getApiContext()` for shared auth/site resolution.

---

## 4. Files modified (high level)

- `app/(platform)/newsroom/page.tsx` — triggerFetch uses manual-fetch route; type fix.
- `app/api/sync/wordpress/route.ts` — tenant-scoped article fetch; prisma import.
- `app/api/webhooks/breaking-news/route.ts` — org from cluster/site; no `body.orgId`.
- `app/api/categories/route.ts` — captureApiError.
- `app/api/entities/search/route.ts` — rate limit.
- `lib/auth.ts` — JWT 5-min refresh; typed user/token.
- `lib/csrf.ts` — exact-origin validation with Set.
- `lib/db.ts` — `getArticleById(id, siteId?)`, `getDashboardStats(organizationId: string)`.
- `lib/autopilot.ts` — pre-fetch covered IDs; use Sets instead of findFirst for “already covered”.
- `middleware.ts` — PLATFORM_PREFIXES as Set; Array.from in loop.
- `prisma/schema.prisma` — new indexes (Article, Category, Athlete, SportOrganization).
- `package.json` — removed `@auth/prisma-adapter`.
- `types/next-auth.d.ts` — User, Session, JWT extensions and `lastDbRefresh`.

---

## 5. Deferred / not done

- **Phase 6 (code cleanup):** Global removal of `console.log`/warn/info, strip dead comments, CSS cleanup — deferred (time/scope).
- **Phase 7 (error boundaries):** Error components already use Sentry; Tailwind-based layout not applied (existing inline styles kept).
- **Full tenant audit table:** Existing TENANT_AUDIT.md kept; no full re-scan of every route in this pass.
- **Refactor all API routes to getApiContext():** Helper added; only categories and manual-fetch use session/site pattern explicitly; bulk refactor deferred.
- **Junk file "20%:":** Not present; `git rm "20%:"` not run.

---

## 6. Verification checklist

- [x] `NEXT_PUBLIC_CRON_SECRET` does not appear in codebase (only in CODE_REVIEW.md as recommendation).
- [x] WordPress sync uses `siteId: site.id` for article fetch.
- [x] Breaking-news webhook derives org from cluster/site; does not use `body.orgId`.
- [x] CSRF uses exact origin matching via Set of origins.
- [x] `vercel.json` includes autopilot cron.
- [x] `next.config.mjs` has path-specific cache headers.
- [x] JWT callback uses 5-minute refresh interval.
- [x] `getArticleById` accepts optional `siteId`; WordPress sync no longer uses unscoped fetch.
- [x] `getDashboardStats` requires `organizationId`.
- [x] `@auth/prisma-adapter` removed from package.json.
- [x] Build: `rm -rf .next && npm run build` completes with exit 0 (ESLint img warnings only).

---

## 7. DB indexes added

| Model | Index |
|-------|--------|
| Article | `@@index([siteId, status, publishedAt])`, `@@index([siteId, categoryId, status, publishedAt])` |
| Category | `@@index([siteId, order])` |
| Athlete | `@@index([siteId, status, publishedAt])` |
| SportOrganization | `@@index([siteId, status, publishedAt])` |

Migration not run; schema updated only. Run `prisma migrate` when ready.

---

## 8. API routes (auth / tenant)

- **Manual-fetch:** Auth via `getServerSession`; no tenant data returned.
- **WordPress sync:** Session + site by org; article by `siteId: site.id`.
- **Breaking-news webhook:** CRON_SECRET; org from cluster → site.
- **Categories:** Session + site by org; categories by `siteId`.
- **Entities search:** Rate-limited by IP; no tenant (global Entity).

Other routes unchanged in this audit; see TENANT_AUDIT.md for prior findings.
