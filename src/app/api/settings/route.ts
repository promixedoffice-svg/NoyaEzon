import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const existing = await prisma.businessSettings.findFirst()
  if (existing) {
    await prisma.businessSettings.update({ where: { id: existing.id }, data: body })
  } else {
    await prisma.businessSettings.create({ data: body })
  }
  return NextResponse.json({ ok: true })
}
