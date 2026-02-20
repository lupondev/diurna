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
}

export default nextConfig
