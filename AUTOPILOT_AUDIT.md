# Autopilot Configuration — Full Audit

## Bug #1 (CRITICAL) — Sources "URL already exists" when showing 0 sources

**Root cause:** FeedSource had `url String @unique` (global). Uniqueness was enforced across all tenants, so if any tenant had a URL, no other tenant could add it. GET correctly filtered by `siteId`, so the table showed "0 of 0" for the current site while POST failed on global unique.

**Fix applied:**
- **prisma/schema.prisma:** Removed `@unique` from `url`; added `@@unique([url, siteId])` so the same URL can exist per tenant.
- **app/api/newsroom/feed/sources/route.ts:** Before create, explicit `findFirst({ where: { url: urlTrimmed, siteId: site.id } })`; return 409 if exists. Removed console.error from catch.

**Verification:** Same user cannot add duplicate URL for their site. Different tenants can add the same URL. GET returns only sources for the current site.

---

## Audit Table — All 6 Tabs & Endpoints

| Tab | Endpoint | Method | Auth | Tenant-Scoped | Bug | Fixed |
|-----|----------|--------|------|---------------|-----|-------|
| Output | /api/autopilot/config | GET | ✅ | ✅ (orgId) | — | — |
| Output | /api/autopilot/config | PUT | ✅ (ADMIN/OWNER) | ✅ (orgId) | — | — |
| Categories | /api/autopilot/categories | POST | ✅ (ADMIN/OWNER) | ✅ (configId) | — | — |
| Categories | /api/autopilot/categories/[id] | PUT | ✅ (ADMIN/OWNER) | ❌→✅ | IDOR: update any category by id | ✅ |
| Categories | /api/autopilot/categories/[id] | DELETE | ✅ (ADMIN/OWNER) | ❌→✅ | IDOR: delete any category by id | ✅ |
| Leagues & Topics | /api/autopilot/leagues | POST | ✅ (ADMIN/OWNER) | ✅ (configId) | — | — |
| Leagues & Topics | /api/autopilot/leagues/[id] | PUT | ✅ (ADMIN/OWNER) | ❌→✅ | IDOR: update any league by id | ✅ |
| Leagues & Topics | /api/autopilot/leagues/[id] | DELETE | ✅ (ADMIN/OWNER) | ❌→✅ | IDOR: delete any league by id | ✅ |
| Leagues & Topics | /api/autopilot/topics | POST | ✅ (ADMIN/OWNER) | ✅ (configId) | — | — |
| Leagues & Topics | /api/autopilot/topics/[id] | DELETE | ✅ (ADMIN/OWNER) | ❌→✅ | IDOR: delete any topic by id | ✅ |
| Sources | /api/newsroom/feed/sources | GET | ✅ | ✅ (siteId) | — | — |
| Sources | /api/newsroom/feed/sources | POST | ✅ | ❌→✅ | URL unique across tenants | ✅ |
| Sources | /api/newsroom/feed/sources/[id] | PATCH | ✅ | ✅ (siteId check) | — | — |
| Distribution | /api/autopilot/channels | POST | ✅ (ADMIN/OWNER) | ✅ (configId) | — | — |
| Distribution | /api/autopilot/channels/[id] | PUT | ✅ (ADMIN/OWNER) | ❌→✅ | IDOR: update any channel by id | ✅ |
| Distribution | /api/autopilot/channels/[id] | DELETE | ✅ (ADMIN/OWNER) | ❌→✅ | IDOR: delete any channel by id | ✅ |
| — | /api/autopilot/timeline | GET | ✅ | ✅ (siteId) | console.error in prod | ✅ (removed) |
| — | /api/autopilot/stats | GET | ✅ | ✅ (orgId/siteId) | — | — |
| — | /api/autopilot/status | GET | ✅ or MCP secret | ✅ (orgId) | — | — |

---

## Tab Summary

### Tab 1: Output
- Config read/written via `/api/autopilot/config` (GET/PUT). Stored in `AutopilotConfig` by `orgId`.
- `lib/autopilot.ts` uses `config.dailyTarget`, `config.defaultLength`, `config.categories`, `config.leagues`, `config.topics` for getNextTask(). ✅ Applied.

### Tab 2: Categories
- Categories are config-scoped (`AutopilotCategory.configId`). PUT/DELETE by [id] now verify `config.orgId === session.user.organizationId`. ✅

### Tab 3: Leagues & Topics
- Leagues/topics config-scoped. PUT/DELETE by [id] now verify ownership. ✅
- Ligue list in UI from config; autopilot uses config.leagues and config.topics. ✅

### Tab 4: Sources
- GET: `siteId: site.id`. POST: explicit tenant uniqueness check + `@@unique([url, siteId])`. PATCH [id]: existing check `siteId: site.id`. ✅
- No DELETE in UI; cron fetch-feeds reads all active FeedSources (all tenants) and creates NewsItems (global by design). ✅

### Tab 5: Distribution
- Channels stored per config. PUT/DELETE [id] now verify ownership. ✅

### Tab 6: Style
- Style fields (contentStyle, tone, translateLang, etc.) in `AutopilotConfig`; updated via same PUT config. ✅
- `lib/autopilot.ts` uses config.contentStyle, config.tone, config.translateLang. ✅

---

## Schema Change — Migration Required

After pulling this audit, run:

```bash
npx prisma migrate dev --name feed_source_unique_per_tenant
```

This adds `@@unique([url, siteId])` and removes the global `@unique` on `FeedSource.url`. Existing rows with the same URL for different sites will become valid; duplicate (url, siteId) in existing data would cause migration to fail and must be deduplicated first.
