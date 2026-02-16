import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')
    if (!token) {
      return new NextResponse(html('Missing unsubscribe token.', false), { headers: { 'Content-Type': 'text/html' } })
    }

    // Token is base64(subscriberId)
    let subscriberId: string
    try {
      subscriberId = Buffer.from(token, 'base64').toString('utf-8')
    } catch {
      return new NextResponse(html('Invalid unsubscribe link.', false), { headers: { 'Content-Type': 'text/html' } })
    }

    const subscriber = await prisma.subscriber.findUnique({ where: { id: subscriberId } })
    if (!subscriber) {
      return new NextResponse(html('Subscriber not found.', false), { headers: { 'Content-Type': 'text/html' } })
    }

    await prisma.subscriber.update({
      where: { id: subscriberId },
      data: { isActive: false, unsubscribedAt: new Date() },
    })

    return new NextResponse(html('You have been unsubscribed.', true), { headers: { 'Content-Type': 'text/html' } })
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return new NextResponse(html('Something went wrong.', false), { headers: { 'Content-Type': 'text/html' } })
  }
}

function html(message: string, success: boolean) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title><style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8f9fa}div{text-align:center;padding:40px;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:400px}h2{color:${success ? '#00D4AA' : '#F43F5E'};margin-bottom:8px}p{color:#6b7280;font-size:14px}</style></head><body><div><h2>${success ? '✓' : '✗'} ${message}</h2><p>${success ? 'You will no longer receive newsletters from us.' : 'Please try again or contact support.'}</p></div></body></html>`
}
