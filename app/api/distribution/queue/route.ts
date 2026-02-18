import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { distributeArticle } from '@/lib/distribution'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { articleId } = await req.json()
    if (!articleId) {
      return NextResponse.json({ error: 'articleId required' }, { status: 400 })
    }

    const status = await distributeArticle(articleId)

    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error('Distribution queue error:', error)
    return NextResponse.json({ error: 'Queue failed' }, { status: 500 })
  }
}
