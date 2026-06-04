import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  const data: any = {}

  // Cancel receipt (accounting)
  if (body.action === 'cancel') {
    data.status = 'cancelled'
    data.cancelledAt = new Date()
    data.cancellationReason = body.reason || null
  }

  // Soft delete (recycle bin)
  if (body.action === 'delete') {
    data.deletedAt = new Date()
  }

  // Restore from recycle bin
  if (body.action === 'restore') {
    data.deletedAt = null
  }

  const receipt = await prisma.receipt.update({ where: { id }, data })
  return NextResponse.json(receipt)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await prisma.receipt.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
