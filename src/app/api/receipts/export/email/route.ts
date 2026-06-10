import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildReceiptsWorkbook } from '@/lib/receiptsExcel'
import { sendReceiptsExport } from '@/lib/email'

export async function POST(req: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const settings = await prisma.businessSettings.findFirst()
  const to = body.email || settings?.email
  if (!to) {
    return NextResponse.json({ error: 'no_email', message: 'לא הוגדרה כתובת אימייל בהגדרות העסק' }, { status: 400 })
  }

  try {
    const workbook = await buildReceiptsWorkbook()
    const buffer = await workbook.xlsx.writeBuffer()
    await sendReceiptsExport({ to, businessName: settings?.businessName ?? 'הסטודיו', buffer: Buffer.from(buffer) })
    return NextResponse.json({ ok: true, to })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'send_failed' }, { status: 500 })
  }
}
