# DIURNA — Technical Specification v2.0

> **Status:** FINAL — approved for implementation
> **Owner:** Harun, Lupon Media
> **Date:** February 2026
> **Purpose:** Single source of truth for Next.js build. Every architectural decision is here. Dev (human or AI) follows this document — no improvisation.
> **Changelog:** v2.0 — consolidated all reviews: fixed middleware tenant pattern, soft delete scoping, auth guards, localhost dev mode, AI rate limit edge cases.

---

## 1. What Is Diurna

AI-powered sports publishing platform (SaaS). Publishers sign up, connect their site, and get:
- AI-generated match reports, previews, transfer news
- Manual article creation with rich text editor (Tiptap)
- Content calendar with autopilot scheduling
- Embeddable football widgets with built-in ad monetization (Lupon Media SSP)
- Multi-site management from one dashboard

**Business model:** Rev-share on ad revenue generated through Diurna widgets + subscription tiers.

**Parent company:** Lupon Media — SSP with MCM, Pubmatic, Criteo, Magnite partnerships.

---

## 2. Stack Decisions (FINAL)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **Next.js 14 App Router** | RSC, server actions, middleware, layouts |
| UI | **Tailwind CSS + shadcn/ui** | Stripe/Linear quality, zero custom component debt |
| Editor | **Tiptap** (headless, React) | Used by Notion, GitLab — extensible, JSON output |
| Auth | **NextAuth.js v5 (Auth.js)** + Prisma adapter | Free, flexible, built-in session management |
| ORM | **Prisma** | Type-safe, migrations, excellent AI tooling support |
| Database | **PostgreSQL (Neon)** | Serverless, branching, generous free tier |
| Media | **Vercel Blob** or **Cloudflare R2** | Simple upload API, CDN-backed |
| Hosting | **Vercel** | Native Next.js support, preview deploys, edge middleware |
| AI | **Anthropic Claude API** (primary), OpenAI (fallback) | Best for structured content generation |
| Monitoring | **Sentry** (errors) + structured JSON logging | Catch failures before users report them |
| Analytics | **PostgreSQL** for MVP, **ClickHouse** in Phase 2 | No premature infrastructure complexity |

### What We Are NOT Using (and why)

| Rejected | Why |
|----------|-----|
| Strapi | Vendor lock-in, plugin limitations for custom AI/ad-tech/multi-tenant flows. Strapi is great for simple CMS — Diurna is not a simple CMS. |
| Keycloak / Authentik | Overkill for MVP, separate infra to maintain |
| Clerk | Expensive at scale, opaque pricing |
| Cloudflare Pages | Incomplete Next.js App Router support (no full RSC, API routes need Workers) |
| ClickHouse in MVP | Second system, second pipeline — PostgreSQL COUNT(*) is enough for v1 |

---

## 3. Editor Architecture (Tiptap)

### 3.1 Why Tiptap

Tiptap replaces what Strapi's editor would have given us, but better:
- Headless React component — full styling control via Tailwind
- JSON content format (native, no HTML string parsing)
- Extensible with custom blocks (widget embed, ad slot, match stats)
- Used by Notion, GitLab, thousands of SaaS platforms

### 3.2 Extensions

```
Core:       StarterKit (bold, italic, headings, lists, blockquote, code)
Media:      Image, Link, Table, YouTube (embed)
Custom:     WidgetEmbed, AdSlot, MatchStats (Diurna-specific blocks)
UX:         Placeholder, CharacterCount, Typography
```

### 3.3 Two Modes, Same Editor

| Mode | Entry Point | What Happens |
|------|-------------|-------------|
| **Manual** | "New Article" button | Empty Tiptap editor, user writes from scratch |
| **AI-Assisted** | "AI Generate" button | User fills prompt → AI generates content → content pre-fills Tiptap editor → user edits/approves |

Both modes use the SAME editor component, SAME publish flow, SAME status pipeline (DRAFT → IN_REVIEW → PUBLISHED). The only difference is where initial content comes from.

On the Article model: `aiGenerated: Boolean` flag tracks origin.

### 3.4 Content Storage

```typescript
// Article.content stores Tiptap JSON
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Match Report" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Bayern Munich dominated..." }] },
    { "type": "widgetEmbed", "attrs": { "widgetId": "cuid123", "type": "MATCH_WIDGET" } },
    { "type": "adSlot", "attrs": { "position": "mid-article", "size": "728x90" } }
  ]
}
```

### 3.5 Installation

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image
npm install @tiptap/extension-link @tiptap/extension-table @tiptap/extension-placeholder
npm install @tiptap/extension-character-count @tiptap/extension-typography
```

---

## 4. Multi-Tenant Architecture

### 4.1 Model

```
Organization (publisher / media house)
  └── Site (publication — 1 to N per org)
       └── Article
       └── Widget
       └── Category
  └── UserOnOrganization (pivot: user + role per org)
