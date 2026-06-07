import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/admin/Sidebar'
import { BookingFab } from '@/components/admin/BookingFab'
import { TodayTasksBanner } from '@/components/admin/TodayTasksBanner'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth()
  if (!session) redirect('/login')

  const settings = await prisma.businessSettings.findFirst({ select: { businessName: true, logoUrl: true } })

  return (
    <div className="flex min-h-screen bg-brand-50" dir="rtl">
      <Sidebar businessName={settings?.businessName} logoUrl={settings?.logoUrl} />
      {/* pt-14 for mobile top header, pb-20 for bottom nav */}
      <main className="flex-1 min-h-screen pt-14 pb-20 lg:pt-0 lg:pb-0 overflow-x-hidden">
        <div className="max-w-7xl mx-auto p-4 lg:p-6">
          {children}
        </div>
      </main>
      <BookingFab />
      <TodayTasksBanner />
    </div>
  )
}
