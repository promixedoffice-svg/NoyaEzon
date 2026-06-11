import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const PHONE_REGEX = /^0\d{8,9}$/

export async function GET(req: NextRequest) {
  const phone = (req.nextUrl.searchParams.get('phone') ?? '').replace(/[-\s]/g, '')
  if (!PHONE_REGEX.test(phone)) return NextResponse.json({})

  const client = await prisma.client.findFirst({
    where: { phone, deletedAt: null },
    select: { fullName: true, email: true },
  })
  return NextResponse.json(client ?? {})
}
