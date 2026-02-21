# Diurna

AI-powered sports publishing platform. Built by [Lupon Media](https://luponssp.com).

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **UI:** Tailwind CSS + shadcn/ui
- **Editor:** Tiptap
- **Auth:** NextAuth.js v5
- **Database:** PostgreSQL (Neon) + Prisma
- **AI:** Anthropic Claude API
- **Hosting:** Vercel

## Getting Started

```bash
# 1. Clone
git clone https://github.com/lupondev/diurna.git
cd diurna

# 2. Install
npm install

# 3. Environment
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL and NEXTAUTH_SECRET

# 4. Database
npx prisma migrate dev
npx prisma db seed

# 5. Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  (auth)/          → Login, Register (no sidebar)
  (platform)/      → Dashboard, Newsroom, Editor, Team, Settings
  api/             → API routes
components/
  layout/          → Sidebar, Topbar, Footer
  editor/          → Tiptap editor + extensions
  ui/              → shadcn/ui components
lib/
  ai/              → AI provider abstraction + prompt builders
  prisma.ts        → Prisma client + soft delete middleware
  tenant.ts        → Multi-tenant context helpers
  auth-guard.ts    → Authentication + authorization
  rate-limit.ts    → AI rate limiting per plan
  logger.ts        → Structured JSON logging
prisma/
  schema.prisma    → Database schema
  seed.ts          → Dev seed data
middleware.ts      → Tenant slug extraction (Edge-safe)
```

## Cron Jobs (External)

Vercel Hobby plan only supports daily cron jobs. For production use, set up
[cron-job.org](https://cron-job.org) (free tier) as a backup scheduler:

| Endpoint | Method | Interval | Description |
|---|---|---|---|
| `/api/cron/fetch-feeds` | GET | Every 10 min | Fetch RSS feeds + compute DIS scores |
| `/api/cron/cluster-engine` | GET | Every 10 min | Cluster news items + trigger breaking news webhook |
| `/api/cron/autopilot` | GET | Every 15 min | Generate AI articles for top stories |

All endpoints require the header:

```
Authorization: Bearer {CRON_SECRET}
```

Set `CRON_SECRET` in your Vercel environment variables and use the same value in cron-job.org.

## Documentation

See [DIURNA-SPEC-V2-FINAL.md](./DIURNA-SPEC-V2-FINAL.md) for the complete technical specification.