```

### 4.2 Tenant Resolution — CORRECT Pattern

> **CRITICAL:** Prisma does NOT run on Edge runtime. Middleware MUST NOT call Prisma directly. Middleware only extracts the slug and forwards it. Actual org resolution happens server-side.

#### Domain Strategy

| Domain | Purpose | Org Context |
|--------|---------|-------------|
| `www.diurna.app` | Marketing site, landing page | None |
| `app.diurna.app` | Login, register, create org, org switcher | None (pre-org) |
| `{slug}.diurna.app` | **Org dashboard** — all (platform) routes | ✅ Resolved from subdomain |

**Auth flow:** User logs in at `app.diurna.app` → creates/selects org → redirected to `https://{slug}.diurna.app` → all platform routes work with org context.

**Rule:** All `(platform)` routes (Dashboard, Newsroom, Editor, Settings, Team) ONLY work under `{slug}.diurna.app`. Accessing them on `app.diurna.app` redirects to org selector.

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || ''

  let orgSlug: string | null = null

  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
    // DEV MODE: read from env or first path segment
    // e.g. localhost:3000 uses DEFAULT_ORG_SLUG from .env
    // or org1.localhost:3000 pattern
    const parts = host.split('.')
    if (parts.length > 1 && parts[0] !== 'www') {
      orgSlug = parts[0]  // org1.localhost
    } else {
      orgSlug = process.env.DEFAULT_ORG_SLUG || null
    }
  } else {
    // PRODUCTION: read subdomain
    const subdomain = host.split('.')[0]
    if (subdomain !== 'www' && subdomain !== 'app') {
      orgSlug = subdomain
    }
  }

  // Forward slug via REQUEST headers (not response!)
  const requestHeaders = new Headers(req.headers)
  if (orgSlug) {
    requestHeaders.set('x-org-slug', orgSlug)
  }
  // Delete any client-spoofed header
  requestHeaders.delete('x-org-id')

  return NextResponse.next({
    request: { headers: requestHeaders }
  })
}

export const config = {
  matcher: ['/((?!_next|api/auth|api/public|embed|favicon.ico|static).*)']
}
```

> **Public / embed routes** (e.g. `/api/public/widgets/[id]`, `/embed/widget/[id]`) do NOT use tenant from subdomain. They resolve organization from the resource itself (widgetId → site → org). These routes are explicitly excluded from middleware matcher.
```

### 4.3 Tenant Context Helper (Server-Side)

```typescript
// lib/tenant.ts
import { headers } from 'next/headers'
import { prisma } from './prisma'
import { cache } from 'react'

// In-memory cache for org resolution (per-request deduplication via React cache)
export const getOrg = cache(async () => {
  const slug = headers().get('x-org-slug')
  if (!slug) throw new Error('No organization context — missing x-org-slug header')

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true, slug: true, plan: true, name: true }
  })

  if (!org) throw new Error(`Organization not found: ${slug}`)
  return org
})

// Convenience shortcut
export async function getOrgId(): Promise<string> {
  const org = await getOrg()
  return org.id
}
```

**Why this works:**
- Middleware runs on Edge → no Prisma, just string parsing
- `getOrg()` runs in Node.js server components/API routes → Prisma works fine
- React `cache()` deduplicates within a single request → one DB call per request max
- Client can't spoof `x-org-id` because middleware deletes it and only sets `x-org-slug`

### 4.4 Scoped Database Helpers

**Rule:** No one writes "naked" Prisma queries. All tenant-scoped queries go through helpers.

```typescript
// lib/db.ts
import { ArticleStatus } from '@prisma/client'
import { getOrgId } from './tenant'
import { prisma } from './prisma'

// Example: get articles for current org
export async function getArticles(filters?: { status?: ArticleStatus; siteId?: string }) {
  const orgId = await getOrgId()
  return prisma.article.findMany({
    where: {
      site: { organizationId: orgId },
      ...(filters?.status && { status: filters.status }),
      ...(filters?.siteId && { siteId: filters.siteId }),
    },
    orderBy: { updatedAt: 'desc' }
  })
}

// Example: get sites for current org
export async function getSites() {
  const orgId = await getOrgId()
  return prisma.site.findMany({
    where: { organizationId: orgId }
  })
}
```

**Code review rule:** Any PR with raw `prisma.article.findMany()` (without org filter) is auto-rejected.

---

## 5. Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ══════════════════════════════════
// MULTI-TENANT CORE
// ══════════════════════════════════

model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique  // subdomain: {slug}.diurna.app
  logo      String?
  plan      Plan     @default(FREE)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?           // soft delete

  sites     Site[]
  users     UserOnOrganization[]
  auditLogs AuditLog[]
}

model Site {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  name           String
  slug           String       // e.g. "sportnews-ba"
  domain         String?      // custom domain if any
  language       String       @default("bs")
  timezone       String       @default("Europe/Sarajevo")
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  deletedAt      DateTime?    // soft delete

  articles   Article[]
  widgets    Widget[]
  categories Category[]

  @@unique([organizationId, slug])
}

