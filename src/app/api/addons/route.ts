import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const addons = await prisma.addon.findMany({
    where: { isActive: true },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(addons)
}

export async function POST(req: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'יש להזין שם תוספת' }, { status: 400 })
    }
    const price = Number(body.price)
    const addon = await prisma.addon.create({
      data: {
        name: body.name,
        price: Number.isFinite(price) ? price : 0,
        isActive: body.isActive ?? true,
      },
    })
    return NextResponse.json(addon)
  } catch {
    return NextResponse.json({ error: 'שגיאה בשמירת התוספת' }, { status: 500 })
  }
}
