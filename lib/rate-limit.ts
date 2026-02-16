import { prisma } from './prisma'
import type { Plan } from '@prisma/client'

const AI_LIMITS: Record<Plan, number> = {
  FREE: 20,
  STARTER: 200,
  PRO: 1000,
  ENTERPRISE: 999999,
}

export async function checkAIRateLimit(orgId: string): Promise<{
  allowed: boolean
  remaining: number
  limit: number
}> {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: { plan: true },
  })

  const limit = AI_LIMITS[org.plan]
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const used = await prisma.auditLog.count({
    where: {
      organizationId: orgId,
      action: 'AI_GENERATED',
      createdAt: { gte: today },
    },
  })

  return {
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
    limit,
  }
}
