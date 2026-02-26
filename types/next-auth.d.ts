import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface User {
    organizationId?: string | null
    onboardingCompleted?: boolean
    role?: string
  }
  interface Session {
    user: User & {
      id: string
      organizationId: string | null
      onboardingCompleted: boolean
      role: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    organizationId?: string | null
    onboardingCompleted?: boolean
    role?: string
    lastDbRefresh?: number
  }
}
