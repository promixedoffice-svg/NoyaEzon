import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const treatments = await prisma.treatment.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(treatments)
}

export async function POST(req: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'יש להזין שם טיפול' }, { status: 400 })
    }
    const defaultPrice = Number(body.defaultPrice)
    const durationMinutes = Number(body.durationMinutes)
    const bufferMinutes = Number(body.bufferMinutes)
    const studentDiscountPercent = Number(body.studentDiscountPercent)
    const treatment = await prisma.treatment.create({
      data: {
        name: body.name,
        description: body.description || null,
        defaultPrice: Number.isFinite(defaultPrice) ? defaultPrice : 0,
        durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : 60,
        bufferMinutes: Number.isFinite(bufferMinutes) ? bufferMinutes : 15,
        isActive: body.isActive ?? true,
        color: body.color ?? '#D4A0A0',
        studentDiscountEnabled: body.studentDiscountEnabled ?? false,
        studentDiscountPercent: Number.isFinite(studentDiscountPercent) ? studentDiscountPercent : 0,
      },
    })
    return NextResponse.json(treatment)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'שגיאה בשמירת הטיפול' }, { status: 500 })
  }
}
