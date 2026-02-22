# Lupon/Diurna — Claude Spec (READ BEFORE ANY CHANGE)

## Projects
- Diurna: AI sports publishing SaaS (Next.js, Prisma, Vercel Hobby)
- Lupon Cloud: Ad tech diagnostics platform
- Lupon Command: Central ops hub [PLANNED — build after Diurna 100%]

## Rules (always apply)
- Read this file before making any change
- ALL UI strings must be in English only
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
- Vercel webhook is broken — every push requires manual deploy

## Architecture (do not change without asking)
- Framework: Next.js 14 App Router
- Database: Prisma + PostgreSQL (Neon)
- Auth: NextAuth
- Styling: Tailwind + shadcn/ui
- Deployment: Vercel Hobby
- Crons: cron-job.org (not Vercel — Hobby plan limitation)
- ML: AutoGluon on AWS Lambda

## Newsroom Rules
- Time filters 1H/6H/12H/24H/ALL must all return results
- Use latestItem datetime field for cluster time filtering
- Site switcher: deduplicate by name, prefer site with domain
- Default active site: always the one with domain set

## Settings Page (always English)
Tabs: General | API Keys | Team | Invites | Logs | Sync | System Health

## Before Every Commit
Run: grep -r "Napiši\|Opšte\|Napisano\|Učitavanje\|Postavke\|Čeka\|Sve priče" app/ components/
If any results — fix them before committing.

## Decisions
- Never ask questions — make a decision and proceed
- If multiple approaches exist — pick the simpler one
- If something is broken — fix it before moving on
- If a file doesn't exist — create it
- If unsure about data shape — fetch the relevant API endpoint to check live data first

## Commit Format
- fix: bug fixes
- feat: new features
- chore: maintenance/cleanup
