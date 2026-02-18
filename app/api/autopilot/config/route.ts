import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DEFAULT_CATEGORIES = [
  { name: 'Vijesti', slug: 'vijesti', color: '#3B82F6', percentage: 40, sortOrder: 0 },
  { name: 'Utakmice', slug: 'utakmice', color: '#22C55E', percentage: 25, sortOrder: 1 },
  { name: 'Transferi', slug: 'transferi', color: '#8B5CF6', percentage: 15, sortOrder: 2 },
  { name: 'Analize', slug: 'analize', color: '#EAB308', percentage: 10, sortOrder: 3 },
  { name: 'Povrede', slug: 'povrede', color: '#EF4444', percentage: 5, sortOrder: 4 },
  { name: 'Rankings', slug: 'rankings', color: '#F97316', percentage: 5, sortOrder: 5 },
]

const DEFAULT_LEAGUES = [
  { name: 'Premier League', apiFootballId: 39, flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', weight: 30 },
  { name: 'La Liga', apiFootballId: 140, flag: '🇪🇸', weight: 25 },
  { name: 'Champions League', apiFootballId: 2, flag: '🏆', weight: 20 },
  { name: 'Serie A', apiFootballId: 135, flag: '🇮🇹', weight: 12 },
  { name: 'Premijer Liga BiH', apiFootballId: 210, flag: '🇧🇦', weight: 8 },
  { name: 'HNL', apiFootballId: 210, flag: '🇭🇷', weight: 5 },
]

async function getOrCreateConfig(orgId: string) {
  let config = await prisma.autopilotConfig.findUnique({
    where: { orgId },
    include: { categories: { orderBy: { sortOrder: 'asc' } }, leagues: true, topics: true, channels: true },
  })

  if (!config) {
    config = await prisma.autopilotConfig.create({
      data: {
        orgId,
        categories: { create: DEFAULT_CATEGORIES },
        leagues: {
          create: DEFAULT_LEAGUES.map((l, i) => ({
            ...l,
            // Avoid duplicate apiFootballId — HNL and BiH share 210, set HNL to null
            apiFootballId: i === DEFAULT_LEAGUES.length - 1 && DEFAULT_LEAGUES[i - 1]?.apiFootballId === l.apiFootballId ? null : l.apiFootballId,
          })),
        },
      },
      include: { categories: { orderBy: { sortOrder: 'asc' } }, leagues: true, topics: true, channels: true },
    })
  }

  return config
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const config = await getOrCreateConfig(session.user.organizationId)
  return NextResponse.json(config)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as Record<string, unknown>
  const orgId = session.user.organizationId

  // Remove relation fields and non-updatable fields
  const { id, orgId: _, categories, leagues, topics, channels, createdAt, updatedAt, ...data } = body

  const config = await prisma.autopilotConfig.upsert({
    where: { orgId },
    create: { orgId, ...data },
    update: data,
    include: { categories: { orderBy: { sortOrder: 'asc' } }, leagues: true, topics: true, channels: true },
  })

  return NextResponse.json(config)
}
