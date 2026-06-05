import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Helper: create a Date treating the business clock as UTC-naive.
// "10:00 on 2024-06-05" always becomes 2024-06-05T10:00:00Z regardless of server TZ.
function biz(year: number, month: number, day: number, h = 0, m = 0, s = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, h, m, s, 0))
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const dateStr = searchParams.get('date')
  const treatmentId = searchParams.get('treatmentId')

  if (!dateStr || !treatmentId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const [year, month, day] = dateStr.split('-').map(Number)
  const dayStart = biz(year, month, day, 0, 0, 0)
  const dayEnd   = biz(year, month, day, 23, 59, 59)

  const [treatment, workHours, blockedTimes, existingAppts, availSettings] = await Promise.all([
    prisma.treatment.findUnique({ where: { id: treatmentId } }),
    prisma.workHours.findFirst({ where: { dayOfWeek: biz(year, month, day).getUTCDay() } }),
    prisma.blockedTime.findMany({
      where: {
        OR: [
          { startAt: { gte: dayStart, lte: dayEnd } },
          { endAt: { gte: dayStart, lte: dayEnd } },
          { startAt: { lte: dayStart }, endAt: { gte: dayEnd } },
        ],
      },
    }),
    prisma.appointment.findMany({
      where: {
        startAt: { gte: dayStart, lte: dayEnd },
        status: { in: ['pending', 'confirmed'] },
      },
      select: { startAt: true, endAt: true },
    }),
    prisma.availabilitySettings.findFirst(),
  ])

  if (!treatment || !workHours || !workHours.isWorking) {
    return NextResponse.json({ slots: [] })
  }

  const slotInterval = availSettings?.slotIntervalMinutes ?? 15
  const [sh, sm] = workHours.startTime.split(':').map(Number)
  const [eh, em] = workHours.endTime.split(':').map(Number)
  const startMin = sh * 60 + sm
  const endMin   = eh * 60 + em
  const totalDur = treatment.durationMinutes + treatment.bufferMinutes

  const availableSlots: string[] = []

  for (let m = startMin; m + totalDur <= endMin; m += slotInterval) {
    const slotStart = biz(year, month, day, Math.floor(m / 60), m % 60)
    const slotEnd   = new Date(slotStart.getTime() + totalDur * 60000)

    // Skip past slots
    const minHours = availSettings?.minBookingHours ?? 24
    if (slotStart.getTime() < Date.now() + minHours * 3600000) continue

    // Check blocked times
    const blockedByAdmin = blockedTimes.some(bt =>
      slotStart.getTime() < new Date(bt.endAt).getTime() &&
      slotEnd.getTime()   > new Date(bt.startAt).getTime()
    )
    if (blockedByAdmin) continue

    // Check existing appointments
    const conflicting = existingAppts.some(appt =>
      slotStart.getTime() < new Date(appt.endAt).getTime() &&
      slotEnd.getTime()   > new Date(appt.startAt).getTime()
    )
    if (conflicting) continue

    const hh = String(Math.floor(m / 60)).padStart(2, '0')
    const mm = String(m % 60).padStart(2, '0')
    availableSlots.push(`${hh}:${mm}`)
  }

  return NextResponse.json({ slots: availableSlots })
}
