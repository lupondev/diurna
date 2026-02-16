import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  // Audit log entries will be populated as the system generates events
  // For now, return empty array — the UI handles the empty state gracefully
  return NextResponse.json([])
}
