import { prisma } from '@/lib/prisma'
import { formatDate, formatCurrency, paymentMethodLabel } from '@/lib/utils'
import Link from 'next/link'

export default async function PaymentsPage() {
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)

  const [payments, monthStats] = await Promise.all([
    prisma.payment.findMany({
      include: { client: { select: { id: true, fullName: true } } },
      orderBy: { paidAt: 'desc' },
      take: 50,
    }),
    prisma.payment.groupBy({
      by: ['method'],
      where: { paidAt: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
  ])

  const totalMonth = monthStats.reduce((s, r) => s + (r._sum.amount ?? 0), 0)

  const methodColors: Record<string, string> = {
    cash: 'bg-green-50 text-green-700',
    bit: 'bg-blue-50 text-blue-700',
    paybox: 'bg-purple-50 text-purple-700',
    credit: 'bg-amber-50 text-amber-700',
    transfer: 'bg-cyan-50 text-cyan-700',
    check: 'bg-gray-50 text-gray-700',
  }

  const monthName = today.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-brand-900">תשלומים</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div className="bg-brand-500 text-white rounded-2xl p-4 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-xs text-brand-100 mb-1">סך הכנסות {monthName}</p>
          <p className="text-2xl font-bold">{formatCurrency(totalMonth)}</p>
        </div>
        {monthStats.map(r => (
          <div key={r.method} className={`rounded-2xl p-4 border border-brand-100 shadow-sm ${methodColors[r.method] ?? 'bg-white text-brand-700'}`}>
            <p className="text-xs opacity-75 mb-1">{paymentMethodLabel(r.method as any)}</p>
            <p className="text-xl font-bold">{formatCurrency(r._sum.amount ?? 0)}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-brand-50">
          <h2 className="font-semibold text-brand-900">תשלומים אחרונים</h2>
        </div>
        {payments.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted">אין תשלומים</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-brand-50 text-xs text-muted">
                <th className="text-right px-6 py-3 font-medium">תאריך</th>
                <th className="text-right px-6 py-3 font-medium">לקוחה</th>
                <th className="text-right px-6 py-3 font-medium">סכום</th>
                <th className="text-right px-6 py-3 font-medium">אמצעי תשלום</th>
              </tr></thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-b border-brand-50 hover:bg-brand-50/50 transition">
                    <td className="px-6 py-4">{formatDate(p.paidAt)}</td>
                    <td className="px-6 py-4">
                      {p.client ? (
                        <Link href={`/admin/clients/${p.client.id}`} className="text-brand-600 hover:text-brand-800 font-medium transition">{p.client.fullName}</Link>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 font-semibold text-green-700">{formatCurrency(p.amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${methodColors[p.method] ?? 'bg-gray-100 text-gray-600'}`}>{paymentMethodLabel(p.method)}</span>
                    </td>
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