// ══════════════════════════════════
// AUTH & USERS
// ══════════════════════════════════

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  emailVerified DateTime?
  createdAt     DateTime  @default(now())

  accounts Account[]
  sessions Session[]
  orgs     UserOnOrganization[]
}

model UserOnOrganization {
  id             String       @id @default(cuid())
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  role           OrgRole      @default(JOURNALIST)
  permissions    String[]     // granular flags: ["ai_generate", "ai_publish", "manage_widgets"]
  joinedAt       DateTime     @default(now())
  deletedAt      DateTime?    // soft delete

  @@unique([userId, organizationId])
}

// NextAuth required models (NO soft delete — hard delete OK)
model Account {
  id                String  @id @default(cuid())
  userId            String
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expires      DateTime
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ══════════════════════════════════
// CONTENT
// ══════════════════════════════════

model Article {
  id        String        @id @default(cuid())
  siteId    String
  site      Site          @relation(fields: [siteId], references: [id], onDelete: Cascade)
  title     String
  slug      String
  content   Json          // Tiptap JSON format
  excerpt   String?
  status    ArticleStatus @default(DRAFT)
  authorId  String?       // nullable for AI-only articles

  // AI metadata
  aiGenerated  Boolean  @default(false)
  aiModel      String?  // "claude-sonnet-4-5-20250929", "gpt-4o", etc.
  aiPrompt     String?  // original prompt used
  aiRevisions  AIRevision[]

  // Publishing
  publishedAt  DateTime?
  scheduledAt  DateTime?

  // SEO
  metaTitle       String?
  metaDescription String?

  // Relations
  categoryId String?
  category   Category? @relation(fields: [categoryId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?           // soft delete

  @@unique([siteId, slug])
  @@index([siteId, status])
  @@index([siteId, publishedAt])
}

// NO soft delete — revisions are immutable history
model AIRevision {
  id        String  @id @default(cuid())
  articleId String
  article   Article @relation(fields: [articleId], references: [id], onDelete: Cascade)
  version   Int
  content   Json
  prompt    String
  model     String
  tokensIn  Int?
  tokensOut Int?
  createdAt DateTime @default(now())
}

model Category {
  id        String    @id @default(cuid())
  siteId    String
  site      Site      @relation(fields: [siteId], references: [id], onDelete: Cascade)
  name      String
  slug      String
  icon      String?
  order     Int       @default(0)
  deletedAt DateTime? // soft delete

  articles Article[]

  @@unique([siteId, slug])
}

model Widget {
  id        String     @id @default(cuid())
  siteId    String
  site      Site       @relation(fields: [siteId], references: [id], onDelete: Cascade)
  name      String
  type      WidgetType
  config    Json       // template, theme, ad slots, etc.
  active    Boolean    @default(true)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  deletedAt DateTime?  // soft delete
}

// ══════════════════════════════════
// AUDIT LOG (NO soft delete — immutable)
// ══════════════════════════════════

model AuditLog {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  userId         String?      // null for system/AI actions
  action         String       // "AI_GENERATED", "AI_FAILED", "ARTICLE_PUBLISHED", etc.
  entityType     String       // "ARTICLE", "SITE", "WIDGET", "USER"
  entityId       String?
  meta           Json?        // any extra context
  createdAt      DateTime     @default(now())

  @@index([organizationId, createdAt])
  @@index([entityType, entityId])
}

// ══════════════════════════════════
// ENUMS
// ══════════════════════════════════

enum Plan {
  FREE
  STARTER
  PRO
  ENTERPRISE
}

enum OrgRole {
  OWNER
  ADMIN
  EDITOR
  JOURNALIST
}
// Note: AI permissions are granular flags on UserOnOrganization.permissions[]
// not a separate role. Any role can have ai_generate, ai_publish, etc.

enum ArticleStatus {
  DRAFT
  IN_REVIEW
  SCHEDULED
  PUBLISHED
  ARCHIVED
}

enum WidgetType {
  MATCH_WIDGET
  STANDINGS
  POLL
  QUIZ
  LIVE_SCORE
  STATS_TABLE
}
```

---

## 6. Soft Delete Convention

### 6.1 Which Models

| Model | Soft Delete | Reason |
|-------|------------|--------|
| Organization | ✅ Yes | Accidental deletion = catastrophic |
| Site | ✅ Yes | Publisher might want to restore |
| Article | ✅ Yes | Newsroom accidents happen |
| Category | ✅ Yes | Might have linked articles |
| Widget | ✅ Yes | Live on publisher sites |
| UserOnOrganization | ✅ Yes | Re-invite scenario |
| Account | ❌ No | NextAuth manages lifecycle |
| Session | ❌ No | Ephemeral by design |
| VerificationToken | ❌ No | Ephemeral by design |
| AIRevision | ❌ No | Immutable history |
| AuditLog | ❌ No | Immutable history |

### 6.2 Prisma Middleware (Scoped!)

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const SOFT_DELETE_MODELS = new Set([
  'Organization', 'Site', 'Article', 'Category', 'Widget', 'UserOnOrganization'
])

const prismaClientSingleton = () => {
  const client = new PrismaClient()

  client.$use(async (params, next) => {
    // Only apply to models WITH deletedAt
    if (!SOFT_DELETE_MODELS.has(params.model ?? '')) {
      return next(params)
    }

    // Intercept delete → soft delete
    if (params.action === 'delete') {
      params.action = 'update'
      params.args.data = { deletedAt: new Date() }
    }
    if (params.action === 'deleteMany') {
      params.action = 'updateMany'
      params.args.data = { ...(params.args.data || {}), deletedAt: new Date() }
    }

    // Intercept reads → exclude soft deleted
    // NOTE: findUnique is NOT filtered — it only accepts unique fields.
    // Use findFirst with unique fields + deletedAt:null when you need soft-delete awareness.
    if (params.action === 'findMany' || params.action === 'findFirst') {
      if (!params.args) params.args = {}
      if (!params.args.where) params.args.where = {}
      // Only add filter if not explicitly querying deleted items
      if (params.args.where.deletedAt === undefined) {
        params.args.where.deletedAt = null
      }
    }

    // Intercept count → exclude soft deleted
    if (params.action === 'count') {
      if (!params.args) params.args = {}
      if (!params.args.where) params.args.where = {}
      if (params.args.where.deletedAt === undefined) {
        params.args.where.deletedAt = null
      }
    }

    return next(params)
  })

  return client
}

// Singleton for Next.js hot reload
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// To query deleted items explicitly:
// prisma.article.findMany({ where: { deletedAt: { not: null } } })
```

**Soft delete caveats:**
- `findUnique` is NOT auto-filtered (Prisma requires only unique fields in `where`). When you need soft-delete-aware unique lookups, use `findFirst` with the unique fields + `deletedAt: null`.
- `update`/`updateMany` are NOT auto-filtered. Always add `deletedAt: null` to `where` clause on soft-deleted models to avoid accidentally updating deleted records.

---

## 7. Authentication — NextAuth Config

### 7.1 Cross-Subdomain Session (CRITICAL)

> **Problem:** Login happens on `app.diurna.app`. Dashboard lives on `{slug}.diurna.app`. By default, NextAuth session cookie is scoped to the login subdomain only — user appears "logged out" on the org dashboard.
>
> **Solution:** Set cookie domain to `.diurna.app` (with leading dot) so the session cookie is shared across ALL subdomains.

```typescript
// lib/auth.ts
import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import type { NextAuthConfig } from 'next-auth'

export const authOptions: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Credentials, Google, GitHub — configure as needed
  ],
  session: {
    strategy: 'jwt',  // JWT for cross-subdomain (DB sessions don't work well across subdomains)
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        // CRITICAL: cookie visible on ALL subdomains (app, demo, sport-ba, etc.)
        domain: process.env.COOKIE_DOMAIN || undefined,  // undefined = current host in dev
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  pages: {
    signIn: '/login',
    newUser: '/register',
  },
  callbacks: {
    async session({ session, token }) {
      if (token?.sub) session.user.id = token.sub
      return session
    },
    async jwt({ token, user }) {
      if (user) token.sub = user.id
      return token
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)
```

**Why JWT, not database sessions:** Database sessions require the session token to resolve via Prisma on every request. With cross-subdomain cookies, JWT is simpler — the token is self-contained, no DB lookup needed for basic session validation.

### 7.2 Auth Flow (Full Picture)

```
1. User visits app.diurna.app/login
2. Authenticates (credentials / OAuth)
3. NextAuth sets session cookie on .diurna.app (all subdomains)
4. User creates org (slug: "demo") or selects existing
5. Redirect to https://demo.diurna.app
6. Middleware reads subdomain → sets x-org-slug: "demo"
7. getOrg() resolves slug → orgId via Prisma
8. requireAuth() reads session cookie (works because .diurna.app domain)
9. requireAuth() verifies user membership in org
10. ✅ User is authenticated + authorized on org dashboard
```

---

## 8. API Security — Auth Guard Pattern

### 7.1 Rule

> **ALL API routes MUST:**
> 1. Require authenticated user (NextAuth session)
> 2. Verify user membership in the current Organization
> 3. Respect `UserOnOrganization.permissions` for privileged actions (AI, widgets, settings)
>
> NO EXCEPTIONS. Not even for "read-only" routes.

### 7.2 Auth Helper

```typescript
// lib/auth-guard.ts
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { getOrgId } from './tenant'
import { prisma } from './prisma'
import { NextResponse } from 'next/server'

export type AuthContext = {
  userId: string
  orgId: string
  role: string
  permissions: string[]
}

export async function requireAuth(requiredPermission?: string): Promise<AuthContext | NextResponse> {
  // 1. Check session
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Check org membership
  const orgId = await getOrgId()
  const membership = await prisma.userOnOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId: orgId
      }
    }
  })

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 })
  }

  // 3. Check specific permission (if required)
  if (requiredPermission && !membership.permissions.includes(requiredPermission)) {
    // OWNER and ADMIN bypass permission checks
    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      return NextResponse.json({ error: `Missing permission: ${requiredPermission}` }, { status: 403 })
    }
  }

  return {
    userId: session.user.id,
    orgId,
    role: membership.role,
    permissions: membership.permissions
  }
}
```

### 7.3 Usage in API Routes

```typescript
// app/api/ai/generate/route.ts
export async function POST(req: NextRequest) {
  const auth = await requireAuth('ai_generate')
  if (auth instanceof NextResponse) return auth // error response

  const { userId, orgId } = auth
  // ... safe to proceed
}
```

---

## 9. Folder Structure

```
diurna/
├── app/
│   ├── layout.tsx                      # Root layout (fonts, providers)
│   ├── (auth)/
│   │   ├── layout.tsx                  # Minimal auth layout (no sidebar)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (platform)/
│   │   ├── layout.tsx                  # AppShell: sidebar + topbar + footer
│   │   ├── page.tsx                    # Dashboard
│   │   ├── newsroom/
│   │   │   └── page.tsx
│   │   ├── editor/
│   │   │   ├── page.tsx                # New article (empty Tiptap)
│   │   │   └── [id]/page.tsx           # Edit existing (load content into Tiptap)
│   │   ├── team/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── articles/
│       │   ├── route.ts                # GET (list), POST (create)
│       │   └── [id]/route.ts           # GET, PATCH, DELETE
│       ├── ai/
│       │   ├── generate/route.ts       # POST: prompt → article
│       │   └── revise/route.ts         # POST: article + instruction → revision
│       └── widgets/
│           └── route.ts
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx                 # Single source of truth for navigation
│   │   ├── topbar.tsx
│   │   └── platform-footer.tsx
│   ├── editor/
│   │   ├── tiptap-editor.tsx           # Main editor component
│   │   ├── ai-prompt-panel.tsx         # AI generation UI
│   │   ├── editor-toolbar.tsx          # Formatting toolbar
│   │   ├── publish-panel.tsx
│   │   └── extensions/                 # Custom Tiptap extensions
│   │       ├── widget-embed.ts
│   │       ├── ad-slot.ts
│   │       └── match-stats.ts
│   ├── dashboard/
│   │   ├── stat-card.tsx
│   │   ├── recent-articles.tsx
│   │   └── quick-actions.tsx
│   ├── newsroom/
│   │   ├── article-list.tsx
│   │   ├── article-row.tsx
│   │   ├── filters.tsx
│   │   └── bulk-actions.tsx
│   └── ui/                             # shadcn/ui components (auto-generated)
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── select.tsx
│       ├── table.tsx
│       └── ...
├── lib/
│   ├── prisma.ts                       # Prisma client + soft delete middleware
│   ├── auth.ts                         # NextAuth config
│   ├── auth-guard.ts                   # requireAuth() helper
│   ├── tenant.ts                       # getOrg() / getOrgId() helpers
│   ├── db.ts                           # Org-scoped query helpers
│   ├── rate-limit.ts                   # AI rate limiter
│   ├── logger.ts                       # Structured JSON logging
│   ├── ai/
│   │   ├── client.ts                   # AI provider abstraction
│   │   ├── prompts/
│   │   │   ├── match-report.ts         # typed input → system + user prompt
│   │   │   ├── transfer-news.ts
│   │   │   ├── match-preview.ts
│   │   │   └── analysis.ts
│   │   └── types.ts                    # Shared AI input/output types
│   ├── validators/                     # Zod schemas for API validation
│   │   ├── article.ts
│   │   └── widget.ts
│   └── utils.ts
├── prisma/
│   └── schema.prisma
├── middleware.ts                        # Tenant slug extraction (Edge-safe, NO Prisma)
├── sentry.client.config.ts
├── sentry.server.config.ts
├── .env.local
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## 10. AI Module Architecture

### 9.1 Provider Abstraction

```typescript
// lib/ai/client.ts
import Anthropic from '@anthropic-ai/sdk'

export async function generateContent(input: {
  system: string
  prompt: string
  maxTokens?: number
}): Promise<{ text: string; model: string; tokensIn: number; tokensOut: number }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: input.maxTokens || 4096,
    system: input.system,
    messages: [{ role: 'user', content: input.prompt }]
  })

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('')

  return {
    text,
    model: response.model,
    tokensIn: response.usage.input_tokens,
    tokensOut: response.usage.output_tokens
  }
}
```

### 9.2 Typed Prompts

```typescript
// lib/ai/prompts/match-report.ts
import { z } from 'zod'

