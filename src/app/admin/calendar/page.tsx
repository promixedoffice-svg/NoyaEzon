import { prisma } from '@/lib/prisma'
import { CalendarView } from '@/components/admin/CalendarView'

export default async function CalendarPage() {
  const [treatments, clients, addons, availSettings] = await Promise.all([
    prisma.treatment.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.client.findMany({ select: { id: true, fullName: true, phone: true }, orderBy: { fullName: 'asc' } }),
    prisma.addon.findMany({ where: { isActive: true }, orderBy: [{ order: 'asc' }, { name: 'asc' }] }),
    prisma.availabilitySettings.findFirst(),
  ])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-brand-900">יומן</h1>
      <CalendarView treatments={treatments} clients={clients} addons={addons} slotIntervalMinutes={availSettings?.slotIntervalMinutes ?? 15} />
    </div>
  )
}
