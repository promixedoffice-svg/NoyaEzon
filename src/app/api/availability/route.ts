import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Convert a wall-clock time in Israel (Asia/Jerusalem, DST-aware) to a real UTC Date.
// Probes noon UTC on that date to get the Israel offset, so summer (+3) and winter (+2) both work.
function israelToUTC(dateStr: string, h: number, m: number, s = 0): Date {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const noon = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0))
  const israelHour = parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', hour: 'numeric', hour12: false }).format(noon),
    10
  )
  const offsetH = israelHour - 12 // UTC+2 in winter, UTC+3 in summer
  return new Date(Date.UTC(y, mo - 1, d, h - offsetH, m, s))
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const dateStr = searchParams.get('date')
  const treatmentId = searchParams.get('treatmentId')

  if (!dateStr || !treatmentId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const [year, month, day] = dateStr.split('-').map(Number)
  const dayStart = israelToUTC(dateStr, 0, 0, 0)
  const dayEnd   = israelToUTC(dateStr, 23, 59, 59)
  const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay()

  const [treatment, workHours, blockedTimes, existingAppts, availSettings] = await Promise.all([
    prisma.treatment.findUnique({ where: { id: treatmentId } }),
    prisma.workHours.findFirst({ where: { dayOfWeek: dow } }),
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
    const slotH = Math.floor(m / 60)
    const slotM = m % 60
    const slotStart = israelToUTC(dateStr, slotH, slotM)
    const slotEnd   = new Date(slotStart.getTime() + totalDur * 60000)

    // Skip slots too close to now
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

    availableSlots.push(`${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}`)
  }

  return NextResponse.json({ slots: availableSlots })
}
