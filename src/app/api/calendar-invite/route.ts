import { NextRequest, NextResponse } from 'next/server'

function pad(n: number) { return String(n).padStart(2, '0') }

function toICSDate(date: Date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth()+1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const title = searchParams.get('title') ?? 'תור'
  const startAt = searchParams.get('start') ?? ''
  const endAt = searchParams.get('end') ?? ''
  const location = searchParams.get('location') ?? ''
  const description = searchParams.get('description') ?? ''

  if (!startAt || !endAt) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const start = new Date(startAt)
  const end = new Date(endAt)

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NoyaGayaEzon//Studio//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@noyagayaezon`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${title}`,
    location ? `LOCATION:${location}` : '',
    description ? `DESCRIPTION:${description}` : '',
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    'DESCRIPTION:תזכורת לתור מחר',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:תזכורת לתור בעוד שעתיים',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="tor.ics"`,
    },
  })
}
