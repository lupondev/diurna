import { prisma } from '@/lib/prisma'

type LogLevel = 'info' | 'warn' | 'error'
type LogService = 'autopilot' | 'ai-engine' | 'webhook' | 'api-football' | 'unsplash' | 'system'

export async function systemLog(
  level: LogLevel,
  service: LogService,
  message: string,
  meta?: Record<string, unknown>,
) {
  try {
    await prisma.systemLog.create({
      data: { level, service, message, meta: meta ? JSON.parse(JSON.stringify(meta)) : undefined },
    })
  } catch {
    // Silently fail — logging should never crash the app
  }
}
