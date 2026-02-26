# Diurna — Code Review Report

**Scope:** Code quality, performance, security, tests, documentation, architecture, maintainability.  
**Severity levels:** Critical | High | Medium | Low | Info

---

## 1. Code Quality & Best Practices

### 1.1 Auth JWT callback hits DB on every request

**Severity:** Medium  
**Location:** `lib/auth.ts` (lines 59–84)

**Explanation:** The JWT callback runs on every authenticated request and performs a `prisma.user.findUnique` (with orgs) to refresh `onboardingCompleted` and org/role. This adds latency and DB load for every API call and page load.

**Recommendation:** Refresh from DB only when a “stale” threshold is exceeded (e.g. token.updatedAt and refresh every 5–10 minutes), or after specific actions (e.g. completing onboarding) instead of every request.

```typescript
// Option: refresh only when token is older than 5 minutes
const STALE_MS = 5 * 60 * 1000
if (token.id && (Date.now() - (token._refreshedAt ?? 0)) > STALE_MS) {
  try {
    const dbUser = await prisma.user.findUnique({ ... })
    if (dbUser) {
      token.onboardingCompleted = dbUser.onboardingCompleted
      token._refreshedAt = Date.now()
      // ...
    }
  } catch (err) { ... }
}
```

---

### 1.2 `lib/db.ts` — `getArticleById` has no tenant scope

**Severity:** High (security)  
**Location:** `lib/db.ts` (lines 36–44)

**Explanation:** `getArticleById(id)` returns any article by ID with no `siteId` or `organizationId` filter. It is used in `app/api/sync/wordpress/route.ts`: after resolving the user’s site, the route calls `getArticleById(articleId)`. A user can pass another tenant’s `articleId` and push that article to their WordPress (IDOR).

**Recommendation:** Remove or narrow `getArticleById`. For WordPress sync, fetch the article scoped to the org’s site:

```typescript
// app/api/sync/wordpress/route.ts — replace getArticleById(articleId)
const article = await prisma.article.findFirst({
  where: {
    id: articleId,
    siteId: site.id,
    deletedAt: null,
  },
  include: { category: true, site: true },
})
if (!article) {
  return NextResponse.json({ error: 'Article not found' }, { status: 404 })
}
```

Then stop using `getArticleById` for sync (and consider deprecating it or making it internal + tenant-scoped).

---

### 1.3 `getDashboardStats(organizationId?)` with no org counts globally

**Severity:** Medium  
**Location:** `lib/db.ts` (lines 46–60)

**Explanation:** When `organizationId` is omitted, `orgFilter` is `{}`, so counts are global (all tenants). If any caller passes `undefined`, it leaks cross-tenant stats.

**Recommendation:** Require `organizationId` for dashboard stats, or return an error when it’s missing:

```typescript
export async function getDashboardStats(organizationId: string) {
  const orgFilter = { site: { organizationId } }
  const [published, drafts, aiGenerated, teamMembers] = await Promise.all([
    prisma.article.count({ where: { status: 'PUBLISHED', deletedAt: null, ...orgFilter } }),
    // ...
  ])
  return { published, drafts, aiGenerated, teamMembers }
}
```

---

### 1.4 Public article fetch uses `getDefaultSite()` with no context

**Severity:** Medium  
**Location:** `lib/public-article.tsx` — `fetchArticle()` (line 22)

**Explanation:** `fetchArticle(slug, categorySlug)` calls `getDefaultSite()` with no argument, so it uses the first site in the DB. On multi-tenant deployments, article pages could be rendered for the wrong tenant if the host/tenant is not passed.

**Recommendation:** Resolve site from request context (e.g. host or `x-org-slug` from middleware) and pass it in. Add an optional parameter, e.g. `getDefaultSite(organizationId?)`, and resolve `organizationId` from the request in the page/layout that calls `fetchArticle`, then pass site (or org id) into `fetchArticle`.

---

### 1.5 Inconsistent error handling in API routes

**Severity:** Low  
**Location:** Various API routes (e.g. `app/api/categories/route.ts` still uses `console.error` only)

**Explanation:** Some routes use `captureApiError()` (Sentry), others only `console.error`. Categories GET and a few others were not updated in the Sentry pass.

