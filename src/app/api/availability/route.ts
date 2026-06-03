import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const dateStr = searchParams.get('date')
  const treatmentId = searchParams.get('treatmentId')

  if (!dateStr || !treatmentId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const date = new Date(dateStr)
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999)

  const [treatment, workHours, blockedTimes, existingAppts, availSettings] = await Promise.all([
    prisma.treatment.findUnique({ where: { id: treatmentId } }),
    prisma.workHours.findFirst({ where: { dayOfWeek: date.getDay() } }),
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
  const endMin = eh * 60 + em
  const totalDur = treatment.durationMinutes + treatment.bufferMinutes

  const availableSlots: string[] = []

  for (let m = startMin; m + totalDur <= endMin; m += slotInterval) {
    const slotStart = new Date(date)
    slotStart.setHours(Math.floor(m / 60), m % 60, 0, 0)
    const slotEnd = new Date(slotStart.getTime() + totalDur * 60000)

    // Check if slot is in the past
    const minHours = availSettings?.minBookingHours ?? 24
    if (slotStart.getTime() < Date.now() + minHours * 3600000) continue

    // Check against blocked times
    const blockedByAdmin = blockedTimes.some(bt => {
      const btStart = new Date(bt.startAt).getTime()
      const btEnd = new Date(bt.endAt).getTime()
      return slotStart.getTime() < btEnd && slotEnd.getTime() > btStart
    })
    if (blockedByAdmin) continue

    // Check against existing appointments
    const conflicting = existingAppts.some(appt => {
      const aStart = new Date(appt.startAt).getTime()
      const aEnd = new Date(appt.endAt).getTime()
      return slotStart.getTime() < aEnd && slotEnd.getTime() > aStart
    })
    if (conflicting) continue

    const hh = String(Math.floor(m / 60)).padStart(2, '0')
    const mm = String(m % 60).padStart(2, '0')
    availableSlots.push(`${hh}:${mm}`)
  }

  return NextResponse.json({ slots: availableSlots })
}
