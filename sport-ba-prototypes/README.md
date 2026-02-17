# Sport.ba — HTML Prototypes → Next.js Implementation Guide

## 📦 Files

| File | Page | Lines | Size | Description |
|------|------|-------|------|-------------|
| `homepage.html` | `/` | ~1100 | 50KB | Full homepage — 12 blocks, live strip, hero bento, match of day, standings, news feed, transfers radar, ad slots |
| `article.html` | `/vijesti/[slug]` | ~1700 | 70KB | Article page — progress bar, TTS, font resize, reactions, share, scroll depth, context box, timeline, CLS-safe ads |
| `match-center.html` | `/utakmica/[id]` | ~530 | 41KB | Match Center — 5 tabs: Summary (events + momentum), Stats (9 bars), Lineups (pitch view), Table, H2H |
| `static-pages.html` | `/o-nama`, `/impressum`, `/privatnost`, `/uslovi`, `/kontakt`, `/marketing` | ~360 | 24KB | All static pages — tabbed navigation, contact form, team grid, ad formats, legal text |

## 🎨 Design System

### Typography
```
--serif: 'DM Serif Display'     → Headlines, article body, trending ranks
--sans:  'IBM Plex Sans' 400/600 → UI text, navigation, meta
--mono:  'IBM Plex Mono' 600     → Data labels, categories, scores, timestamps
```

Google Fonts URL (optimized — 4 weight files):
```
https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Mono:wght@600&display=swap
```

### Colors — Dark Theme (default)
```
--bg-0: #08090c    (page background)
--bg-1: #0e1015    (cards)
--bg-2: #14161d    (inset/input backgrounds)
--bg-3: #1a1d27    (hover states)
--bg-4: #222633    (elevated surfaces)

--text-0: #f2f3f7  (headings)
--text-1: #c8cbd8  (body text)
--text-2: #8b8fa3  (secondary/meta)
--text-3: #5c6078  (decorative/disabled)

--accent: #ff5722  (orange — primary action, links, highlights)
--accent-hover: #ff7043
--accent-soft: rgba(255,87,34,0.1)

--live: #00e676    (green — live indicators, success)
--live-dim: rgba(0,230,118,0.1)

--blue: #3b82f6    (stats home team, info boxes)
--green: #22c55e   (wins, positive)
--yellow: #f59e0b  (draws, warnings)
--red: #ef4444     (losses, away team, errors)

--border: #262a38
--border-subtle: #1e2130
```

### Colors — Light Theme
```
--bg-0: #faf9f7    --text-0: #1a1a18
--bg-1: #ffffff    --text-1: #3d3d38
--bg-2: #f2f1ed    --text-2: #6b6b63
--bg-3: #eceae6    --text-3: #9c9c92
```

### Spacing & Radii
```
--radius: 8px      (cards, containers)
--radius-sm: 5px   (buttons, pills, inputs)
--header-h: 48px   (sticky header height)
--ease: 0.2s cubic-bezier(0.4, 0, 0.2, 1)
```

## 🏗 Next.js Component Map

### Shared Components (use on every page)
```
components/
  Header.tsx            → 48px sticky topbar, logo, nav, search, live dot, theme toggle
  ThemeProvider.tsx      → dark/light with localStorage('sportba-theme')
  Footer.tsx            → 4-col grid (brand, categories, leagues, other)
  LiveStrip.tsx         → Horizontal scroll match pills with live/FT/upcoming states
  AdSlot.tsx            → CLS-safe ad container with reserved height + "Oglas" label
  Newsletter.tsx        → Dark gradient card, email input, submit
```

### Homepage (`/`)
```
pages/index.tsx
  Block0_Header         → (shared)
  SlotA_Leaderboard     → 728x90 / 320x50
  Block1_LiveStrip      → (shared)
  Block2_HeroBento      → 1 main card + 3 side cards
  Block3_MatchOfDay     → Scoreboard + tabs (Stats/Lineups/Table impact)
  Block4_Standings      → Frozen header + frozen team col, top 8
  SlotC_Rectangle       → 300x250
  Block5_NewsFeed       → 4:1 ratio (4 news : 1 native ad)
  SlotB_NativeAd        → "SPONZORISANO" labeled
  Block6_TransferRadar  → Status badges (hot/confirmed/rumour)
  Block7_ForYou         → Team chips, localStorage personalization
  SlotD_RightRail       → 300x600 desktop sticky
  SlotE_PreFooter       → Lowest priority
```