**Recommendation:** Use `captureApiError` in all API route catch blocks that return 500, with route/method context.

```typescript
// app/api/categories/route.ts
import { captureApiError } from '@/lib/sentry'
// ...
} catch (error) {
  captureApiError(error, { route: '/api/categories', method: 'GET' })
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

---

### 1.6 CSRF origin check is too permissive

**Severity:** Medium  
**Location:** `lib/csrf.ts` (line 14)

**Explanation:** `ALLOWED_ORIGINS.some((allowed) => origin.startsWith(allowed!))` allows any origin that *starts with* an allowed value (e.g. `https://evil-NEXTAUTH_URL.com` if `NEXTAUTH_URL` is `https://app.diurna.app`).

**Recommendation:** Compare exact origin or use a strict prefix that includes the full host (and ensure no trailing slash/port mismatch). Prefer exact match for known origins:

```typescript
export function validateOrigin(req: NextRequest | Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true
  try {
    const o = new URL(origin)
    return ALLOWED_ORIGINS.some((allowed) => {
      if (!allowed) return false
      const a = new URL(allowed)
      return o.origin === a.origin
    })
  } catch {
    return false
  }
}
```

---

## 2. Performance & Optimization

### 2.1 JWT callback DB read on every request

**Severity:** Medium  
**Location:** `lib/auth.ts`  
**Explanation:** See 1.1 — reduces latency and DB load if made conditional or less frequent.

---

### 2.2 In-memory rate limiter does not scale across instances

**Severity:** Medium  
**Location:** `lib/rate-limit.ts`

**Explanation:** The rate limiter uses a single in-memory `Map`. On Vercel (or any multi-instance deployment), each instance has its own map, so limits are per-instance. A user can exceed the intended limit by hitting different instances.

**Recommendation:** For production, use a shared store (e.g. Redis/Upstash) or Vercel KV so limits are global. Keep the in-memory implementation for dev/local.

---

### 2.3 Article list already uses `select` — good

**Severity:** Info  
**Location:** `app/api/articles/route.ts` (GET)

**Explanation:** The articles list uses a focused `select` (no full `content`), which is good for performance. Same pattern is recommended for other list endpoints.

---

### 2.4 Possible N+1 in `lib/public-article.tsx`

**Severity:** Low  
**Location:** `lib/public-article.tsx` — author and related queries

**Explanation:** After loading the article, the code fetches author and then “by author” and “related” articles in separate calls. This could be collapsed into one or two queries with `include`/`select` to avoid extra round-trips.

**Recommendation:** Consider a single query with `include: { category: {...}, tags: {...}, author: { select: { name: true, image: true } } }` and then one additional query for “related” and “by author” if needed, or batch them in a single `Promise.all` and keep the current structure but ensure no loop over items with per-item DB calls.

---

## 3. Security Vulnerabilities & Fixes

### 3.1 WordPress sync: article not scoped to tenant (IDOR)

**Severity:** Critical  
**Location:** `app/api/sync/wordpress/route.ts` (line 55)

**Explanation:** The route uses `getArticleById(articleId)`, which returns any article by ID. An authenticated user can pass another tenant’s article ID and push it to their WordPress.

**Recommendation:** See 1.2 — fetch article with `siteId: site.id` (and `deletedAt: null`) and remove use of unscoped `getArticleById` here.

---

### 3.2 Breaking-news webhook accepts `orgId` from body

**Severity:** High  
**Location:** `app/api/webhooks/breaking-news/route.ts` (lines 18–19, 37–39)

**Explanation:** The webhook body includes `orgId`. The route finds an active autopilot config with `...(body.orgId ? { orgId: body.orgId } : {})`. An attacker who knows or guesses another tenant’s `orgId` and has the cron secret can trigger article generation for that tenant (cross-tenant action).

**Recommendation:** Do not trust `body.orgId` for tenant selection. Either remove it and determine org from the cluster’s `siteId`, or require a separate signed/encrypted claim that binds the request to one org. Example: derive org from the cluster only:

