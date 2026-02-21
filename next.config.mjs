/** @type {import('next').NextConfig} */
// Diurna v1.0
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.diurna.app',
      },
      {
        protocol: 'https',
        hostname: 'media.api-sports.io',
      },
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
      {
        source: '/health',
        destination: '/settings?tab=health',
        permanent: false,
      },
      {
        source: '/team',
        destination: '/settings?tab=team',
        permanent: false,
      },
      {
        source: '/admin',
        destination: '/settings',
        permanent: false,
      },
      {
        source: '/admin/site',
        destination: '/settings?tab=api-keys',
        permanent: false,
      },
      {
        source: '/admin/sync',
        destination: '/settings?tab=sync',
        permanent: false,
      },
      {
        source: '/admin/invites',
        destination: '/settings?tab=invites',
        permanent: false,
      },
      {
        source: '/admin/audit-log',
        destination: '/settings?tab=audit',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