export const MatchReportInput = z.object({
  homeTeam: z.string(),
  awayTeam: z.string(),
  score: z.string(),
  league: z.string(),
  keyEvents: z.array(z.string()).optional(),
  tone: z.enum(['professional', 'casual', 'tabloid', 'analytical']).default('professional'),
  language: z.string().default('bs'),
  wordCount: z.number().default(600)
})

export type MatchReportInput = z.infer<typeof MatchReportInput>

export function buildMatchReportPrompt(input: MatchReportInput): { system: string; prompt: string } {
  return {
    system: `You are a professional sports journalist writing for a ${input.language} audience.
Write in a ${input.tone} tone. Target ${input.wordCount} words.
Return JSON: { "title": "...", "excerpt": "...", "content": "...", "tags": [...] }`,
    prompt: `Write a match report: ${input.homeTeam} vs ${input.awayTeam}, final score ${input.score}.
League: ${input.league}.
${input.keyEvents?.length ? `Key events: ${input.keyEvents.join(', ')}` : ''}`
  }
}
```

### 9.3 API Route (with all guards)

```typescript
// app/api/ai/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { checkAIRateLimit } from '@/lib/rate-limit'
import { generateContent } from '@/lib/ai/client'
import { buildMatchReportPrompt, MatchReportInput } from '@/lib/ai/prompts/match-report'
import { prisma } from '@/lib/prisma'
import { log } from '@/lib/logger'

