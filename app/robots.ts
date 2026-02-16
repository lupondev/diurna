import { MetadataRoute } from 'next'
import { getSiteBaseUrl } from '@/lib/site-url'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = await getSiteBaseUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/editor/', '/newsroom/', '/settings/', '/team/', '/onboarding/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
