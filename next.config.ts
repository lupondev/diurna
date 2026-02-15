import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow images from any subdomain
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.diurna.app',
      },
    ],
  },
}

export default nextConfig
