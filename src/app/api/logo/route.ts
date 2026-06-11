import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const settings = await prisma.businessSettings.findFirst({ select: { logoUrl: true } })
  const match = settings?.logoUrl?.match(/^data:(.+);base64,(.+)$/)
  if (!match) return new NextResponse(null, { status: 404 })

  const [, mimeType, base64] = match
  return new NextResponse(Buffer.from(base64, 'base64'), {
    headers: { 'Content-Type': mimeType, 'Cache-Control': 'public, max-age=300' },
  })
}
