import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { hours, avail } = await req.json()

  for (const h of hours) {
    await prisma.workHours.upsert({
      where: { dayOfWeek: h.dayOfWeek },
      update: { isWorking: h.isWorking, startTime: h.startTime, endTime: h.endTime },
      create: { dayOfWeek: h.dayOfWeek, isWorking: h.isWorking, startTime: h.startTime, endTime: h.endTime },
    })
  }

  const existing = await prisma.availabilitySettings.findFirst()
  if (existing) {
    await prisma.availabilitySettings.update({ where: { id: existing.id }, data: avail })
  } else {
    await prisma.availabilitySettings.create({ data: avail })
  }

  return NextResponse.json({ ok: true })
}
