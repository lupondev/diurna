import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchArticle, buildArticleMetadata, ArticlePage } from '@/lib/public-article'
import '../article.css'
import '@/app/site/public.css'

export const revalidate = 300

type Props = {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const meta = await buildArticleMetadata(params.slug, 'vijesti')
  if (meta.title !== 'Not Found') return meta
  return buildArticleMetadata(params.slug)
}

export default async function VjestiArticlePage({ params }: Props) {
  const data = await fetchArticle(params.slug, 'vijesti')
  if (data) return <ArticlePage data={data} />

  const fallback = await fetchArticle(params.slug)
  if (fallback) return <ArticlePage data={fallback} />

  notFound()
}
