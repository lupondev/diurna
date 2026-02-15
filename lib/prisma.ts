import { PrismaClient } from '@prisma/client'

const SOFT_DELETE_MODELS = new Set([
  'Organization',
  'Site',
  'Article',
  'Category',
  'Widget',
  'UserOnOrganization',
])

const prismaClientSingleton = () => {
  const client = new PrismaClient()

  client.$use(async (params, next) => {
    if (!SOFT_DELETE_MODELS.has(params.model ?? '')) {
      return next(params)
    }

    // Intercept delete → soft delete
    if (params.action === 'delete') {
      params.action = 'update'
      params.args.data = { deletedAt: new Date() }
    }
    if (params.action === 'deleteMany') {
      params.action = 'updateMany'
      params.args.data = { ...(params.args.data || {}), deletedAt: new Date() }
    }

    // Intercept reads → exclude soft deleted
    // NOTE: findUnique is NOT filtered — it only accepts unique fields
    if (['findMany', 'findFirst', 'count'].includes(params.action)) {
      if (!params.args) params.args = {}
      if (!params.args.where) params.args.where = {}
      if (params.args.where.deletedAt === undefined) {
        params.args.where.deletedAt = null
      }
    }

    return next(params)
  })

  return client
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
