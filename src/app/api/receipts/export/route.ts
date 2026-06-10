import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { buildReceiptsWorkbook } from '@/lib/receiptsExcel'

export async function GET() {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workbook = await buildReceiptsWorkbook()
  const buffer = await workbook.xlsx.writeBuffer()
  const dateStr = new Date().toISOString().slice(0, 10)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="receipts-${dateStr}.xlsx"`,
    },
  })
}