```typescript
const cluster = await prisma.storyCluster.findUnique({
  where: { id: body.clusterId },
  select: { siteId: true },
})
if (!cluster?.siteId) return NextResponse.json({ success: false, reason: 'Cluster not found' }, { status: 404 })
const site = await prisma.site.findFirst({
  where: { id: cluster.siteId },
  include: { organization: true },
})
// Use site.organizationId for config lookup; ignore body.orgId
```

---

### 3.3 Cron secret in client bundle (`NEXT_PUBLIC_CRON_SECRET`)

**Severity:** Critical  
**Location:** `app/(platform)/newsroom/page.tsx` (line 193)

**Explanation:** The page uses `process.env.NEXT_PUBLIC_CRON_SECRET` to send the cron secret in the `x-cron-secret` header for “Manual fetch”. Any env var prefixed with `NEXT_PUBLIC_` is inlined into the client bundle and visible to anyone. If `NEXT_PUBLIC_CRON_SECRET` is set, the cron secret is exposed.

**Recommendation:** Never expose the cron secret to the client. Implement a server action or a small API route (e.g. `POST /api/newsroom/trigger-fetch`) that checks session (and optionally role), then calls the cron logic internally or triggers the cron endpoint server-side with `CRON_SECRET` from server env only. The client only calls this authenticated endpoint.

```typescript
// Server action or API route (e.g. app/api/newsroom/trigger-fetch/route.ts)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'Cron not configured' }, { status: 503 })
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  await fetch(`${base}/api/cron/fetch-feeds`, {
    headers: { Authorization: `Bearer ${secret}` },
  })
  await fetch(`${base}/api/cron/cluster-engine`, {
    headers: { Authorization: `Bearer ${secret}` },
  })
  return NextResponse.json({ success: true })
}
```

Remove any use of `NEXT_PUBLIC_CRON_SECRET` and ensure `CRON_SECRET` is server-only.

---

### 3.4 Entities search: no auth and no rate limit

**Severity:** Medium  
**Location:** `app/api/entities/search/route.ts`

**Explanation:** The route is public, has no rate limit, and accepts a query param `q`. It can be abused for scraping or DoS (many requests / expensive ILIKE/has queries).

**Recommendation:** Add rate limiting (e.g. by IP or by a short-lived token) and optionally require a minimal API key or session for sensitive deployments. At least add IP-based rate limiting.

---

### 3.5 Middleware: MCP secret in header bypasses auth

**Severity:** Medium (by design, but risky)  
**Location:** `middleware.ts` (lines 124–128)

**Explanation:** If `x-mcp-secret` equals `MCP_SECRET`, routes under `/api/autopilot`, `/api/articles`, and `/api/site` are treated as public. Anyone with the secret has full API access. The secret must be strong and not exposed (no `NEXT_PUBLIC_`).

**Recommendation:** Ensure `MCP_SECRET` is long-lived, random, and server-only. Prefer scoped tokens (e.g. per-org or per-client) and audit who has access. Document that this is an internal integration and should not be exposed to the browser.

---

## 4. Test Coverage & Quality

### 4.1 Unit tests cover only a small surface

**Severity:** Medium  
**Location:** `tests/unit/` — only `utils`, `seo`, `rate-limit`

**Explanation:** There are no unit tests for auth helpers, CSRF, db helpers, or API handlers. Critical paths (tenant resolution, article access, sync) are untested.

**Recommendation:** Add unit tests for:
- `lib/db.ts`: `getDefaultSite(orgId)`, `getDashboardStats(orgId)` (require orgId), and that no unscoped `getArticleById` is used in tenant flows.
- `lib/csrf.ts`: `validateOrigin` (allowed vs disallowed origins).
- `lib/auth.ts`: JWT/session shape (with mocks; no real DB).
- Slugify and SEO tests are a good start; expand with edge cases (XSS-like input, long strings).

---

### 4.2 E2E smoke tests are minimal

**Severity:** Low  
**Location:** `tests/e2e/smoke.spec.ts`

**Explanation:** Smoke tests cover homepage, 404, robots, sitemap, login, dashboard redirect, and two API status codes. There are no flows for creating an article, tenant isolation, or critical user journeys.

