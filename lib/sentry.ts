import * as Sentry from '@sentry/nextjs'

export function captureApiError(error: unknown, context?: Record<string, unknown>) {
  console.error(error)
  Sentry.captureException(error, {
    extra: context,
  })
}
