import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const url = new URL(req.url)
  const secretParam = url.searchParams.get('secret')
  
  return NextResponse.json({
    envSecretExists: !!secret,
    envSecretLength: secret?.length ?? 0,
    envSecretFirst8: secret?.slice(0, 8) ?? 'NOT_SET',
    envSecretLast8: secret?.slice(-8) ?? 'NOT_SET',
    paramSecretExists: !!secretParam,
    paramSecretLength: secretParam?.length ?? 0,
    paramSecretFirst8: secretParam?.slice(0, 8) ?? 'NOT_SET',
    paramSecretLast8: secretParam?.slice(-8) ?? 'NOT_SET',
    match: secret === secretParam,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  })
}
