import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchArticle, buildArticleMetadata, ArticlePage } from '@/lib/public-article'
import '@/app/(public)/vijesti/article.css'
import '@/app/site/public.css'

export const dynamic = 'force-dynamic'

type Props = {
  params: { category: string; slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return buildArticleMetadata(params.slug, params.category)
}

export default async function PublicArticlePage({ params }: Props) {
  const data = await fetchArticle(params.slug, params.category)
  if (!data) notFound()
  return <ArticlePage data={data} />
}
