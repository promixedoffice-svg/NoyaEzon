import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { BookingPortal } from '@/components/BookingPortal'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.businessSettings.findFirst({ select: { businessName: true, logoUrl: true } })
  return {
    title: settings?.businessName ? `הזמנת תור | ${settings.businessName}` : 'הזמנת תור',
    icons: settings?.logoUrl ? { icon: '/api/logo' } : undefined,
  }
}

export default async function BookPage() {
  const now = new Date()
  const [settings, treatments, addons, workHours, availSettings, blockedTimes, customQuestions] = await Promise.all([
    prisma.businessSettings.findFirst(),
    prisma.treatment.findMany({ where: { isActive: true, bookableOnline: true }, orderBy: { name: 'asc' } }),
    prisma.addon.findMany({ where: { isActive: true }, orderBy: [{ order: 'asc' }, { name: 'asc' }] }),
    prisma.workHours.findMany({ orderBy: { dayOfWeek: 'asc' } }),
    prisma.availabilitySettings.findFirst(),
    prisma.blockedTime.findMany({ where: { endAt: { gte: now } }, orderBy: { startAt: 'asc' } }),
    prisma.customQuestion.findMany({ where: { isActive: true }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }),
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
        logoUrl={settings?.logoUrl ?? null}
        welcomeMessage={settings?.bookingWelcomeMessage ?? null}
        treatments={treatments}
        addons={addons}
        workHours={workHours}
        minBookingHours={availSettings?.minBookingHours ?? 24}
        slotIntervalMinutes={availSettings?.clientSlotIntervalMinutes ?? availSettings?.slotIntervalMinutes ?? 15}
        blockedTimes={blockedTimes.map(b => ({ id: b.id, startAt: b.startAt.toISOString(), endAt: b.endAt.toISOString(), reason: b.reason, isVacation: b.isVacation }))}
        customQuestions={customQuestions.map(q => ({ id: q.id, label: q.label, type: q.type, options: q.options }))}
      />
    </div>
  )
}
