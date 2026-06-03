import { prisma } from '@/lib/prisma'
import { SettingsForm } from '@/components/admin/SettingsForm'
import { WorkHoursForm } from '@/components/admin/WorkHoursForm'
import { BlockedTimesManager } from '@/components/admin/BlockedTimesManager'

export default async function SettingsPage() {
  const [settings, workHours, availSettings] = await Promise.all([
    prisma.businessSettings.findFirst(),
    prisma.workHours.findMany({ orderBy: { dayOfWeek: 'asc' } }),
    prisma.availabilitySettings.findFirst(),
  ])

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-brand-900">הגדרות</h1>
      <SettingsForm settings={settings} />
      <WorkHoursForm workHours={workHours} availSettings={availSettings} />
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6">
        <BlockedTimesManager />
      </div>
    </div>
  )
}
