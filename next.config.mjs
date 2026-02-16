/** @type {import('next').NextConfig} */
// Diurna v1.0
const nextConfig = {
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
