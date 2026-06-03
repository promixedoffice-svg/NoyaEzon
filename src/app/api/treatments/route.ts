import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const treatment = await prisma.treatment.create({ data: { name: body.name, description: body.description || null, defaultPrice: body.defaultPrice ?? 0, durationMinutes: body.durationMinutes ?? 60, bufferMinutes: body.bufferMinutes ?? 15, isActive: body.isActive ?? true, color: body.color ?? '#D4A0A0' } })
  return NextResponse.json(treatment)
}
