import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      organizationId?: string | null
      onboardingCompleted?: boolean
      role?: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    organizationId?: string | null
    onboardingCompleted?: boolean
    role?: string
  }
}
