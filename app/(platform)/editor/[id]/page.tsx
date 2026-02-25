import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { EditorShell } from '@/components/editor/editor-shell'
import '../editor.css'

type Props = { params: { id: string } }

export const metadata: Metadata = {
  title: 'Edit Article — Diurna',
  robots: { index: false, follow: false },
}

export default async function EditArticlePage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  return <EditorShell articleId={params.id} />
}