### Article (`/vijesti/[slug]`)
```
pages/vijesti/[slug].tsx
  ProgressBar.tsx       → Fixed top, width based on scroll position
  Breadcrumb.tsx        → Schema.org BreadcrumbList
  ArticleHeader.tsx     → Category badge, title (DM Serif), subtitle (accent border-left)
  MetaBar.tsx           → Author, date, read time, views, TTS button, font A-/A+, share group
  FeaturedImage.tsx     → aspect-ratio:16/9, CLS-safe, lazy, caption overlay
  ArticleBody.tsx       → Drop cap, 18px/1.58 serif, scroll depth markers
  MatchContextCard.tsx  → Embedded match preview (reusable from Match Center)
  ContextBox.tsx        → Blue info box with timeline
  InlineRelated.tsx     → Accent border-left, hover slides right
  Tags.tsx              → Pill chips with hover
  Reactions.tsx         → Emoji buttons with toggle + count
  RelatedGrid.tsx       → 3-col cards with category, title, meta
  FloatingShare.tsx     → Mobile-only bottom bar (WhatsApp, Viber, Facebook, Copy)
  BackToTop.tsx         → Circle button, shows after 600px scroll
```

### Match Center (`/utakmica/[id]`)
```
pages/utakmica/[id].tsx
  MatchHeader.tsx       → Competition badge, LIVE badge, scoreboard, team logos, form dots
  MatchTabs.tsx         → Summary | Stats | Lineups | Table | H2H
  
  tabs/
    Summary.tsx         → EventTimeline (goal/card/sub/VAR icons) + MomentumBar
    Stats.tsx           → StatRow (dual bar chart per stat, 9 stats)
    Lineups.tsx         → PitchView (formation dots + ratings) + PlayerList
    Table.tsx           → StandingsTable (frozen header + team col, highlighted rows)
    H2H.tsx             → H2HSummary (3 stat cards) + H2HMatchList
  
  sidebar/
    MatchInfo.tsx       → Stadium, referee, weather, attendance
    OddsWidget.tsx      → 3-col home/draw/away
    RelatedNews.tsx     → Compact news list
```

### Static Pages (`/o-nama`, `/impressum`, etc.)
```
pages/o-nama.tsx        → Team grid, technology stack, mission
pages/impressum.tsx     → Legal info cards, copyright, responsibility
pages/privatnost.tsx    → Privacy policy — cookies, GDPR, third parties
pages/uslovi.tsx        → Terms of use — content, comments, AI, ads
pages/kontakt.tsx       → Contact form + email cards
pages/marketing.tsx     → Ad formats, programmatic, Better Ads compliance
```

## 📐 Ad-UX Rules (Non-negotiable)

1. **CLS-safe**: Every ad slot has CSS `min-height` + `contain: layout`
2. **Mobile-first**: Live strip before leaderboard on mobile (CSS order)
3. **Better Ads 2026**: No sticky video, density <30% mobile / <50% desktop
4. **4:1 ratio**: 4 content items per 1 ad in news feeds
5. **Clear labels**: All ads marked "Oglas", sponsored content marked "SPONZORISANO"
6. **Hover guards**: `@media(hover:hover) and (pointer:fine)` for transform effects
7. **Focus states**: `:focus-visible` on all interactive elements

## 🔧 Production Checklist

- [ ] `scroll-behavior: smooth` — REMOVED (breaks SPA routing)
- [ ] Font preconnect hints — ADDED
- [ ] Font weights reduced to 4 files (DM Serif + Plex Sans 400/600 + Plex Mono 600)
- [ ] `content-visibility: auto` on below-fold news cards
- [ ] Schema.org JSON-LD on article pages (NewsArticle)
- [ ] Schema.org BreadcrumbList on all pages
- [ ] `prefers-reduced-motion` media query for all animations
- [ ] Skip-link for accessibility
- [ ] `aria-label` on all interactive elements
- [ ] localStorage keys: `sportba-theme`, `sportba-teams` (personalization)

## 🚀 Next Step

Use these HTML files as pixel-perfect reference to build the Next.js app in the Diurna codebase. Each HTML file is self-contained — open in browser to see exact rendering.
