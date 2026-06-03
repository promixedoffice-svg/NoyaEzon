import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  // Only allowed to cancel (not delete)
  const receipt = await prisma.receipt.update({
    where: { id },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: body.reason || null,
    },
  })
  return NextResponse.json(receipt)
}
