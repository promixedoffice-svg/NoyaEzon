import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendAppointmentConfirmed, sendAppointmentRejected } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { appointmentId, action } = await req.json()

  if (!appointmentId || !['confirm', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: appt } = await supabase
    .from('appointments')
    .select('*, treatment:treatments(name), client:clients(email, full_name)')
    .eq('id', appointmentId)
    .eq('owner_id', user.id)
    .single()

  if (!appt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: settings } = await supabase
    .from('business_settings')
    .select('business_name')
    .eq('owner_id', user.id)
    .single()

  const businessName = settings?.business_name ?? 'הסטודיו'
  const guestEmail = (appt as any).client?.email ?? appt.guest_email
  const guestName = (appt as any).client?.full_name ?? appt.guest_name ?? 'לקוחה'

  if (action === 'confirm') {
    await supabase
      .from('appointments')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', appointmentId)

    if (guestEmail) {
      await sendAppointmentConfirmed({
        to: guestEmail,
        guestName,
        treatmentName: (appt as any).treatment?.name ?? 'טיפול',
        startAt: appt.start_at,
        businessName,
      })
    }
  } else {
    await supabase
      .from('appointments')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', appointmentId)

    if (guestEmail) {
      await sendAppointmentRejected({
        to: guestEmail,
        guestName,
        treatmentName: (appt as any).treatment?.name ?? 'טיפול',
        businessName,
      })
    }
  }

  return NextResponse.json({ success: true })
}
