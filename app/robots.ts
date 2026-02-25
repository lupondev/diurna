import { MetadataRoute } from 'next'
import { getSiteBaseUrl } from '@/lib/site-url'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = await getSiteBaseUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard',
          '/editor',
          '/settings',
          '/calendar',
          '/copilot',
          '/newsroom',
          '/articles',
          '/admin',
          '/login',
          '/register',
          '/onboarding',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
