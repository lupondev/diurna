import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            orgs: {
              where: { deletedAt: null },
              orderBy: { joinedAt: 'asc' },
              take: 1,
            },
          },
        })
        if (!user?.passwordHash) return null

        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          organizationId: user.orgs[0]?.organizationId ?? null,
          onboardingCompleted: user.onboardingCompleted,
          role: user.orgs[0]?.role ?? 'JOURNALIST',
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.organizationId = user.organizationId ?? null
        token.onboardingCompleted = user.onboardingCompleted ?? false
        token.role = user.role ?? 'JOURNALIST'
        token.lastDbRefresh = Date.now()
      }

      const REFRESH_MS = 5 * 60 * 1000
      const lastRefresh = (token.lastDbRefresh as number) || 0
      const shouldRefresh = trigger === 'update' || (token.id && Date.now() - lastRefresh > REFRESH_MS)

      if (token.id && shouldRefresh) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              onboardingCompleted: true,
              orgs: {
                where: { deletedAt: null },
                orderBy: { joinedAt: 'asc' },
                take: 1,
                select: { role: true, organizationId: true },
              },
            },
          })
          if (dbUser) {
            token.onboardingCompleted = dbUser.onboardingCompleted
            if (dbUser.orgs[0]) {
              token.role = dbUser.orgs[0].role
              token.organizationId = dbUser.orgs[0].organizationId
            }
          }
          token.lastDbRefresh = Date.now()
        } catch (err) {
          console.error('Auth JWT callback db fetch:', err)
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id!
        session.user.organizationId = token.organizationId ?? null
        session.user.onboardingCompleted = token.onboardingCompleted ?? false
        session.user.role = token.role ?? 'JOURNALIST'
      }
      return session
    },
  },
}
