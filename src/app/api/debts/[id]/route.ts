import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  const current = await prisma.debt.findUnique({ where: { id } })
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const newPaid = body.paidAmount !== undefined ? body.paidAmount : current.paidAmount
  const newOriginal = body.originalAmount !== undefined ? body.originalAmount : current.originalAmount
  const autoStatus = newPaid >= newOriginal ? 'closed' : newPaid > 0 ? 'partial' : 'open'

  const debt = await prisma.debt.update({
    where: { id },
    data: {
      ...(body.originalAmount !== undefined ? { originalAmount: body.originalAmount } : {}),
      ...(body.paidAmount !== undefined ? { paidAmount: body.paidAmount } : {}),
      ...(body.notes !== undefined ? { notes: body.notes || null } : {}),
      status: body.status ?? autoStatus,
    },
  })

  // If payment recorded, create payment record too
  if (body.paymentAmount && body.paymentMethod && current.clientId) {
    await prisma.payment.create({
      data: {
        clientId: current.clientId,
        visitId: current.visitId,
        amount: body.paymentAmount,
        method: body.paymentMethod,
        notes: `תשלום חוב`,
      },
    })
  }

  return NextResponse.json(debt)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await prisma.debt.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
