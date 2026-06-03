import { Resend } from 'resend'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? 're_placeholder')
}
const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@noyagayaezon.co.il'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function sendAppointmentConfirmed({
  to,
  guestName,
  treatmentName,
  startAt,
  businessName,
}: {
  to: string
  guestName: string
  treatmentName: string
  startAt: string
  businessName: string
}) {
  const dateStr = format(new Date(startAt), "EEEE, d MMMM yyyy 'בשעה' HH:mm", { locale: he })

  await getResend().emails.send({
    from: `${businessName} <${FROM}>`,
    to,
    subject: `✅ תורך אושר — ${treatmentName}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #c0403c;">שלום ${guestName}!</h2>
        <p>תורך אושר בהצלחה 🎉</p>
        <div style="background: #fdf6f6; padding: 16px; border-radius: 12px; margin: 16px 0; border-right: 4px solid #d4605c;">
          <p><strong>טיפול:</strong> ${treatmentName}</p>
          <p><strong>מועד:</strong> ${dateStr}</p>
        </div>
        <p style="color: #9b8585; font-size: 13px;">
          מחפשת לשנות את התור? נא לפנות ישירות לסטודיו.
        </p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #f0dede;">
        <p style="color: #9b8585; font-size: 12px; text-align: center;">${businessName}</p>
      </div>
    `,
  })
}

export async function sendAppointmentRejected({
  to,
  guestName,
  treatmentName,
  businessName,
}: {
  to: string
  guestName: string
  treatmentName: string
  businessName: string
}) {
  await getResend().emails.send({
    from: `${businessName} <${FROM}>`,
    to,
    subject: `בקשת התור — ${treatmentName}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #c0403c;">שלום ${guestName},</h2>
        <p>לצערנו לא ניתן לאשר את בקשת התור שלך ל<strong>${treatmentName}</strong>.</p>
        <p>נשמח לשדך לך מועד אחר. נא לפנות ישירות לסטודיו.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #f0dede;">
        <p style="color: #9b8585; font-size: 12px; text-align: center;">${businessName}</p>
      </div>
    `,
  })
}

export async function sendReminder({
  to,
  guestName,
  treatmentName,
  startAt,
  businessName,
  hoursAhead,
}: {
  to: string
  guestName: string
  treatmentName: string
  startAt: string
  businessName: string
  hoursAhead: number
}) {
  const dateStr = format(new Date(startAt), "EEEE, d MMMM 'בשעה' HH:mm", { locale: he })
  const timeLabel = hoursAhead === 24 ? 'מחר' : `בעוד ${hoursAhead} שעות`

  await getResend().emails.send({
    from: `${businessName} <${FROM}>`,
    to,
    subject: `תזכורת: תורך ${timeLabel} — ${treatmentName}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #c0403c;">תזכורת תור 💅</h2>
        <p>שלום ${guestName},</p>
        <p>רק מזכירים לך שיש לך תור ${timeLabel}!</p>
        <div style="background: #fdf6f6; padding: 16px; border-radius: 12px; margin: 16px 0; border-right: 4px solid #d4605c;">
          <p><strong>טיפול:</strong> ${treatmentName}</p>
          <p><strong>מועד:</strong> ${dateStr}</p>
        </div>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #f0dede;">
        <p style="color: #9b8585; font-size: 12px; text-align: center;">${businessName}</p>
      </div>
    `,
  })
}
