/** @type {import('next').NextConfig} */
// Diurna v1.0 — SEO Canonical Enforcement V2
const nextConfig = {
  // Removes trailing slashes: /vijesti/ → /vijesti (308)
  trailingSlash: false,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.diurna.app' },
      { protocol: 'https', hostname: 'media.api-sports.io' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ]
  },

  async redirects() {
    return [
      // ── Admin/platform shortcuts (existing) ────────────────────────────
      { source: '/health',       destination: '/settings?tab=health',    permanent: false },
      { source: '/team',         destination: '/settings?tab=team',      permanent: false },
      { source: '/admin',        destination: '/settings',               permanent: false },
      { source: '/admin/site',   destination: '/settings?tab=api-keys',  permanent: false },
      { source: '/admin/sync',   destination: '/settings?tab=sync',      permanent: false },
      { source: '/admin/invites',destination: '/settings?tab=invites',   permanent: false },
      { source: '/admin/audit-log', destination: '/settings?tab=audit', permanent: false },

      // ── SEO: Exact English→Bosnian alias redirects (301) ───────────────
      // Bosnian paths are canonical per hard rules.
      { source: '/injuries',   destination: '/povrede',   permanent: true },
      { source: '/transfers',  destination: '/transferi', permanent: true },
      { source: '/matches',    destination: '/utakmice',  permanent: true },
      { source: '/standings',  destination: '/tabela',    permanent: true },
      { source: '/news',       destination: '/vijesti',   permanent: true },
      { source: '/players',    destination: '/igraci',    permanent: true },

      // ── SEO: Safe ID-based prefix redirects (301) ──────────────────────
      // SAFE: numeric ID identity is guaranteed — no DB lookup needed.
      { source: '/players/:id*', destination: '/igraci/:id*',   permanent: true },
      { source: '/match/:id*',   destination: '/utakmica/:id*', permanent: true },

      // INTENTIONALLY OMITTED — slug identity requires DB lookup:
      // /news/:slug*      → handled in app/(public)/news/[slug]/route.ts
      // /transfers/:slug* → handled in app/(public)/transferi/[slug]/route.ts
    ]
  },
}

export default nextConfig
