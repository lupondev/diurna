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
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.organizationId = (user as unknown as { organizationId?: string | null }).organizationId ?? null
        token.onboardingCompleted = (user as unknown as { onboardingCompleted?: boolean }).onboardingCompleted ?? false
      }

      // Re-fetch onboardingCompleted from DB so the token stays current
      // after the onboarding API sets it to true (avoids redirect loop)
      if (token.id && !token.onboardingCompleted) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { onboardingCompleted: true },
          })
          if (dbUser) {
            token.onboardingCompleted = dbUser.onboardingCompleted
          }
        } catch {
          // Non-fatal — keep existing token value
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.organizationId = token.organizationId as string | null
        session.user.onboardingCompleted = token.onboardingCompleted as boolean
      }
      return session
    },
  },
}
