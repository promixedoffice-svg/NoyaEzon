import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const client = await prisma.client.update({
    where: { id },
    data: {
      fullName: body.fullName,
      phone: body.phone || null,
      email: body.email || null,
      city: body.city || null,
      address: body.address || null,
      notes: body.notes || null,
      preferences: body.preferences || null,
      sensitivities: body.sensitivities || null,
      status: body.status,
    },
  })
  return NextResponse.json(client)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.client.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