**Recommendation:** Add E2E tests for: (1) authenticated article create/edit (with test user), (2) unauthenticated access to dashboard redirects to login, (3) optional: public article page returns 200 for a known slug. Use fixtures or seed data and avoid depending on production data.

---

### 4.3 No integration tests for API tenant isolation

**Severity:** High  
**Location:** Missing

**Explanation:** The most critical risk is cross-tenant data access. There are no tests that assert “user A cannot read/update user B’s article/site” via the API.

**Recommendation:** Add API integration tests (e.g. Vitest + fetch or Playwright request context) that: (1) create or identify two orgs/sites and two users, (2) as user A, request article by ID that belongs to site B — expect 404 or 403, (3) as user A, PATCH/POST to a resource that belongs to site B — expect 403. Repeat for key routes (articles, categories, dashboard/stats, sync/wordpress).

---

## 5. Documentation Completeness

### 5.1 README is high-level; env and tenant model under-documented

**Severity:** Low  
**Location:** `README.md`

**Explanation:** README covers stack, get-started, cron, and points to a spec. Environment variables (especially `CRON_SECRET`, `MCP_SECRET`, `NEXTAUTH_SECRET`, Sentry, and tenant-related vars) are not fully listed or explained. Multi-tenant model (org → site, subdomain vs custom domain) is not summarized.

**Recommendation:** Add an “Environment variables” section (or point to `.env.example` with comments). Add a short “Multi-tenancy” section: how tenant is resolved (host → org slug → site), and that all data access must be scoped by `siteId`/`organizationId`.

---

### 5.2 TENANT_AUDIT.md is valuable; keep it as living doc

**Severity:** Info  
**Location:** `TENANT_AUDIT.md`

**Explanation:** The audit document clearly lists what was fixed and the intended patterns. It should be updated when new API routes or tenant-sensitive logic are added.

**Recommendation:** In CONTRIBUTING or README, mention that new API routes must follow the tenant-isolation and auth patterns described in TENANT_AUDIT.md and that changes should be reflected there.

---

## 6. Architectural Concerns

### 6.1 Mixed auth paths: session vs MCP vs cron

**Severity:** Medium  
**Location:** Multiple API routes

**Explanation:** Some routes use session only, some allow MCP secret, some cron secret, and the middleware encodes this in a long `isPublicRoute` list. This is hard to reason about and easy to misconfigure when adding routes.

**Recommendation:** Centralize auth in a small set of helpers, e.g. `requireSession()`, `requireCronSecret()`, `requireMcpSecret()`, and a single “get tenant site for current request” helper that respects session or MCP headers. Document which routes use which and keep the middleware allowlist in sync with that.

---

### 6.2 getDefaultSite(organizationId?) used in many places

**Severity:** Low  
**Location:** `lib/db.ts`, used across app and API

**Explanation:** Callers that pass no argument get “first site in DB”, which is only correct for single-tenant or when the caller truly intends global default. Several call sites (e.g. public article fetch) should pass org/site from request context.

**Recommendation:** Audit all `getDefaultSite()` call sites. Where the request has a tenant (host or session), resolve org/site from that and pass `organizationId` (or equivalent). Consider renaming to `getDefaultSiteForOrg(organizationId)` and requiring the argument in production.

---

### 6.3 No explicit API versioning

**Severity:** Info  
**Location:** All API routes under `/api/`

**Explanation:** All routes are unversioned. Future breaking changes (e.g. response shape, required fields) may break existing clients.

**Recommendation:** When you introduce breaking changes, consider a prefix like `/api/v1/` and keep v1 stable while adding v2. Not urgent but good to decide before external clients depend on the API.

---

## 7. Maintainability Improvements

### 7.1 Extract tenant resolution into a single helper

**Severity:** Medium  
**Location:** Repeated in many API routes

**Explanation:** “Get session → get orgId → find site for org” is duplicated across dashboard/stats, categories, articles, etc. Duplication increases the chance of mistakes (e.g. forgetting to scope a query).

**Recommendation:** Add something like `getSiteForRequest(req)` (or `getSiteForSession(session)`) that returns `{ site, organizationId }` or null, and use it in all platform API routes. Then all Prisma calls can consistently use `site.id` or `organizationId`.

