import { prisma } from '@/lib/prisma'
import { formatDate, formatCurrency, paymentMethodLabel } from '@/lib/utils'
import Link from 'next/link'
import { TrendingUp } from 'lucide-react'

export default async function PaymentsPage() {
  const today = new Date()
  const todayStart = new Date(today); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999)
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
  const yearStart = new Date(today.getFullYear(), 0, 1)

  const [
    todayAgg, weekAgg, monthAgg, yearAgg,
    monthByMethod,
    payments,
  ] = await Promise.all([
    prisma.payment.aggregate({ where: { paidAt: { gte: todayStart, lte: todayEnd } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { paidAt: { gte: weekStart } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { paidAt: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { paidAt: { gte: yearStart } }, _sum: { amount: true } }),
    prisma.payment.groupBy({
      by: ['method'],
      where: { paidAt: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    }),
    prisma.payment.findMany({
      include: { client: { select: { id: true, fullName: true } } },
      orderBy: { paidAt: 'desc' },
      take: 50,
    }),
  ])

  const monthRevenue = monthAgg._sum.amount ?? 0

  const methodColors: Record<string, string> = {
    cash: 'bg-green-50 text-green-700 border-green-100',
    bit: 'bg-blue-50 text-blue-700 border-blue-100',
    paybox: 'bg-purple-50 text-purple-700 border-purple-100',
    credit: 'bg-amber-50 text-amber-700 border-amber-100',
    transfer: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    check: 'bg-gray-50 text-gray-700 border-gray-100',
  }

  const monthName = today.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-brand-900">תשלומים</h1>

      {/* Period stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'היום', value: todayAgg._sum.amount ?? 0, color: 'bg-green-500' },
          { label: 'השבוע', value: weekAgg._sum.amount ?? 0, color: 'bg-blue-500' },
          { label: monthName, value: monthRevenue, color: 'bg-brand-500' },
          { label: 'השנה', value: yearAgg._sum.amount ?? 0, color: 'bg-purple-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4">
            <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${s.color} mb-2`}>
              <TrendingUp size={16} className="text-white" />
            </div>
            <p className="text-xl font-bold text-brand-900">{formatCurrency(s.value)}</p>
            <p className="text-xs text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* By method this month */}
      {monthByMethod.length > 0 && (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5">
          <h2 className="font-semibold text-brand-900 mb-3 text-sm">לפי אמצעי תשלום — {monthName}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {monthByMethod.map(m => {
              const pct = monthRevenue > 0 ? ((m._sum.amount ?? 0) / monthRevenue * 100).toFixed(0) : 0
              return (
                <div key={m.method} className={`rounded-xl border p-3 ${methodColors[m.method] ?? 'bg-gray-50 text-gray-700 border-gray-100'}`}>
                  <p className="text-xs font-medium opacity-75">{paymentMethodLabel(m.method)}</p>
                  <p className="text-lg font-bold mt-0.5">{formatCurrency(m._sum.amount ?? 0)}</p>
                  <p className="text-xs opacity-60">{pct}%</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Payments list */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-brand-50 flex items-center justify-between">
          <h2 className="font-semibold text-brand-900 text-sm">תשלומים אחרונים</h2>
          <span className="text-xs text-muted">{payments.length} רשומות</span>
        </div>
        {payments.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted">אין תשלומים</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-50 text-xs text-muted">
                  <th className="text-right px-5 py-3 font-medium">תאריך</th>
                  <th className="text-right px-5 py-3 font-medium">לקוחה</th>
                  <th className="text-right px-5 py-3 font-medium">סכום</th>
                  <th className="text-right px-5 py-3 font-medium">אמצעי תשלום</th>
                  <th className="text-right px-5 py-3 font-medium">הערות</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-b border-brand-50 hover:bg-brand-50/50 transition">
                    <td className="px-5 py-3.5">{formatDate(p.paidAt)}</td>
                    <td className="px-5 py-3.5">
                      {p.client ? (
                        <Link href={`/admin/clients/${p.client.id}`} className="text-brand-600 hover:text-brand-800 font-medium transition">
                          {p.client.fullName}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-green-700">{formatCurrency(p.amount)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${methodColors[p.method] ?? 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                        {paymentMethodLabel(p.method)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-muted max-w-xs truncate">{p.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