export async function POST(req: NextRequest) {
  // 1. Auth + permissions
  const auth = await requireAuth('ai_generate')
  if (auth instanceof NextResponse) return auth
  const { userId, orgId } = auth

  // 2. Rate limit
  const { allowed, remaining } = await checkAIRateLimit(orgId)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Daily AI limit reached', remaining: 0 },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
    )
  }

  // 3. Validate input
  const body = await req.json()
  const { type, ...params } = body

  let prompt: { system: string; prompt: string }
  switch (type) {
    case 'match-report':
      prompt = buildMatchReportPrompt(MatchReportInput.parse(params))
      break
    default:
      return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  }

  // 4. Generate
  try {
    const result = await generateContent(prompt)

    // 5. Audit log (SUCCESS)
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'AI_GENERATED',
        entityType: 'ARTICLE',
        meta: { type, model: result.model, tokensIn: result.tokensIn, tokensOut: result.tokensOut }
      }
    })

    log('info', 'AI article generated', { orgId, userId, type, model: result.model })

    return NextResponse.json({
      ...result,
      remaining: remaining - 1
    })
  } catch (error: any) {
    // Audit log (FAILURE — does NOT count toward rate limit)
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'AI_FAILED',
        entityType: 'ARTICLE',
        meta: { type, error: error.message }
      }
    })

    log('error', 'AI generation failed', { orgId, userId, type, error: error.message })

    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  }
}
```

---

## 11. AI Rate Limiting

### 10.1 Plan Limits

| Plan | Max Sites | Max Users | Max AI/day | Max Widgets |
|------|-----------|-----------|------------|-------------|
| FREE | 1 | 3 | 20 | 3 |
| STARTER | 3 | 10 | 200 | 10 |
| PRO | 10 | 50 | 1,000 | 50 |
| ENTERPRISE | Unlimited | Unlimited | Custom | Unlimited |

**All limits enforced server-side.** Frontend shows remaining quota but NEVER decides access.

### 10.2 Rate Limiter

```typescript
// lib/rate-limit.ts
import { Plan } from '@prisma/client'
import { prisma } from './prisma'

