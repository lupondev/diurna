# Diurna Multi-Tenant Isolation + DB Indexing Audit

**Date:** 2026-02-25

---

## Section 1: Tenant Isolation

### 1.1 Summary

- **Total API routes scanned:** 107
- **Routes with missing auth (fixed):** 2 — `/api/categories`, `/api/dashboard/stats`
- **Routes with missing tenant scope (fixed):** 3 — `/api/categories`, `/api/dashboard/stats`, `/api/admin/backfill-images`
- **Public routes verified (tenant from host/header):** 2 — `/api/newsroom/for-you`, `/api/organizations`
- **Middleware change:** `/api/dashboard/stats` and `/api/categories` removed from public allowlist; they now require session.

### 1.2 Issues Found and Fixed

| Route | Method | Before | After |
|-------|--------|--------|-------|
| `/api/categories` | GET | No auth, no siteId — returned all tenants' categories | Session required; site resolved from `session.user.organizationId`; query scoped by `siteId` |
| `/api/dashboard/stats` | GET | No auth, no tenant scope — counts/articles/clusters/feeds/categories global | Session required; site from org; all Prisma queries scoped by `siteId` or `organizationId` (articles, storyCluster, feedSource, category) |
| `/api/admin/backfill-images` | POST | CRON_SECRET only; `article.findMany` had no siteId — could update any tenant's articles | Requires `x-org-id` header; `where: { site: { organizationId: orgId } }` added |
| `/api/newsroom/for-you` | GET | `getDefaultSite()` with no arg — used first site in DB | Resolves org from `x-org-slug` header, then `getDefaultSite(organizationId)` |
| `/api/organizations` | GET | `getDefaultSite()` with no arg | Same — org from `x-org-slug`, then `getDefaultSite(organizationId)` |

### 1.3 Auth / Tenant Pattern by Route Type

- **Platform routes (articles, site, team, media, tags, autopilot, analytics, health/dashboard, etc.):** Use `getServerSession(authOptions)` and `session.user.organizationId` or site lookup; Prisma queries use `siteId` or `site: { organizationId }`. No changes made; verified.
- **Admin routes:** Use `requireAdmin()` (session + orgId + role); queries use `organizationId`. No changes.
- **Cron routes:** Use CRON_SECRET or session (e.g. autopilot). Backfill now requires `x-org-id` for tenant scope.
- **Public routes (intentionally no session):** `/api/categories` and `/api/dashboard/stats` were incorrectly in the public list; they are now protected and tenant-scoped. Routes like `/api/newsroom/for-you`, `/api/organizations` remain public but resolve tenant from `x-org-slug` (set by middleware from host).
- **Entity/embed/health:** `/api/entities/search` — global Entity table (no siteId); `/api/health` — no tenant data; `/api/embed/*` — resolve by articleId/slug. No change.

### 1.4 Middleware Tenant Check

- Middleware resolves `x-org-slug` from host (subdomain or `DEFAULT_ORG_SLUG` on localhost) and sets `requestHeaders.set('x-org-slug', orgSlug)`. It does **not** set `x-org-id`; API routes that need site/org resolve them from session or from `x-org-slug` (public routes).
- `x-org-slug` is derived from host only; it cannot be overridden by query params or body (header is set server-side). Safe for public routes that use it.
- Dashboard/stats and categories removed from `isPublicRoute`, so they now require login and session; tenant is then taken from `session.user.organizationId`.

---

## Section 2: Database Indexes

### 2.1 New Index Added

| Model | Index | Rationale |
|-------|--------|-----------|
| StoryCluster | `@@index([siteId, dis])` | Dashboard stats and newsroom queries filter by `siteId` and order by `dis: 'desc'`. Composite index supports `where: { siteId }` + `orderBy: { dis: 'desc' }`. |

### 2.2 Existing Indexes (Relevant to Tenant Queries)

- **Article:** `@@index([siteId, status])`, `@@index([siteId, publishedAt])`, `@@index([siteId, status, deletedAt])`, `@@index([siteId, categoryId])`, `@@index([siteId])` — sufficient for current query patterns.
- **Category:** `@@unique([siteId, slug])` — used for lookups.
- **StoryCluster:** `@@index([siteId, category])`, `@@index([dis])`; new `@@index([siteId, dis])` for tenant-scoped DIS ordering.
- **FeedSource:** `@@index([siteId, active])`.
- **NewsItem:** `@@index([siteId, pubDate])`, `@@index([siteId, category, pubDate])`.

No further indexes added; no speculative indexes.

### 2.3 N+1 and Select Optimization

- No N+1 fixes applied in this audit. Dashboard stats uses a single `Promise.all` with multiple independent queries (no loop over results with per-item DB calls).
- Heavy list endpoints (e.g. articles list, newsroom) already use `select` or `include` appropriately in the codebase; no changes made in this pass.

---

## Section 3: Risk Assessment

### HIGH (Fixed)

- **`/api/categories`** — Returned all categories across all tenants. **Fixed:** Auth + siteId scope.
- **`/api/dashboard/stats`** — Exposed global counts and cluster/category data. **Fixed:** Auth + full tenant scope for all queries.
- **`/api/admin/backfill-images`** — Could set featuredImage on any tenant’s articles. **Fixed:** Requires `x-org-id` and scopes by `organizationId`.

### MEDIUM (Fixed)

- **`/api/newsroom/for-you`** and **`/api/organizations`** — Used first site in DB when no org context. **Fixed:** Resolve org from `x-org-slug` (middleware) then site from that org.

### LOW

- **Missing indexes** — Added one composite index for StoryCluster (siteId + dis). Other queries already covered by existing indexes.
- **Entity table** — Global (no siteId); used for search/autocomplete. No tenant leak.

---

## Section 3.5: Common Auth Helper

- **`lib/api-auth.ts`** — `getApiContext()` returns `{ userId, orgId, siteId, site, role }` or `null`. Uses `getServerSession(authOptions)` and `getDefaultSite(organizationId)`. Routes can call `const ctx = await getApiContext(); if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });` and use `ctx.siteId` / `ctx.orgId` for all Prisma queries. Refactor routes incrementally to use this helper.

## Section 4: Files Changed

| File | Change |
|------|--------|
| `middleware.ts` | Removed `isDashboardStats` and `isCategoriesRoute` from public allowlist so `/api/dashboard/stats` and `/api/categories` require auth. |
| `app/api/categories/route.ts` | Added `getServerSession`; resolve site from `session.user.organizationId`; scope `category.findMany` by `siteId`. |
| `app/api/dashboard/stats/route.ts` | Added `getServerSession`; resolve site from org; scoped all Prisma queries (articles, storyCluster, feedSource, category) by `siteId` or org. |
| `app/api/admin/backfill-images/route.ts` | Require `x-org-id` header; scope `article.findMany` by `site: { organizationId: orgId }`. |
| `app/api/newsroom/for-you/route.ts` | Resolve org from `x-org-slug` header; call `getDefaultSite(organizationId)`. |
| `app/api/organizations/route.ts` | Same — resolve org from `x-org-slug`, then `getDefaultSite(organizationId)`. |
| `prisma/schema.prisma` | Added `@@index([siteId, dis])` on `StoryCluster`. |

---

## Section 5: Prisma

- `npx prisma format` and `npx prisma validate` can be run after schema change.
- **Migration:** Not run automatically. To generate migration SQL for the new index:
  ```bash
  npx prisma migrate dev --name add_story_cluster_site_id_dis_index --create-only
  ```
  Or apply manually in production.

---

## Section 6: Build

After all changes: `rm -rf .next && npm run build` must complete with **zero errors**.
