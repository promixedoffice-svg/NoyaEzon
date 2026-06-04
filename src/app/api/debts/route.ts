import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const debt = await prisma.debt.create({
    data: {
      clientId: body.clientId,
      visitId: body.visitId || null,
      originalAmount: body.originalAmount,
      paidAmount: body.paidAmount ?? 0,
      status: body.paidAmount >= body.originalAmount ? 'closed' : body.paidAmount > 0 ? 'partial' : 'open',
      notes: body.notes || null,
    },
  })
  return NextResponse.json(debt)
}
