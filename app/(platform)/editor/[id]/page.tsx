import { Metadata } from 'next'
import { getArticleById } from '@/lib/db'
import ArticleEditor from './article-editor'

type Props = { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getArticleById(params.id)
  if (!article) return { title: 'Article Not Found' }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://diurna.io'

  return {
    title: article.title,
    description: article.metaDescription || article.excerpt || `${article.title} — published on Diurna`,
    openGraph: {
      title: article.metaTitle || article.title,
      description: article.metaDescription || article.excerpt || '',
      type: 'article',
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      url: `${baseUrl}/${article.site?.slug}/${article.slug}`,
      siteName: 'Diurna',
    },
    twitter: {
      card: 'summary_large_image',
      title: article.metaTitle || article.title,
      description: article.metaDescription || article.excerpt || '',
    },
  }
}

export default async function EditArticlePage({ params }: Props) {
  const article = await getArticleById(params.id)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://diurna.io'

  const jsonLd = article
    ? {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: article.title,
        description: article.metaDescription || article.excerpt || '',
        datePublished: article.publishedAt?.toISOString(),
        dateModified: article.updatedAt.toISOString(),
        url: `${baseUrl}/${article.site?.slug}/${article.slug}`,
        publisher: {
          '@type': 'Organization',
          name: article.site?.name || 'Diurna',
          url: baseUrl,
        },
        ...(article.category && {
          articleSection: article.category.name,
        }),
        isAccessibleForFree: true,
      }
    : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ArticleEditor id={params.id} />
    </>
  )
}
