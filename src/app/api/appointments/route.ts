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
  const body = await req.json()

  let clientId = body.clientId || null

  // Auto-create or link client when booking via portal
  if (!clientId && (body.guestPhone || body.guestEmail)) {
    // Try to find existing client by phone or email
    const existing = await prisma.client.findFirst({
      where: {
        OR: [
          body.guestPhone ? { phone: body.guestPhone } : {},
          body.guestEmail ? { email: body.guestEmail } : {},
        ].filter(o => Object.keys(o).length > 0),
      },
    })

    if (existing) {
      clientId = existing.id
    } else if (body.guestName) {
      // Create new client card automatically
      const newClient = await prisma.client.create({
        data: {
          fullName: body.guestName,
          phone: body.guestPhone || null,
          email: body.guestEmail || null,
          status: 'new',
        },
      })
      clientId = newClient.id
    }
  }

  // Reject if there is already a confirmed/pending appointment that overlaps
  const conflict = await prisma.appointment.findFirst({
    where: {
      status: { in: ['pending', 'confirmed'] },
      AND: [
        { startAt: { lt: new Date(body.endAt) } },
        { endAt:   { gt: new Date(body.startAt) } },
      ],
    },
  })
  if (conflict) {
    return NextResponse.json({ error: 'conflict', message: 'יש תור קיים בשעה זו' }, { status: 409 })
  }

  const appointment = await prisma.appointment.create({
    data: {
      clientId,
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
