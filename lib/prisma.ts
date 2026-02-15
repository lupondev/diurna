import { PrismaClient } from '@prisma/client'

const SOFT_DELETE_MODELS = [
  'organization',
  'site',
  'article',
  'category',
  'widget',
  'userOnOrganization',
] as const

function createPrismaClient() {
  const base = new PrismaClient()

  const extended = base.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model.charAt(0).toLowerCase() + model.slice(1) as any)) {
            args.where = { ...args.where, deletedAt: args.where?.deletedAt === undefined ? null : args.where.deletedAt }
          }
          return query(args)
        },
        async findFirst({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model.charAt(0).toLowerCase() + model.slice(1) as any)) {
            args.where = { ...args.where, deletedAt: args.where?.deletedAt === undefined ? null : args.where.deletedAt }
          }
          return query(args)
        },
        async count({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model.charAt(0).toLowerCase() + model.slice(1) as any)) {
            args.where = { ...args.where, deletedAt: args.where?.deletedAt === undefined ? null : args.where.deletedAt }
          }
          return query(args)
        },
        async delete({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model.charAt(0).toLowerCase() + model.slice(1) as any)) {
            return (base as any)[model.charAt(0).toLowerCase() + model.slice(1)].update({
              ...args,
              data: { deletedAt: new Date() },
            })
          }
          return query(args)
        },
        async deleteMany({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model.charAt(0).toLowerCase() + model.slice(1) as any)) {
            return (base as any)[model.charAt(0).toLowerCase() + model.slice(1)].updateMany({
              ...args,
              data: { deletedAt: new Date() },
            })
          }
          return query(args)
        },
      },
    },
  })

  return extended
}

const globalForPrisma = globalThis as unknown as { prisma: ReturnType<typeof createPrismaClient> | undefined }
export const prisma = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
