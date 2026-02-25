import type { Metadata } from 'next'
import { canonicalUrl } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Video — SportBa',
  description: 'Video highlights, golovi i intervjui.',
  alternates: { canonical: canonicalUrl('/video') },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Video — SportBa',
  description: 'Najnovije vijesti iz kategorije Video',
  url: canonicalUrl('/video'),
  isPartOf: { '@type': 'WebSite', name: 'SportBa', url: canonicalUrl('/') },
}

export default function VideoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  )
}
