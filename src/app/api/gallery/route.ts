import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

const MAX_IMAGES = 9
const MAX_BYTES = 400 * 1024

export async function GET() {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const images = await prisma.galleryImage.findMany({
    orderBy: { order: 'asc' },
    select: { id: true, order: true, caption: true },
  })
  return NextResponse.json(images)
}

export async function POST(req: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const dataUrl = body.dataUrl
    if (typeof dataUrl !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(dataUrl)) {
      return NextResponse.json({ error: 'פורמט תמונה לא נתמך' }, { status: 400 })
    }
    if (dataUrl.length > MAX_BYTES * 1.4) {
      return NextResponse.json({ error: 'גודל התמונה חייב להיות עד 400KB' }, { status: 400 })
    }

    const count = await prisma.galleryImage.count()
    if (count >= MAX_IMAGES) {
      return NextResponse.json({ error: `ניתן להעלות עד ${MAX_IMAGES} תמונות` }, { status: 400 })
    }

    const last = await prisma.galleryImage.findFirst({ orderBy: { order: 'desc' } })
    const image = await prisma.galleryImage.create({
      data: { dataUrl, order: (last?.order ?? -1) + 1 },
      select: { id: true, order: true },
    })
    return NextResponse.json(image)
  } catch {
    return NextResponse.json({ error: 'שגיאה בשמירת התמונה' }, { status: 500 })
  }
}
