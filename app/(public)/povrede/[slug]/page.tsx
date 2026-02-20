import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchArticle, buildArticleMetadata, ArticlePage } from '@/lib/public-article'
import '@/app/(public)/vijesti/article.css'
import '@/app/site/public.css'

export const dynamic = 'force-dynamic'

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return buildArticleMetadata(params.slug, 'povrede')
}

export default async function PovrdeArticlePage({ params }: Props) {
  const data = await fetchArticle(params.slug, 'povrede')
  if (!data) {
    const fallback = await fetchArticle(params.slug)
    if (!fallback) notFound()
    return <ArticlePage data={fallback} />
  }
  return <ArticlePage data={data} />
}
