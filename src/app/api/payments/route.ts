import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const payment = await prisma.payment.create({
    data: {
      clientId: body.clientId,
      visitId: body.visitId || null,
      amount: body.amount,
      method: body.method ?? 'cash',
      reference: body.reference || null,
      notes: body.notes || null,
      paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
    },
  })
  return NextResponse.json(payment)
}
