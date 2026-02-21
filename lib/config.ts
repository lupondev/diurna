const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'CRON_SECRET',
] as const

const OPTIONAL_ENV_VARS = [
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'OPENAI_API_KEY',
  'UNSPLASH_ACCESS_KEY',
  'API_FOOTBALL_KEY',
] as const

export function validateEnv() {
  const missing: string[] = []
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  const warnings: string[] = []
  for (const key of OPTIONAL_ENV_VARS) {
    if (!process.env[key]) {
      warnings.push(key)
    }
  }
  if (warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn(`[Config] Optional env vars not set: ${warnings.join(', ')}`)
  }
}
