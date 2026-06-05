import { prisma } from '@/lib/prisma'
import { formatCurrency, paymentMethodLabel } from '@/lib/utils'
import { TrendingUp, TrendingDown, Users, Scissors } from 'lucide-react'
import Link from 'next/link'

export default async function ReportsPage() {
  const today = new Date()
  const year = today.getFullYear()
  const monthStart = new Date(year, today.getMonth(), 1)
  const monthEnd = new Date(year, today.getMonth() + 1, 0, 23, 59, 59)
  const yearStart = new Date(year, 0, 1)
  const todayStart = new Date(today); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999)

  // Monthly breakdown for the whole year
  const monthlyData = await Promise.all(
    Array.from({ length: 12 }, (_, m) => {
      const start = new Date(year, m, 1)
      const end = new Date(year, m + 1, 0, 23, 59, 59)
      return Promise.all([
        prisma.payment.aggregate({ where: { paidAt: { gte: start, lte: end } }, _sum: { amount: true } }),
        prisma.expense.aggregate({ where: { date: { gte: start, lte: end } }, _sum: { amount: true } }),
        prisma.receipt.aggregate({ where: { issuedAt: { gte: start, lte: end }, status: 'active', deletedAt: null }, _sum: { amount: true }, _count: true }),
      ]).then(([income, expenses, receipts]) => ({
        month: m,
        income: income._sum.amount ?? 0,
        expenses: expenses._sum.amount ?? 0,
        receipts: receipts._sum.amount ?? 0,
        receiptsCount: receipts._count,
        profit: (income._sum.amount ?? 0) - (expenses._sum.amount ?? 0),
      }))
    })
  )

  const [
    todayPayments, monthPayments, yearPayments,
    monthReceipts, yearReceipts,
    monthVisitsCount, cancellationsCount, noShowsCount,
    clientStats, treatmentStats,
    yearExpenses,
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
    prisma.expense.aggregate({ where: { date: { gte: yearStart } }, _sum: { amount: true } }),
  ])

  const todayRevenue = todayPayments._sum.amount ?? 0
  const monthRevenue = monthPayments.reduce((s, p) => s + p.amount, 0)
  const yearRevenue = yearPayments._sum.amount ?? 0
  const avgPerVisit = monthVisitsCount ? monthRevenue / monthVisitsCount : 0
  const yearExpenseTotal = yearExpenses._sum.amount ?? 0
  const yearProfit = yearRevenue - yearExpenseTotal

  const monthCurrent = monthlyData[today.getMonth()]
  const monthExpenseTotal = monthCurrent.expenses
  const monthProfit = monthCurrent.profit

  const byMethod: Record<string, number> = {}
  for (const p of monthPayments) { byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount }

  const topClientIds = clientStats.map(c => c.clientId)
  const clientNames = await prisma.client.findMany({ where: { id: { in: topClientIds } }, select: { id: true, fullName: true } })
  const nameMap = Object.fromEntries(clientNames.map(c => [c.id, c.fullName]))

  const monthName = today.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
  const MONTH_NAMES = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
  const maxMonthlyIncome = Math.max(...monthlyData.map(m => m.income), 1)

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-brand-900">דוחות {year}</h1>

      {/* Year summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'הכנסות השנה', value: formatCurrency(yearRevenue), icon: TrendingUp, color: 'text-green-600 bg-green-50' },
          { label: 'הוצאות השנה', value: formatCurrency(yearExpenseTotal), icon: TrendingDown, color: 'text-red-600 bg-red-50' },
          { label: 'רווח נקי השנה', value: formatCurrency(yearProfit), icon: yearProfit >= 0 ? TrendingUp : TrendingDown, color: yearProfit >= 0 ? 'text-brand-600 bg-brand-50' : 'text-red-700 bg-red-100' },
          { label: 'ממוצע לטיפול', value: formatCurrency(avgPerVisit), icon: Scissors, color: 'text-amber-600 bg-amber-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4">
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-2.5 ${s.color}`}><s.icon size={18} /></div>
            <p className="text-xl font-bold text-brand-900">{s.value}</p>
            <p className="text-xs text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Monthly income vs expenses chart */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4 sm:p-5">
        <h2 className="font-semibold text-brand-900 mb-4">הכנסות לעומת הוצאות — {year}</h2>

        {/* Mobile: simplified card list */}
        <div className="sm:hidden space-y-2">
          {monthlyData.map(m => {
            const isCurrent = m.month === today.getMonth()
            if (m.income === 0 && m.expenses === 0 && !isCurrent) return null
            const barWidth = m.income > 0 ? Math.max((m.income / maxMonthlyIncome) * 100, 3) : 0
            const expenseBarWidth = m.expenses > 0 ? Math.max((m.expenses / maxMonthlyIncome) * 100, 3) : 0
            return (
              <div key={m.month} className={`rounded-xl p-3 ${isCurrent ? 'bg-brand-50 ring-1 ring-brand-200' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-brand-900 text-sm">
                    {MONTH_NAMES[m.month]}
                    {isCurrent && <span className="mr-1.5 text-xs bg-brand-500 text-white px-1.5 py-0.5 rounded-md">עכשיו</span>}
                  </span>
                  <span className={`font-bold text-sm ${m.profit > 0 ? 'text-green-700' : m.profit < 0 ? 'text-red-600' : 'text-muted'}`}>
                    {m.income > 0 || m.expenses > 0 ? (m.profit >= 0 ? '+' : '') + formatCurrency(m.profit) : '—'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div><span className="text-muted">הכנסות: </span><span className="font-medium text-green-700">{m.income > 0 ? formatCurrency(m.income) : '—'}</span></div>
                  <div><span className="text-muted">הוצאות: </span><span className="font-medium text-red-500">{m.expenses > 0 ? formatCurrency(m.expenses) : '—'}</span></div>
                </div>
                {(m.income > 0 || m.expenses > 0) && (
                  <div className="space-y-1">
                    {m.income > 0 && <div className="h-1.5 bg-green-100 rounded-full overflow-hidden"><div className="h-full bg-green-400 rounded-full" style={{ width: `${barWidth}%` }} /></div>}
                    {m.expenses > 0 && <div className="h-1.5 bg-red-100 rounded-full overflow-hidden"><div className="h-full bg-red-400 rounded-full" style={{ width: `${expenseBarWidth}%` }} /></div>}
                  </div>
                )}
              </div>
            )
          })}
          <div className="rounded-xl p-3 bg-brand-100 border border-brand-200">
            <div className="flex justify-between items-center">
              <span className="font-bold text-brand-900 text-sm">סה״כ {year}</span>
              <span className={`font-bold text-base ${yearProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{yearProfit >= 0 ? '+' : ''}{formatCurrency(yearProfit)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs mt-1">
              <div><span className="text-muted">הכנסות: </span><span className="font-bold text-green-700">{formatCurrency(yearRevenue)}</span></div>
              <div><span className="text-muted">הוצאות: </span><span className="font-bold text-red-500">{formatCurrency(yearExpenseTotal)}</span></div>
            </div>
          </div>
        </div>

        {/* Desktop: full table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-brand-50 text-xs text-muted">
                <th className="text-right pb-2 font-medium">חודש</th>
                <th className="text-right pb-2 font-medium text-green-600">הכנסות</th>
                <th className="text-right pb-2 font-medium text-red-500">הוצאות</th>
                <th className="text-right pb-2 font-medium">רווח נקי</th>
                <th className="text-right pb-2 font-medium text-brand-500">🧾 קבלות</th>
                <th className="pb-2 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map(m => {
                const isCurrent = m.month === today.getMonth()
                const barWidth = m.income > 0 ? Math.max((m.income / maxMonthlyIncome) * 100, 3) : 0
                const expenseBarWidth = m.expenses > 0 ? Math.max((m.expenses / maxMonthlyIncome) * 100, 3) : 0
                return (
                  <tr key={m.month} className={`border-b border-brand-50 ${isCurrent ? 'bg-brand-50/50' : 'hover:bg-gray-50'} transition`}>
                    <td className="py-3 font-medium text-brand-900">
                      {MONTH_NAMES[m.month]}
                      {isCurrent && <span className="mr-1 text-xs bg-brand-500 text-white px-1.5 py-0.5 rounded-md">עכשיו</span>}
                    </td>
                    <td className="py-3 text-green-700 font-medium">{m.income > 0 ? formatCurrency(m.income) : '—'}</td>
                    <td className="py-3 text-red-500">{m.expenses > 0 ? formatCurrency(m.expenses) : '—'}</td>
                    <td className={`py-3 font-bold ${m.profit > 0 ? 'text-green-700' : m.profit < 0 ? 'text-red-600' : 'text-muted'}`}>
                      {m.income > 0 || m.expenses > 0 ? (m.profit >= 0 ? '+' : '') + formatCurrency(m.profit) : '—'}
                    </td>
                    <td className="py-3 text-brand-600">{m.receiptsCount > 0 ? `${m.receiptsCount} (${formatCurrency(m.receipts)})` : '—'}</td>
                    <td className="py-3">
                      <div className="space-y-1">
                        {m.income > 0 && (
                          <div className="h-2 bg-green-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-400 rounded-full" style={{ width: `${barWidth}%` }} />
                          </div>
                        )}
                        {m.expenses > 0 && (
                          <div className="h-2 bg-red-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-400 rounded-full" style={{ width: `${expenseBarWidth}%` }} />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-brand-200 bg-brand-50/50">
                <td className="py-3 font-bold text-brand-900">סה״כ</td>
                <td className="py-3 font-bold text-green-700">{formatCurrency(yearRevenue)}</td>
                <td className="py-3 font-bold text-red-500">{formatCurrency(yearExpenseTotal)}</td>
                <td className={`py-3 font-bold text-lg ${yearProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {yearProfit >= 0 ? '+' : ''}{formatCurrency(yearProfit)}
                </td>
                <td className="py-3 font-bold text-brand-600">{yearReceipts._count} ({formatCurrency(yearReceipts._sum.amount ?? 0)})</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* This month details */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-brand-900">{monthVisitsCount}</p>
          <p className="text-sm text-muted mt-1">טיפולים ב{monthName}</p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-amber-600">{cancellationsCount}</p>
          <p className="text-sm text-muted mt-1">ביטולים</p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-red-500">{noShowsCount}</p>
          <p className="text-sm text-muted mt-1">אי-הגעה</p>
        </div>
      </div>

      {/* Receipt breakdown this month */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5">
        <h2 className="font-semibold text-brand-900 mb-3">🧾 קבלות — {monthName}</h2>
        <div className="grid grid-cols-3 gap-3">
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
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Payment methods */}
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5">
          <h2 className="font-semibold text-brand-900 mb-4">הכנסות לפי אמצעי תשלום — {monthName}</h2>
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

        {/* Top clients */}
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5">
          <h2 className="font-semibold text-brand-900 mb-4 flex items-center gap-2">
            <Users size={16} className="text-brand-400" /> לקוחות מובילות — {year}
          </h2>
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

        {/* Treatments */}
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 lg:col-span-2">
          <h2 className="font-semibold text-brand-900 mb-4 flex items-center gap-2">
            <Scissors size={16} className="text-brand-400" /> טיפולים לפי סוג — {monthName}
          </h2>
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
