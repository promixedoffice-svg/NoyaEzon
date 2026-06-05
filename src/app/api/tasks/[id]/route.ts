import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const data: Record<string, unknown> = {}

  if ('title'       in body) data.title       = body.title
  if ('description' in body) data.description = body.description ?? null
  if ('dueAt'       in body) data.dueAt       = body.dueAt ? new Date(body.dueAt) : null
  if ('completedAt' in body) data.completedAt = body.completedAt ? new Date(body.completedAt) : null
  if ('deletedAt'   in body) data.deletedAt   = body.deletedAt ? new Date(body.deletedAt) : null

  const task = await prisma.task.update({ where: { id }, data })
  return NextResponse.json(task)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  // Hard delete (only used from recycle bin)
  await prisma.task.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
