import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const body = await req.json()
    const data: Record<string, unknown> = {}

    if (body.name !== undefined) {
      if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
        return NextResponse.json({ error: 'יש להזין שם טיפול' }, { status: 400 })
      }
      data.name = body.name
    }
    if (body.description !== undefined) data.description = body.description || null
    if (body.defaultPrice !== undefined) {
      const v = Number(body.defaultPrice)
      data.defaultPrice = Number.isFinite(v) ? v : 0
    }
    if (body.durationMinutes !== undefined) {
      const v = Number(body.durationMinutes)
      data.durationMinutes = Number.isFinite(v) ? v : 60
    }
    if (body.bufferMinutes !== undefined) {
      const v = Number(body.bufferMinutes)
      data.bufferMinutes = Number.isFinite(v) ? v : 0
    }
    if (body.isActive !== undefined) data.isActive = body.isActive
    if (body.color !== undefined) data.color = body.color
    if (body.studentDiscountEnabled !== undefined) data.studentDiscountEnabled = body.studentDiscountEnabled
    if (body.studentDiscountPercent !== undefined) {
      const v = Number(body.studentDiscountPercent)
      data.studentDiscountPercent = Number.isFinite(v) ? v : 0
    }

    const treatment = await prisma.treatment.update({ where: { id }, data })
    return NextResponse.json(treatment)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'שגיאה בעדכון הטיפול' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    await prisma.treatment.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'שגיאה במחיקת הטיפול' }, { status: 500 })
  }
}
