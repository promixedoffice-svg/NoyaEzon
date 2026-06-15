import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const images = await prisma.galleryImage.findMany({
    orderBy: { order: 'asc' },
    select: { id: true, order: true },
  })
  return NextResponse.json(images)
}
