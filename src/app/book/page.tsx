import { prisma } from '@/lib/prisma'
import { BookingPortal } from '@/components/BookingPortal'

export const dynamic = 'force-dynamic'

export default async function BookPage() {
  const now = new Date()
  const [settings, treatments, addons, workHours, availSettings, blockedTimes] = await Promise.all([
    prisma.businessSettings.findFirst(),
    prisma.treatment.findMany({ where: { isActive: true, bookableOnline: true }, orderBy: { name: 'asc' } }),
    prisma.addon.findMany({ where: { isActive: true }, orderBy: [{ order: 'asc' }, { name: 'asc' }] }),
    prisma.workHours.findMany({ orderBy: { dayOfWeek: 'asc' } }),
    prisma.availabilitySettings.findFirst(),
    prisma.blockedTime.findMany({ where: { endAt: { gte: now } }, orderBy: { startAt: 'asc' } }),
  ])

  if (!treatments.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100 flex items-center justify-center p-4">
        <div className="text-center">
          <span className="text-5xl">💅</span>
          <h1 className="text-2xl font-bold text-brand-900 mt-4">{settings?.businessName ?? 'הסטודיו'}</h1>
          <p className="text-muted mt-2">מערכת ההזמנות אינה פעילה כרגע</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100" dir="rtl">
      <BookingPortal
        businessName={settings?.businessName ?? 'הסטודיו'}
        treatments={treatments}
        addons={addons}
        workHours={workHours}
        minBookingHours={availSettings?.minBookingHours ?? 24}
        slotIntervalMinutes={availSettings?.clientSlotIntervalMinutes ?? availSettings?.slotIntervalMinutes ?? 15}
        blockedTimes={blockedTimes.map(b => ({ id: b.id, startAt: b.startAt.toISOString(), endAt: b.endAt.toISOString(), reason: b.reason, isVacation: b.isVacation }))}
      />
    </div>
  )
}
