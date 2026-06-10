import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { syncAppointmentToCalendar, deleteAppointmentFromCalendar } from '@/lib/googleCalendarSync'

const CALENDAR_INACTIVE_STATUSES = ['cancelled', 'no_show']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const appointment = await prisma.appointment.update({
    where: { id },
    data: {
      ...body,
      ...(body.startAt ? { startAt: new Date(body.startAt) } : {}),
      ...(body.endAt ? { endAt: new Date(body.endAt) } : {}),
    },
    include: { client: { select: { fullName: true } }, treatment: { select: { name: true } } },
  })

  const settings = await prisma.businessSettings.findFirst()
  if (settings?.googleCalendarSyncEnabled && settings.googleCalendarId) {
    if (CALENDAR_INACTIVE_STATUSES.includes(appointment.status) && appointment.googleEventId) {
      await deleteAppointmentFromCalendar(appointment.googleEventId, settings.googleCalendarId)
      await prisma.appointment.update({ where: { id }, data: { googleEventId: null } })
    } else if (!CALENDAR_INACTIVE_STATUSES.includes(appointment.status)) {
      const eventId = await syncAppointmentToCalendar(appointment, settings.googleCalendarId)
      if (eventId) await prisma.appointment.update({ where: { id }, data: { googleEventId: eventId } })
    }
  }

  return NextResponse.json(appointment)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const existing = await prisma.appointment.findUnique({ where: { id }, select: { googleEventId: true } })
  if (existing?.googleEventId) {
    const settings = await prisma.businessSettings.findFirst()
    if (settings?.googleCalendarSyncEnabled && settings.googleCalendarId) {
      await deleteAppointmentFromCalendar(existing.googleEventId, settings.googleCalendarId)
    }
  }

  await prisma.appointment.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
