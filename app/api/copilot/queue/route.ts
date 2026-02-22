import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const PatchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['approved', 'rejected']),
})

// Queue items are AI-generated suggestions stored in localStorage on the client.
// This endpoint accepts status updates so the backend can log decisions
// and (in future) trigger publishing pipelines for approved items.
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = PatchSchema.parse(body)

    // TODO: When autopilot article IDs are persisted to DB, update the article
    // status here and optionally trigger the publish pipeline for approved items.
    // For now, acknowledge the update so the client sync doesn't silently 404.
    console.log(`[copilot/queue] ${session.user.id} ${data.status} item ${data.id}`)

    return NextResponse.json({ success: true, id: data.id, status: data.status })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
