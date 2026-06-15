import { prisma } from '@/lib/prisma'
import { SettingsForm } from '@/components/admin/SettingsForm'
import { WorkHoursForm } from '@/components/admin/WorkHoursForm'
import { BlockedTimesCalendar } from '@/components/admin/BlockedTimesCalendar'
import { NotificationSettings } from '@/components/admin/NotificationSettings'
import { FabSettings } from '@/components/admin/FabSettings'
import { NavOrderSettings } from '@/components/admin/NavOrderSettings'
import { GoogleIntegrationSettings } from '@/components/admin/GoogleIntegrationSettings'
import { CustomQuestionsManager } from '@/components/admin/CustomQuestionsManager'
import { GallerySettings } from '@/components/admin/GallerySettings'
import { isGoogleConfigured, getServiceAccountEmail } from '@/lib/google'
import { Bell, Smartphone, LayoutGrid, RefreshCw, ListChecks, Image as ImageIcon } from 'lucide-react'

export default async function SettingsPage() {
  const [settings, workHours, availSettings, googleSettings, customQuestions, galleryImages] = await Promise.all([
    prisma.businessSettings.findFirst({ select: { id: true, businessName: true, ownerName: true, businessNumber: true, phone: true, email: true, address: true, logoUrl: true, bookingWelcomeMessage: true, receiptStartingNumber: true, receiptFooterText: true, taskReminderMinutes: true } }),
    prisma.workHours.findMany({ orderBy: { dayOfWeek: 'asc' } }),
    prisma.availabilitySettings.findFirst(),
    prisma.businessSettings.findFirst({ select: { googleSheetId: true, googleCalendarId: true, googleSheetsBackupEnabled: true, googleCalendarSyncEnabled: true } }),
    prisma.customQuestion.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }),
    prisma.galleryImage.findMany({ orderBy: { order: 'asc' }, select: { id: true, order: true } }),
  ])

  return (
    <div className="space-y-4 sm:space-y-6 max-w-2xl">
      <h1 className="text-xl sm:text-2xl font-bold text-brand-900">הגדרות</h1>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4 sm:p-6">
        <h2 className="font-semibold text-brand-900 mb-4 flex items-center gap-2">
          <Bell size={16} /> התראות
        </h2>
        <NotificationSettings />
      </div>

      {/* Mobile FAB */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4 sm:p-6">
        <h2 className="font-semibold text-brand-900 mb-4 flex items-center gap-2">
          <Smartphone size={16} /> מובייל
        </h2>
        <FabSettings />
      </div>

      {/* Nav order */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4 sm:p-6">
        <h2 className="font-semibold text-brand-900 mb-4 flex items-center gap-2">
          <LayoutGrid size={16} /> סדר ניווט
        </h2>
        <NavOrderSettings />
      </div>

      <SettingsForm settings={settings} />

      {/* Photo gallery */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4 sm:p-6">
        <h2 className="font-semibold text-brand-900 mb-4 flex items-center gap-2">
          <ImageIcon size={16} /> גלריית עבודות
        </h2>
        <GallerySettings images={galleryImages} />
      </div>

      <WorkHoursForm workHours={workHours} availSettings={availSettings} />

      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4 sm:p-6">
        <BlockedTimesCalendar />
      </div>

      {/* Custom intake questions */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4 sm:p-6">
        <h2 className="font-semibold text-brand-900 mb-4 flex items-center gap-2">
          <ListChecks size={16} /> שאלון ללקוחה חדשה
        </h2>
        <CustomQuestionsManager questions={customQuestions} />
      </div>

      {/* Google integration */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4 sm:p-6">
        <h2 className="font-semibold text-brand-900 mb-4 flex items-center gap-2">
          <RefreshCw size={16} /> גיבוי וסנכרון Google
        </h2>
        <GoogleIntegrationSettings settings={googleSettings} serviceAccountEmail={getServiceAccountEmail()} isConfigured={isGoogleConfigured()} />
      </div>
    </div>
  )
}