```typescript
// lib/tenant.ts (or inside auth)
export async function getSiteForSession(session: { user?: { organizationId?: string | null } } | null) {
  if (!session?.user?.organizationId) return null
  const site = await prisma.site.findFirst({
    where: { organizationId: session.user.organizationId, deletedAt: null },
    select: { id: true, name: true, slug: true, organizationId: true },
  })
  return site
}
```

---

### 7.2 Type session user shape

**Severity:** Low  
**Location:** `lib/auth.ts` and callbacks

**Explanation:** Session user is extended with `id`, `organizationId`, `role`, `onboardingCompleted`, but the code uses `(user as unknown as { organizationId?: string | null })`. NextAuth allows typing the session; doing so would remove casts and prevent typos.

**Recommendation:** Extend NextAuth types (e.g. in `types/next-auth.d.ts`) with `id`, `organizationId`, `role`, `onboardingCompleted` on `User` and `Session["user"]`, and use these types in callbacks and in `requireAdmin`/route handlers.

---

### 7.3 Middleware: long boolean chain for public routes

**Severity:** Low  
**Location:** `middleware.ts` (lines 102–129)

**Explanation:** `isPublicRoute` is one long expression. Adding or changing a condition is error-prone.

**Recommendation:** Build the list from small named helpers or a list of path patterns, e.g.:

```typescript
const PUBLIC_PATTERNS: Array<(p: string) => boolean> = [
  p => p === '/',
  p => ['/o-nama', '/impressum', ...].includes(p),
  p => p.startsWith('/api/auth'),
  // ...
]
const isPublicRoute = PUBLIC_PATTERNS.some(fn => fn(pathname))
```

Or keep an array of path prefixes and use `PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))` for readability.

---

## Summary Table

| #   | Area              | Severity  | One-line summary |
|-----|-------------------|-----------|------------------|
| 1.2 | Tenant scope      | High      | `getArticleById` unscoped; used in WordPress sync (IDOR). |
| 3.1 | Security (IDOR)   | Critical  | WordPress sync: any article ID can be pushed to attacker’s WP. |
| 3.2 | Security (webhook)| High      | Breaking-news webhook trusts `body.orgId` → cross-tenant trigger. |
| 3.3 | Security (secret) | Critical  | `NEXT_PUBLIC_CRON_SECRET` must not be used; use server-only trigger. |
| 4.3 | Tests            | High      | No API tests for tenant isolation. |
| 1.1 | Performance       | Medium    | JWT callback DB read on every request. |
| 1.3 | Tenant scope      | Medium    | `getDashboardStats()` without org counts all tenants. |
| 1.4 | Tenant context    | Medium    | `fetchArticle` uses `getDefaultSite()` with no request context. |
| 1.6 | CSRF              | Medium    | Origin check uses `startsWith` → can be bypassed. |
| 2.2 | Performance       | Medium    | Rate limiter in-memory only; not shared across instances. |
| 3.4 | Security          | Medium    | Entities search has no rate limit. |
| 6.1 | Architecture      | Medium    | Mixed auth paths; centralize and document. |
| 7.1 | Maintainability   | Medium    | Extract tenant resolution into one helper. |
| 1.5 | Consistency       | Low       | Some routes still only `console.error` instead of Sentry. |
| 2.4 | Performance       | Low       | Possible N+1 in public article fetch. |
| 4.1 | Tests            | Medium    | Unit tests only cover utils/seo/rate-limit. |
| 4.2 | Tests            | Low       | E2E smoke tests minimal. |
| 5.1 | Docs             | Low       | Env and tenant model could be clearer. |
| 6.2 | Architecture     | Low       | Audit `getDefaultSite()` call sites. |
| 7.2 | Maintainability  | Low       | Type NextAuth session user. |
| 7.3 | Maintainability  | Low       | Middleware public-route logic can be simplified. |

---

**Suggested order of work:** Fix 3.3 (no client cron secret) and 3.1/1.2 (WordPress sync tenant scope) first, then 3.2 (webhook orgId). Then add tenant-isolation API tests (4.3), then performance/maintainability items (JWT refresh, tenant helper, rate limiter).
