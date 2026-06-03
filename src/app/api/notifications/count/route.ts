import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  if (!await requireAuth()) return NextResponse.json({ count: 0 })
  const count = await prisma.appointment.count({ where: { status: 'pending' } })
  return NextResponse.json({ count })
}
