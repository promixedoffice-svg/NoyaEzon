import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()

  // Get next receipt number
  const settings = await prisma.businessSettings.findFirst()
  const lastReceipt = await prisma.receipt.findFirst({ orderBy: { receiptNumber: 'desc' } })
  const nextNumber = lastReceipt
    ? lastReceipt.receiptNumber + 1
    : (settings?.receiptStartingNumber ?? 1000)

  const receipt = await prisma.receipt.create({
    data: {
      clientId: body.clientId,
      visitId: body.visitId || null,
      paymentId: body.paymentId || null,
      receiptNumber: nextNumber,
      amount: body.amount,
      method: body.method,
      serviceDescription: body.serviceDescription,
      clientName: body.clientName,
      status: 'active',
    },
  })
  return NextResponse.json(receipt)
}
