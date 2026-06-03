import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { Sidebar } from '@/components/admin/Sidebar'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth()
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen bg-brand-50" dir="rtl">
      <Sidebar />
      <main className="flex-1 lg:min-h-screen pt-14 lg:pt-0 overflow-x-hidden">
        <div className="max-w-7xl mx-auto p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