const AI_LIMITS: Record<Plan, number> = {
  FREE: 20,
  STARTER: 200,
  PRO: 1000,
  ENTERPRISE: 999999
}

export async function checkAIRateLimit(orgId: string): Promise<{
  allowed: boolean
  remaining: number
  limit: number
}> {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: { plan: true }
  })

  const limit = AI_LIMITS[org.plan]
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Count ONLY successful generations (AI_FAILED does not count)
  const used = await prisma.auditLog.count({
    where: {
      organizationId: orgId,
      action: 'AI_GENERATED',
      createdAt: { gte: today }
    }
  })

  return {
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
    limit
  }
}
```

**Rule:** `AI_GENERATED` = successful generation (counts toward limit). `AI_FAILED` = failed attempt (logged but NOT counted).

---

## 12. Observability

### 11.1 Error Monitoring: Sentry

```bash
npx @sentry/wizard@latest -i nextjs
```

- Captures unhandled errors, API route failures, client-side crashes
- Source maps uploaded on Vercel deploy
- Environment tags: `production`, `preview`, `development`

### 11.2 Structured Logging

```typescript
// lib/logger.ts
type LogLevel = 'info' | 'warn' | 'error'

export function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  }
  if (level === 'error') console.error(JSON.stringify(entry))
  else console.log(JSON.stringify(entry))
}
```

**Rule:** No bare `console.log('something')`. Always structured, always with context (orgId, userId, action).

---

## 13. Testing

| Layer | Tool | What to test |
|-------|------|-------------|
| Unit | **Vitest** | AI prompt builders, Zod validators, rate limit logic, tenant helpers |
| Integration | **Vitest + Prisma** | API routes with test database (Neon branch) |
| E2E | **Playwright** | 3 critical flows (see below) |
| Types | **TypeScript strict** | `"strict": true` in tsconfig — no exceptions |

### MVP E2E Flows (Playwright)

1. **Auth flow:** Register → create organization → land on dashboard
2. **Content flow:** Newsroom → create article → AI generate → edit → publish
3. **Settings flow:** Change site name → change language → save → verify

---

## 14. UI Rules

### 13.1 Component Discipline

- **Use ONLY shadcn/ui components.** If a component doesn't exist in shadcn, build it with basic Tailwind. Never import random npm UI packages.
- **Editor: Tiptap only.** No Quill, no Slate, no Draft.js.
- **No inline styles.** Everything is Tailwind classes.

### 13.2 Design Tokens (from HTML demo)

```typescript
// tailwind.config.ts (extend)
colors: {
  mint:     { DEFAULT: '#00D4AA', light: '#E6FBF6', dark: '#00A888' },
  coral:    { DEFAULT: '#FF6B6B', light: '#FFF0F0' },
  electric: { DEFAULT: '#5B5FFF', light: '#F0F0FF' },
  gold:     { DEFAULT: '#FFB800', light: '#FFF9E6' },
  success:  { DEFAULT: '#10B981', light: '#ECFDF5' },
  warning:  { DEFAULT: '#F59E0B', light: '#FFFBEB' },
  error:    { DEFAULT: '#EF4444', light: '#FEF2F2' },
}
fontFamily: {
  sans:    ['Plus Jakarta Sans', ...defaultTheme.fontFamily.sans],
  display: ['Instrument Serif', 'Georgia', 'serif'],
  mono:    ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
}
```

### 13.3 Sidebar (single source of truth)

| # | Label | Icon | Route | Phase |
|---|-------|------|-------|-------|
| 1 | Dashboard | 📊 | `/` | MVP |
| 2 | Newsroom | 📰 | `/newsroom` | MVP |
| 3 | AI Co-Pilot | 🤖 | `/editor` | MVP |
| 4 | Widgets | 🧩 | `/widgets` | Phase 2 |
| 5 | Widget Creator | 🛠️ | `/widgets/create` | Phase 2 |
| 6 | Calendar | 📅 | `/calendar` | Phase 2 |
| 7 | Analytics | 📈 | `/analytics` | Phase 2 |
| 8 | Midnight Pro | 🌙 | `/templates/midnight` | Phase 3 |
| 9 | Clean Editorial | ☀️ | `/templates/editorial` | Phase 3 |
| 10 | Team | 👥 | `/team` | MVP |
| 11 | Settings | ⚙️ | `/settings` | MVP |

Phase 2/3 routes render "Coming Soon" placeholder until implemented.

---

## 15. Implementation Phases

### Phase 1 — MVP (Weeks 1-3)

**Goal:** A publisher can log in, generate an AI article OR write manually, edit it, and publish it.

| Week | Deliverable |
|------|------------|
| 1 | Skeleton: Next.js + Prisma + NextAuth + Tiptap + Vercel deploy. Shell layout (sidebar, topbar, footer). Login/register. Multi-tenant middleware. |
| 2 | Newsroom (CRUD, filters, statuses) + Editor (Tiptap + AI prompt panel + manual mode). |
| 3 | Settings (basic: site name, logo, language, categories). Dashboard (4 stat cards + recent articles). Team (invite + roles). |

**MVP definition of done:**
- User creates account → creates organization → gets subdomain
- User creates article (manual via Tiptap OR AI-generated)
- Article goes through DRAFT → IN_REVIEW → PUBLISHED flow
- Settings page allows basic site configuration
- Audit log tracks all actions
- Rate limiting enforced on AI endpoints
- Sentry capturing errors

### Phase 2 — Monetization & Content (Weeks 4-6)

| Feature | What |
|---------|------|
| Widgets | Library + Creator + embed code with Lupon SSP ad slots |
| Calendar | Weekly/monthly view, AI autopilot scheduling |
| Analytics | PostgreSQL-based: page views, articles by status, revenue placeholder |
| ClickHouse | Connect for real SSP/ad revenue data |

### Phase 3 — Polish & Scale (Weeks 7-8)

| Feature | What |
|---------|------|
| Templates | Midnight Pro + Clean Editorial frontend themes |
| Onboarding | 7-step first-run wizard |
| Social Distribution | Auto-post to Twitter/Facebook/Telegram |
| Advanced AI | Multi-language, custom tone presets, hallucination guardrails |

---

## 16. Environment Variables

```bash
# .env.local

# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_URL="https://app.diurna.app"
NEXTAUTH_SECRET="..."
COOKIE_DOMAIN=".diurna.app"  # leading dot = all subdomains

# AI
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."  # fallback

# Lupon Media (Phase 2)
LUPON_SSP_ENDPOINT="..."
LUPON_SSP_API_KEY="..."

# Monitoring
SENTRY_DSN="..."
NEXT_PUBLIC_SENTRY_DSN="..."

# Dev mode (REQUIRED for localhost — app will crash without this)
DEFAULT_ORG_SLUG="demo"
```

### 15.1 Dev Seed Script (REQUIRED)

`prisma db seed` must create a working dev environment in one command:

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // 1. Create demo org
  const org = await prisma.organization.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Publisher',
      slug: 'demo',
      plan: 'PRO'
    }
  })

  // 2. Create default site
  const site = await prisma.site.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: 'main' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Demo Sports News',
      slug: 'main',
      language: 'bs'
    }
  })

  // 3. Create dev user + ownership
  const user = await prisma.user.upsert({
    where: { email: 'dev@diurna.app' },
    update: {},
    create: {
      email: 'dev@diurna.app',
      name: 'Dev User'
    }
  })

  await prisma.userOnOrganization.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: {},
    create: {
      userId: user.id,
      organizationId: org.id,
      role: 'OWNER',
      permissions: ['ai_generate', 'ai_publish', 'manage_widgets', 'manage_team', 'manage_settings']
    }
  })

  // 4. Create default categories
  const categories = ['Trending', 'Matches', 'Analysis', 'Transfers', 'Leagues', 'Breaking']
  for (let i = 0; i < categories.length; i++) {
    await prisma.category.upsert({
      where: { siteId_slug: { siteId: site.id, slug: categories[i].toLowerCase() } },
      update: {},
      create: {
        siteId: site.id,
        name: categories[i],
        slug: categories[i].toLowerCase(),
        order: i
      }
    })
  }

  console.log('✅ Seed complete: org=demo, site=main, user=dev@diurna.app')
}

main().catch(console.error).finally(() => prisma.$disconnect())
```

