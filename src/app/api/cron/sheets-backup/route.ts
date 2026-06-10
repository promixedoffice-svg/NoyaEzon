import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { runSheetsBackup } from '@/lib/sheetsBackup'
import { isGoogleConfigured } from '@/lib/google'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await prisma.businessSettings.findFirst()
  if (!settings?.googleSheetsBackupEnabled || !settings.googleSheetId || !isGoogleConfigured()) {
    return NextResponse.json({ ok: true, ran: false })
  }

  try {
    const result = await runSheetsBackup(settings.googleSheetId)
    return NextResponse.json({ ran: true, ...result })
  } catch (e) {
    return NextResponse.json({ ok: false, ran: false, error: e instanceof Error ? e.message : 'שגיאה בגיבוי' }, { status: 500 })
  }
}

export async function POST() {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isGoogleConfigured()) {
    return NextResponse.json({ error: 'חשבון השירות של Google אינו מוגדר במערכת' }, { status: 400 })
  }

  const settings = await prisma.businessSettings.findFirst()
  if (!settings?.googleSheetId) {
    return NextResponse.json({ error: 'יש להזין מזהה Google Sheet בהגדרות' }, { status: 400 })
  }

  try {
    const result = await runSheetsBackup(settings.googleSheetId)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'שגיאה בגיבוי' }, { status: 500 })
  }
}
