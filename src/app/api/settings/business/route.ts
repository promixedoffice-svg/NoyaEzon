import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const settings = await prisma.businessSettings.findFirst({
    select: { businessName: true, ownerName: true, phone: true },
  })
  return NextResponse.json({
    businessName: settings?.businessName ?? 'הסטודיו',
    ownerName: settings?.ownerName ?? '',
    phone: settings?.phone ?? '',
  })
}
