import ExcelJS from 'exceljs'
import { prisma } from './prisma'
import { formatDate, paymentMethodLabel } from './utils'

export async function buildReceiptsWorkbook() {
  const receipts = await prisma.receipt.findMany({
    where: { deletedAt: null },
    orderBy: { receiptNumber: 'desc' },
  })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('קבלות', { views: [{ rightToLeft: true }] })

  sheet.columns = [
    { header: 'מספר קבלה', key: 'receiptNumber', width: 12 },
    { header: 'תאריך', key: 'date', width: 14 },
    { header: 'לקוחה', key: 'clientName', width: 22 },
    { header: 'שירות', key: 'service', width: 28 },
    { header: 'תוספות', key: 'addons', width: 30 },
    { header: 'הנחה', key: 'discount', width: 24 },
    { header: 'סכום (₪)', key: 'amount', width: 12 },
    { header: 'אמצעי תשלום', key: 'method', width: 14 },
    { header: 'סטטוס', key: 'status', width: 12 },
  ]
  sheet.getRow(1).font = { bold: true }

  for (const r of receipts) {
    const addonsList = Array.isArray(r.addons) ? (r.addons as { name: string; price: number }[]) : []
    sheet.addRow({
      receiptNumber: r.receiptNumber,
      date: formatDate(r.issuedAt),
      clientName: r.clientName,
      service: r.serviceDescription,
      addons: addonsList.map(a => `${a.name} (${a.price}₪)`).join(', '),
      discount: r.discountLabel ? `${r.discountLabel} (-${r.discountAmount}₪)` : '',
      amount: r.amount,
      method: paymentMethodLabel(r.method as Parameters<typeof paymentMethodLabel>[0]),
      status: r.status === 'cancelled' ? 'מבוטלת' : 'פעילה',
    })
  }

  return workbook
}
