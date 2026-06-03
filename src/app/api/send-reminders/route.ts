import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendReminder } from '@/lib/email'
import { addHours } from 'date-fns'

// Called by a cron job (e.g., Vercel Cron or external scheduler)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const now = new Date()
  const in24h = addHours(now, 24)
  const in2h = addHours(now, 2)

  // Find appointments starting in ~24h or ~2h (within 15 min window)
  const windows = [
    { target: in24h, hoursAhead: 24 },
    { target: in2h, hoursAhead: 2 },
  ]

  let sent = 0

  for (const { target, hoursAhead } of windows) {
    const windowStart = new Date(target.getTime() - 7.5 * 60 * 1000).toISOString()
    const windowEnd = new Date(target.getTime() + 7.5 * 60 * 1000).toISOString()

    const { data: appointments } = await supabase
      .from('appointments')
      .select('*, treatment:treatments(name), client:clients(full_name, email)')
      .eq('status', 'confirmed')
      .gte('start_at', windowStart)
      .lte('start_at', windowEnd)

    for (const appt of appointments ?? []) {
      const email = (appt as any).client?.email ?? appt.guest_email
      const name = (appt as any).client?.full_name ?? appt.guest_name ?? 'לקוחה'

      if (!email) continue

      const { data: settings } = await supabase
        .from('business_settings')
        .select('business_name')
        .eq('owner_id', appt.owner_id)
        .single()

      await sendReminder({
        to: email,
        guestName: name,
        treatmentName: (appt as any).treatment?.name ?? 'טיפול',
        startAt: appt.start_at,
        businessName: settings?.business_name ?? 'הסטודיו',
        hoursAhead,
      })
      sent++
    }
  }

  return NextResponse.json({ sent })
}
