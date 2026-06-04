import { prisma } from '@/lib/prisma'
import { formatCurrency, paymentMethodLabel } from '@/lib/utils'
import { BarChart2, TrendingUp, Users, Scissors } from 'lucide-react'

export default async function ReportsPage() {
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
  const yearStart = new Date(today.getFullYear(), 0, 1)
  const todayStart = new Date(today); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999)

  const [
    todayPayments, monthPayments, yearPayments,
    monthReceipts, yearReceipts,
    monthVisitsCount, cancellationsCount, noShowsCount,
    clientStats, treatmentStats,
  ] = await Promise.all([
    prisma.payment.aggregate({ where: { paidAt: { gte: todayStart, lte: todayEnd } }, _sum: { amount: true } }),
    prisma.payment.findMany({ where: { paidAt: { gte: monthStart, lte: monthEnd } }, select: { amount: true, method: true } }),
    prisma.payment.aggregate({ where: { paidAt: { gte: yearStart } }, _sum: { amount: true } }),
    prisma.receipt.aggregate({ where: { issuedAt: { gte: monthStart, lte: monthEnd }, status: 'active', deletedAt: null }, _sum: { amount: true }, _count: true }),
    prisma.receipt.aggregate({ where: { issuedAt: { gte: yearStart }, status: 'active', deletedAt: null }, _sum: { amount: true }, _count: true }),
    prisma.visit.count({ where: { visitedAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.appointment.count({ where: { status: 'cancelled', createdAt: { gte: monthStart } } }),
    prisma.appointment.count({ where: { status: 'no_show', createdAt: { gte: monthStart } } }),
    prisma.payment.groupBy({ by: ['clientId'], where: { paidAt: { gte: yearStart } }, _sum: { amount: true }, _count: true, orderBy: { _sum: { amount: 'desc' } }, take: 5 }),
    prisma.visit.groupBy({ by: ['treatmentName'], where: { visitedAt: { gte: monthStart, lte: monthEnd } }, _count: true, _sum: { price: true }, orderBy: { _sum: { price: 'desc' } } }),
  ])

  const todayRevenue = todayPayments._sum.amount ?? 0
  const monthRevenue = monthPayments.reduce((s, p) => s + p.amount, 0)
  const yearRevenue = yearPayments._sum.amount ?? 0
  const avgPerVisit = monthVisitsCount ? monthRevenue / monthVisitsCount : 0

  const byMethod: Record<string, number> = {}
  for (const p of monthPayments) { byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount }

  // Enrich top clients with names
  const topClientIds = clientStats.map(c => c.clientId)
  const clientNames = await prisma.client.findMany({ where: { id: { in: topClientIds } }, select: { id: true, fullName: true } })
  const nameMap = Object.fromEntries(clientNames.map(c => [c.id, c.fullName]))

  const monthName = today.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-brand-900">דוחות</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'הכנסות היום', value: formatCurrency(todayRevenue), icon: TrendingUp, color: 'text-green-600 bg-green-50' },
          { label: `הכנסות ${monthName}`, value: formatCurrency(monthRevenue), icon: BarChart2, color: 'text-brand-600 bg-brand-50' },
          { label: 'הכנסות השנה', value: formatCurrency(yearRevenue), icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
          { label: 'ממוצע לטיפול', value: formatCurrency(avgPerVisit), icon: Scissors, color: 'text-amber-600 bg-amber-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 ${s.color}`}><s.icon size={18} /></div>
            <p className="text-2xl font-bold text-brand-900">{s.value}</p>
            <p className="text-sm text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 text-center"><p className="text-3xl font-bold text-brand-900">{monthVisitsCount}</p><p className="text-sm text-muted mt-1">טיפולים החודש</p></div>
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 text-center"><p className="text-3xl font-bold text-amber-600">{cancellationsCount}</p><p className="text-sm text-muted mt-1">ביטולים החודש</p></div>
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 text-center"><p className="text-3xl font-bold text-red-500">{noShowsCount}</p><p className="text-sm text-muted mt-1">אי-הגעה החודש</p></div>
      </div>

      {/* Receipt revenue vs total */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5">
        <h2 className="font-semibold text-brand-900 mb-4 flex items-center gap-2">
          🧾 קבלות — {monthName}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-green-700">{formatCurrency(monthReceipts._sum.amount ?? 0)}</p>
            <p className="text-xs text-muted mt-1">הכנסות מגובות</p>
          </div>
          <div className="bg-brand-50 rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-brand-700">{monthReceipts._count}</p>
            <p className="text-xs text-muted mt-1">קבלות הוצאו</p>
          </div>
          <div className={`rounded-xl p-4 text-center ${monthRevenue - (monthReceipts._sum.amount ?? 0) > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
            <p className={`text-xl font-bold ${monthRevenue - (monthReceipts._sum.amount ?? 0) > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
              {formatCurrency(Math.max(0, monthRevenue - (monthReceipts._sum.amount ?? 0)))}
            </p>
            <p className="text-xs text-muted mt-1">ללא קבלה</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-purple-700">{formatCurrency(yearReceipts._sum.amount ?? 0)}</p>
            <p className="text-xs text-muted mt-1">קבלות השנה</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5">
          <h2 className="font-semibold text-brand-900 mb-4 flex items-center gap-2"><BarChart2 size={16} className="text-brand-400" />הכנסות לפי אמצעי תשלום — {monthName}</h2>
          {Object.keys(byMethod).length === 0 ? <p className="text-muted text-sm">אין נתונים</p> : (
            <div className="space-y-3">
              {Object.entries(byMethod).sort(([, a], [, b]) => b - a).map(([method, amount]) => {
                const pct = monthRevenue > 0 ? (amount / monthRevenue) * 100 : 0
                return (
                  <div key={method}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{paymentMethodLabel(method as any)}</span>
                      <span className="text-brand-600 font-semibold">{formatCurrency(amount)}</span>
                    </div>
                    <div className="h-2 bg-brand-50 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-muted mt-0.5">{pct.toFixed(1)}%</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5">
          <h2 className="font-semibold text-brand-900 mb-4 flex items-center gap-2"><Users size={16} className="text-brand-400" />לקוחות מובילות — השנה</h2>
          {clientStats.length === 0 ? <p className="text-muted text-sm">אין נתונים</p> : (
            <div className="space-y-3">
              {clientStats.map((c, i) => (
                <div key={c.clientId} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-brand-900">{nameMap[c.clientId] ?? '—'}</p>
                    <p className="text-xs text-muted">{c._count} ביקורים</p>
                  </div>
                  <p className="font-bold text-brand-700">{formatCurrency(c._sum.amount ?? 0)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 lg:col-span-2">
          <h2 className="font-semibold text-brand-900 mb-4 flex items-center gap-2"><Scissors size={16} className="text-brand-400" />טיפולים לפי סוג — {monthName}</h2>
          {treatmentStats.length === 0 ? <p className="text-muted text-sm">אין נתונים</p> : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {treatmentStats.map(t => (
                <div key={t.treatmentName} className="bg-brand-50 rounded-xl p-4">
                  <p className="font-semibold text-brand-900 text-sm">{t.treatmentName}</p>
                  <p className="text-2xl font-bold text-brand-600 mt-1">{t._count}</p>
                  <p className="text-xs text-muted">ביקורים · {formatCurrency(t._sum.price ?? 0)} סה״כ</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
