import { prisma } from './prisma'
import { getAccessToken, isGoogleConfigured } from './google'
import { formatCurrency } from './utils'

const CALENDAR_SCOPE = ['https://www.googleapis.com/auth/calendar.events']

type AppointmentForSync = {
  id: string
  startAt: Date
  endAt: Date
  notes: string | null
  price: number | null
  guestName: string | null
  addonIds: string[]
  googleEventId: string | null
  client: { fullName: string } | null
  treatment: { name: string } | null
}

export async function syncAppointmentToCalendar(appointment: AppointmentForSync, calendarId: string | null | undefined): Promise<string | null> {
  if (!isGoogleConfigured() || !calendarId) return null
  try {
    const token = await getAccessToken(CALENDAR_SCOPE)
    const clientName = appointment.client?.fullName ?? appointment.guestName ?? 'לקוחה'
    const treatmentName = appointment.treatment?.name ?? 'טיפול'

    const descriptionParts: string[] = []
    if (appointment.price != null) descriptionParts.push(`מחיר: ${formatCurrency(appointment.price)}`)
    if (appointment.addonIds.length) {
      const addons = await prisma.addon.findMany({ where: { id: { in: appointment.addonIds } } })
      if (addons.length) descriptionParts.push(`תוספות: ${addons.map(a => a.name).join(', ')}`)
    }
    if (appointment.notes) descriptionParts.push(`הערות: ${appointment.notes}`)

    const eventBody = {
      summary: `${treatmentName} - ${clientName}`,
      description: descriptionParts.join('\n'),
      start: { dateTime: appointment.startAt.toISOString(), timeZone: 'Asia/Jerusalem' },
      end: { dateTime: appointment.endAt.toISOString(), timeZone: 'Asia/Jerusalem' },
    }

    const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
    if (appointment.googleEventId) {
      const res = await fetch(`${base}/${appointment.googleEventId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(eventBody),
      })
      if (!res.ok) throw new Error(`Calendar update failed: ${res.status} ${await res.text()}`)
      return null
    } else {
      const res = await fetch(base, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(eventBody),
      })
      if (!res.ok) throw new Error(`Calendar create failed: ${res.status} ${await res.text()}`)
      const data = await res.json() as { id: string }
      return data.id
    }
  } catch (e) {
    console.error('syncAppointmentToCalendar failed:', e)
    return null
  }
}

export async function deleteAppointmentFromCalendar(googleEventId: string, calendarId: string | null | undefined): Promise<void> {
  if (!isGoogleConfigured() || !calendarId) return
  try {
    const token = await getAccessToken(CALENDAR_SCOPE)
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok && res.status !== 410 && res.status !== 404) {
      throw new Error(`Calendar delete failed: ${res.status} ${await res.text()}`)
    }
  } catch (e) {
    console.error('deleteAppointmentFromCalendar failed:', e)
  }
}
