import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = req.nextUrl
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  const appointments = await prisma.appointment.findMany({
    where: {
      ...(start && end ? { startAt: { gte: new Date(start), lte: new Date(end) } } : {}),
      status: { not: 'cancelled' },
    },
    include: {
      client: { select: { id: true, fullName: true, phone: true } },
      treatment: { select: { name: true, color: true, durationMinutes: true } },
    },
    orderBy: { startAt: 'asc' },
  })
  return NextResponse.json(appointments)
}

export async function POST(req: NextRequest) {
  // Allow unauthenticated for public booking portal
  const body = await req.json()
  const appointment = await prisma.appointment.create({
    data: {
      clientId: body.clientId || null,
      treatmentId: body.treatmentId || null,
      guestName: body.guestName || null,
      guestPhone: body.guestPhone || null,
      guestEmail: body.guestEmail || null,
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
      price: body.price ?? null,
      notes: body.notes || null,
      status: body.status ?? 'pending',
    },
  })
  return NextResponse.json(appointment)
}
