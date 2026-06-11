import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const client = await prisma.client.update({
    where: { id },
    data: {
      ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
      ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
      ...(body.email !== undefined ? { email: body.email || null } : {}),
      ...(body.city !== undefined ? { city: body.city || null } : {}),
      ...(body.address !== undefined ? { address: body.address || null } : {}),
      ...(body.notes !== undefined ? { notes: body.notes || null } : {}),
      ...(body.preferences !== undefined ? { preferences: body.preferences || null } : {}),
      ...(body.sensitivities !== undefined ? { sensitivities: body.sensitivities || null } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.birthDate !== undefined ? { birthDate: body.birthDate ? new Date(body.birthDate) : null } : {}),
      ...(body.customAnswers !== undefined ? { customAnswers: body.customAnswers } : {}),
      // Soft delete
      ...(body.deletedAt !== undefined ? { deletedAt: body.deletedAt ? new Date(body.deletedAt) : null } : {}),
    },
  })
  return NextResponse.json(client)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  // Hard delete — only if already soft-deleted
  await prisma.client.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
