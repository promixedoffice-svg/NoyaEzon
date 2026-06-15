import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const image = await prisma.galleryImage.findUnique({ where: { id }, select: { dataUrl: true } })
  const match = image?.dataUrl.match(/^data:(.+);base64,(.+)$/)
  if (!match) return new NextResponse(null, { status: 404 })

  const [, mimeType, base64] = match
  return new NextResponse(Buffer.from(base64, 'base64'), {
    headers: { 'Content-Type': mimeType, 'Cache-Control': 'public, max-age=300' },
  })
}

const MAX_CAPTION_LENGTH = 200

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const body = await req.json()

    if (typeof body.caption === 'string' || body.caption === null) {
      const caption = typeof body.caption === 'string' ? body.caption.trim().slice(0, MAX_CAPTION_LENGTH) : null
      const image = await prisma.galleryImage.update({
        where: { id },
        data: { caption: caption || null },
        select: { id: true, caption: true },
      })
      return NextResponse.json(image)
    }

    const direction = body.direction
    if (direction !== 'up' && direction !== 'down') {
      return NextResponse.json({ error: 'כיוון לא תקין' }, { status: 400 })
    }

    const images = await prisma.galleryImage.findMany({ orderBy: { order: 'asc' }, select: { id: true, order: true } })
    const index = images.findIndex(img => img.id === id)
    if (index === -1) return NextResponse.json({ error: 'התמונה לא נמצאה' }, { status: 404 })

    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= images.length) {
      return NextResponse.json({ ok: true })
    }

    const current = images[index]
    const swapWith = images[swapIndex]
    await prisma.$transaction([
      prisma.galleryImage.update({ where: { id: current.id }, data: { order: swapWith.order } }),
      prisma.galleryImage.update({ where: { id: swapWith.id }, data: { order: current.order } }),
    ])
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'שגיאה בעדכון התמונה' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    await prisma.galleryImage.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'שגיאה במחיקת התמונה' }, { status: 500 })
  }
}
