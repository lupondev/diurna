import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ArticleEditor from './article-editor'

type Props = { params: { id: string } }

// Bug B fix: editor is admin-only UI — no public metadata or JSON-LD
// Only block unauthenticated access server-side
export const metadata: Metadata = {
  title: 'Edit Article — Diurna',
  robots: { index: false, follow: false },
}

export default async function EditArticlePage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  return <ArticleEditor id={params.id} />
}
