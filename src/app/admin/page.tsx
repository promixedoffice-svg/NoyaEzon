import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDate, formatTime, appointmentStatusColor, appointmentStatusLabel } from '@/lib/utils'
import Link from 'next/link'
import { Users, Calendar, AlertCircle, TrendingUp, FileText, Receipt } from 'lucide-react'
import { PendingApprovals } from '@/components/admin/PendingApprovals'
import { MissingReceiptsAlert } from '@/components/admin/MissingReceiptsAlert'

export default async function DashboardPage() {
  const today = new Date()
  const todayStart = new Date(today); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)

  const [
    totalClients,
    todayAppointments,
    pendingAppointments,
    openDebts,
    monthPayments,
    monthReceipts,
    upcomingAppointments,
    completedWithoutReceipt,
  ] = await Promise.all([
    prisma.client.count({ where: { deletedAt: null } }),
    prisma.appointment.findMany({
      where: { startAt: { gte: todayStart, lte: todayEnd }, status: { not: 'cancelled' } },
      include: { client: { select: { fullName: true } }, treatment: { select: { name: true, color: true } } },
      orderBy: { startAt: 'asc' },
    }),
    prisma.appointment.findMany({
      where: { status: 'pending' },
      include: { treatment: { select: { name: true, color: true } } },
      orderBy: { startAt: 'asc' },
    }),
    prisma.debt.findMany({ where: { status: { in: ['open', 'partial'] } }, select: { originalAmount: true, paidAmount: true } }),
    prisma.payment.aggregate({ where: { paidAt: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } }),
    prisma.receipt.aggregate({ where: { issuedAt: { gte: monthStart, lte: monthEnd }, status: 'active', deletedAt: null }, _sum: { amount: true } }),
    prisma.appointment.findMany({
      where: { startAt: { gt: today }, status: 'confirmed' },
      include: { client: { select: { fullName: true } }, treatment: { select: { name: true, color: true } } },
      orderBy: { startAt: 'asc' },
      take: 4,
    }),
    // Completed appointments with no receipt in last 30 days
    prisma.appointment.findMany({
      where: {
        status: 'completed',
        completedAt: { gte: new Date(Date.now() - 30 * 24 * 3600000) },
        client: { receipts: { none: {} } },
        clientId: { not: null },
      },
      include: {
        client: { select: { id: true, fullName: true } },
        treatment: { select: { name: true } },
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
    }),
  ])

  const totalDebt = openDebts.reduce((s, d) => s + (d.originalAmount - d.paidAmount), 0)
  const monthRevenue = monthPayments._sum.amount ?? 0
  const monthReceiptRevenue = monthReceipts._sum.amount ?? 0

  const missingReceipts = completedWithoutReceipt.map(a => ({
    id: a.id,
    startAt: a.startAt,
    price: a.price,
    clientName: a.client?.fullName ?? 'לקוחה',
    treatmentName: a.treatment?.name ?? 'טיפול',
    clientId: a.clientId,
  }))

  const hebrewDate = today.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">שלום 👋</h1>
        <p className="text-muted text-sm mt-0.5">{hebrewDate}</p>
      </div>

      {/* Pending approvals */}
      {pendingAppointments.length > 0 && <PendingApprovals appointments={pendingAppointments} />}

      {/* Missing receipts alert */}
      {missingReceipts.length > 0 && <MissingReceiptsAlert appointments={missingReceipts} />}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'לקוחות', value: totalClients, icon: Users, color: 'bg-blue-50 text-blue-600', href: '/admin/clients' },
          { label: 'תורים היום', value: todayAppointments.length, icon: Calendar, color: 'bg-brand-50 text-brand-600', href: '/admin/calendar' },
          { label: 'הכנסות החודש', value: formatCurrency(monthRevenue), icon: TrendingUp, color: 'bg-green-50 text-green-600', href: '/admin/reports' },
          { label: 'חובות פתוחים', value: formatCurrency(totalDebt), icon: AlertCircle, color: 'bg-red-50 text-red-600', href: '/admin/debts' },
        ].map(stat => (
          <Link key={stat.label} href={stat.href} className="group">
            <div className="bg-white rounded-2xl p-4 border border-brand-100 shadow-sm hover:shadow-md transition-all group-hover:-translate-y-0.5">
              <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${stat.color} mb-2.5`}>
                <stat.icon size={18} />
              </div>
              <p className="text-2xl font-bold text-brand-900">{stat.value}</p>
              <p className="text-xs text-muted mt-0.5">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Receipt revenue this month */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-brand-900 flex items-center gap-2 text-sm">
            <FileText size={15} className="text-brand-400" /> הכנסות מגובות קבלות — החודש
          </h2>
          <Link href="/admin/receipts" className="text-xs text-brand-500 hover:text-brand-700 transition">לכל הקבלות ←</Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-green-700">{formatCurrency(monthReceiptRevenue)}</p>
            <p className="text-xs text-muted mt-0.5">הוצאו קבלות</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${monthRevenue - monthReceiptRevenue > 0 ? 'bg-amber-50' : 'bg-brand-50'}`}>
            <p className={`text-lg font-bold ${monthRevenue - monthReceiptRevenue > 0 ? 'text-amber-600' : 'text-brand-600'}`}>
              {formatCurrency(Math.max(0, monthRevenue - monthReceiptRevenue))}
            </p>
            <p className="text-xs text-muted mt-0.5">ללא קבלה</p>
          </div>
        </div>
      </div>

      {/* Today */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-50">
          <h2 className="font-semibold text-brand-900 text-sm">תורים היום</h2>
          <Link href="/admin/calendar" className="text-xs text-brand-500 hover:text-brand-700 transition">יומן ←</Link>
        </div>
        {todayAppointments.length === 0 ? (
          <div className="px-6 py-8 text-center text-muted">
            <Calendar className="mx-auto mb-2 opacity-30" size={28} />
            <p className="text-sm">אין תורים היום</p>
          </div>
        ) : (
          <ul className="divide-y divide-brand-50">
            {todayAppointments.map(appt => (
              <li key={appt.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-1 h-9 rounded-full shrink-0" style={{ backgroundColor: appt.treatment?.color ?? '#d4605c' }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-brand-900 text-sm truncate">{appt.client?.fullName ?? appt.guestName ?? 'לקוחה'}</p>
                  <p className="text-xs text-muted">{appt.treatment?.name}</p>
                </div>
                <div className="text-left shrink-0">
                  <p className="text-sm font-semibold text-brand-700">{formatTime(appt.startAt)}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${appointmentStatusColor(appt.status)}`}>
                    {appointmentStatusLabel(appt.status)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Upcoming */}
      {upcomingAppointments.length > 0 && (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-brand-50">
            <h2 className="font-semibold text-brand-900 text-sm">תורים קרובים ✅</h2>
          </div>
          <ul className="divide-y divide-brand-50">
            {upcomingAppointments.map(appt => (
              <li key={appt.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="shrink-0 text-center w-12">
                  <p className="text-xs text-muted">{formatDate(appt.startAt)}</p>
                  <p className="text-sm font-bold text-brand-700">{formatTime(appt.startAt)}</p>
                </div>
                <div className="w-1 h-9 rounded-full shrink-0" style={{ backgroundColor: appt.treatment?.color ?? '#d4605c' }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-brand-900 text-sm truncate">{appt.client?.fullName ?? appt.guestName}</p>
                  <p className="text-xs text-muted">{appt.treatment?.name}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
