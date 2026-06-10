import { prisma } from './prisma'
import { getAccessToken } from './google'
import { formatDate, formatTime, paymentMethodLabel, appointmentStatusLabel, clientStatusLabel } from './utils'

const SHEETS_SCOPE = ['https://www.googleapis.com/auth/spreadsheets']
const TABS = ['לקוחות', 'קבלות', 'יומן'] as const

type Row = (string | number)[]

async function fetchSheetMeta(sheetId: string, token: string) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`שגיאה בגישה ל-Google Sheet: ${res.status} ${await res.text()}`)
  return res.json() as Promise<{ sheets: { properties: { title: string } }[] }>
}

async function ensureTabs(sheetId: string, token: string) {
  const meta = await fetchSheetMeta(sheetId, token)
  const existing = new Set(meta.sheets.map(s => s.properties.title))
  const missing = TABS.filter(t => !existing.has(t))
  if (!missing.length) return

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: missing.map(title => ({ addSheet: { properties: { title } } })) }),
  })
  if (!res.ok) throw new Error(`שגיאה ביצירת לשוניות ב-Sheet: ${res.status} ${await res.text()}`)
}

async function writeTab(sheetId: string, token: string, tab: string, rows: Row[]) {
  const range = `${tab}!A1:Z10000`
  const clearRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!clearRes.ok) throw new Error(`שגיאה בניקוי לשונית ${tab}: ${clearRes.status} ${await clearRes.text()}`)

  const writeRange = `${tab}!A1`
  const writeRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(writeRange)}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: rows }),
  })
  if (!writeRes.ok) throw new Error(`שגיאה בכתיבה ללשונית ${tab}: ${writeRes.status} ${await writeRes.text()}`)
}

export async function runSheetsBackup(sheetId: string) {
  const token = await getAccessToken(SHEETS_SCOPE)
  await ensureTabs(sheetId, token)

  const [clients, receipts, appointments] = await Promise.all([
    prisma.client.findMany({ where: { deletedAt: null }, orderBy: { fullName: 'asc' } }),
    prisma.receipt.findMany({ where: { deletedAt: null }, orderBy: { receiptNumber: 'desc' } }),
    prisma.appointment.findMany({
      where: { status: { not: 'cancelled' } },
      include: { client: true, treatment: true },
      orderBy: { startAt: 'asc' },
    }),
  ])

  const clientsRows: Row[] = [
    ['שם מלא', 'טלפון', 'אימייל', 'עיר', 'סטטוס', 'הערות'],
    ...clients.map(c => [c.fullName, c.phone ?? '', c.email ?? '', c.city ?? '', clientStatusLabel(c.status), c.notes ?? '']),
  ]

  const receiptsRows: Row[] = [
    ['מספר קבלה', 'תאריך', 'לקוחה', 'שירות', 'תוספות', 'הנחה', 'סכום (₪)', 'אמצעי תשלום', 'סטטוס'],
    ...receipts.map(r => {
      const addonsList = Array.isArray(r.addons) ? (r.addons as { name: string; price: number }[]) : []
      return [
        r.receiptNumber,
        formatDate(r.issuedAt),
        r.clientName,
        r.serviceDescription,
        addonsList.map(a => `${a.name} (${a.price}₪)`).join(', '),
        r.discountLabel ? `${r.discountLabel} (-${r.discountAmount}₪)` : '',
        r.amount,
        paymentMethodLabel(r.method),
        r.status === 'cancelled' ? 'מבוטלת' : 'פעילה',
      ]
    }),
  ]

  const appointmentsRows: Row[] = [
    ['תאריך', 'שעה', 'לקוחה/אורח', 'טיפול', 'סטטוס', 'מחיר (₪)', 'הערות'],
    ...appointments.map(a => [
      formatDate(a.startAt),
      formatTime(a.startAt),
      a.client?.fullName ?? a.guestName ?? '',
      a.treatment?.name ?? '',
      appointmentStatusLabel(a.status),
      a.price ?? '',
      a.notes ?? '',
    ]),
  ]

  await writeTab(sheetId, token, 'לקוחות', clientsRows)
  await writeTab(sheetId, token, 'קבלות', receiptsRows)
  await writeTab(sheetId, token, 'יומן', appointmentsRows)

  return {
    ok: true,
    counts: { clients: clients.length, receipts: receipts.length, appointments: appointments.length },
  }
}