**Dev onboarding:** Clone repo → `npm install` → `prisma migrate dev` → `prisma db seed` → `npm run dev` → everything works.
```

---

## 17. Rules for AI Dev Tools

These rules apply whether building with Cursor, Claude, or any other AI tool:

1. **Follow this SPEC exactly.** Do not add packages, services, or abstractions not listed here.
2. **shadcn/ui only.** No Material UI, Chakra, Ant Design, or random component libraries.
3. **Tiptap for editor.** No Quill, Slate, Draft.js, or CKEditor.
4. **Every DB query must filter by organizationId.** Use helpers from `lib/db.ts`. No raw Prisma queries without org scope.
5. **Typed everything.** Zod for API validation. TypeScript strict mode. No `any`.
6. **Server Components by default.** Client Components only when interactivity requires it (`"use client"`).
7. **No barrel exports.** Import directly from component files.
8. **Prisma migrations.** Never modify the database manually. Always `prisma migrate dev`.
9. **Audit log every mutation.** Create, update, delete, AI generate — all logged. AI_GENERATED for success, AI_FAILED for failures.
10. **HTML demo is visual spec only.** Use it for layout/flow reference. JS code is NOT reusable.
11. **One component per file.** No 500-line mega-components.
12. **All API routes use `requireAuth()`.** No unprotected endpoints. Period.
13. **No Prisma in middleware.ts.** Middleware runs on Edge — use slug forwarding only.

---

## 18. Handoff Notes

### What exists today
- 13-page HTML demo (v9) — use as visual reference for layouts, flows, copy
- Lupon Media SSP infrastructure — ClickHouse, Cloudflare Workers, Golang services
- Domain considerations: TBD (diurna.app or subdomain of luponssp.com)

### What the HTML demo JS is NOT
- Not reusable code (all DOM-driven, inline onclick, global event pattern)
- Not a component library (no props, no state management)
- It IS an excellent spec for what each page should look like and how flows work

### Decision log
| Decision | Chose | Rejected | Why |
|----------|-------|----------|-----|
| CMS | Custom (Prisma + Tiptap) | Strapi | Full control, no plugin limitations, Tiptap > Strapi editor |
| Editor | Tiptap | Quill, Slate, CKEditor | Headless, extensible, JSON output, huge ecosystem |
| Auth | NextAuth v5 | Keycloak, Clerk | Free, simple, Prisma adapter |
| DB | PostgreSQL (Neon) | Supabase, PlanetScale | Serverless PG, branching, no vendor API lock-in |
| Hosting | Vercel | Cloudflare Pages | Native Next.js support, zero config |
| AI analytics in MVP | PostgreSQL | ClickHouse | Avoid second system in v1 |
| AI permissions | Granular flags on role | Separate AI_ONLY role | Any role can have AI access — more flexible |
| Multi-tenant | Day 1 | "Add later" | Retrofit is a nightmare |
| Soft delete | Scoped to 6 models | Global on all models | Account/Session/AuditLog don't need it |
| Tenant in middleware | Slug forwarding only | Prisma lookup in Edge | Prisma doesn't run on Edge runtime |

---

*This document is the constitution. When in doubt, refer here. When something isn't covered, ask before building.*
