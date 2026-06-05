import { prisma } from '@/lib/prisma'
import { SettingsForm } from '@/components/admin/SettingsForm'
import { WorkHoursForm } from '@/components/admin/WorkHoursForm'
import { BlockedTimesManager } from '@/components/admin/BlockedTimesManager'
import { NotificationSettings } from '@/components/admin/NotificationSettings'
import { FabSettings } from '@/components/admin/FabSettings'
import { Bell, Smartphone } from 'lucide-react'

export default async function SettingsPage() {
  const [settings, workHours, availSettings] = await Promise.all([
    prisma.businessSettings.findFirst(),
    prisma.workHours.findMany({ orderBy: { dayOfWeek: 'asc' } }),
    prisma.availabilitySettings.findFirst(),
  ])

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-brand-900">הגדרות</h1>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6">
        <h2 className="font-semibold text-brand-900 mb-4 flex items-center gap-2">
          <Bell size={16} /> התראות
        </h2>
        <NotificationSettings />
      </div>

      {/* Mobile */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6">
        <h2 className="font-semibold text-brand-900 mb-4 flex items-center gap-2">
          <Smartphone size={16} /> מובייל
        </h2>
        <FabSettings />
      </div>

      <SettingsForm settings={settings} />
      <WorkHoursForm workHours={workHours} availSettings={availSettings} />

      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6">
        <BlockedTimesManager />
      </div>
    </div>
  )
}
