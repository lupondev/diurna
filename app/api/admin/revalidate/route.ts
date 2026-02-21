import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    revalidatePath('/', 'layout')
    return NextResponse.json({ revalidated: true, timestamp: new Date().toISOString() })
  } catch (e) {
    return NextResponse.json({
      revalidated: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    }, { status: 500 })
  }
}
