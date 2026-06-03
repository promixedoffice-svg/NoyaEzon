import { prisma } from '@/lib/prisma'
import { formatDate, formatCurrency, debtStatusLabel } from '@/lib/utils'
import Link from 'next/link'
import { DebtActions } from '@/components/admin/DebtActions'

export default async function DebtsPage() {
  const debts = await prisma.debt.findMany({
    where: { status: { in: ['open', 'partial'] } },
    include: {
      client: { select: { id: true, fullName: true, phone: true, email: true } },
      visit: { select: { treatmentName: true, visitedAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const totalDebt = debts.reduce((s, d) => s + (d.originalAmount - d.paidAmount), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-900">חובות</h1>
        {totalDebt > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-3 text-center">
            <p className="text-xs text-red-500 mb-0.5">סך חובות פתוחים</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDebt)}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
        {debts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-brand-800 font-medium">אין חובות פתוחים</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-brand-50 text-xs text-muted">
                <th className="text-right px-5 py-3 font-medium">לקוחה</th>
                <th className="text-right px-5 py-3 font-medium">טיפול</th>
                <th className="text-right px-5 py-3 font-medium">סכום</th>
                <th className="text-right px-5 py-3 font-medium">שולם</th>
                <th className="text-right px-5 py-3 font-medium">יתרה</th>
                <th className="text-right px-5 py-3 font-medium">ימים</th>
                <th className="text-right px-5 py-3 font-medium">פעולות</th>
              </tr></thead>
              <tbody>
                {debts.map(d => {
                  const balance = d.originalAmount - d.paidAmount
                  const days = Math.floor((Date.now() - new Date(d.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <tr key={d.id} className="border-b border-brand-50 hover:bg-red-50/20 transition">
                      <td className="px-5 py-4">
                        <Link href={`/admin/clients/${d.client.id}`} className="font-medium text-brand-900 hover:text-brand-600 transition">{d.client.fullName}</Link>
                        {d.client.phone && <p className="text-xs text-muted mt-0.5">{d.client.phone}</p>}
                      </td>
                      <td className="px-5 py-4 text-muted">
                        {d.visit ? <><p>{d.visit.treatmentName}</p><p className="text-xs">{formatDate(d.visit.visitedAt)}</p></> : '—'}
                      </td>
                      <td className="px-5 py-4 font-medium">{formatCurrency(d.originalAmount)}</td>
                      <td className="px-5 py-4 text-green-700">{formatCurrency(d.paidAmount)}</td>
                      <td className="px-5 py-4 font-bold text-red-600">{formatCurrency(balance)}</td>
                      <td className="px-5 py-4"><span className={`text-xs font-medium ${days > 30 ? 'text-red-600' : days > 7 ? 'text-amber-600' : 'text-muted'}`}>{days} ימים</span></td>
                      <td className="px-5 py-4"><DebtActions debtId={d.id} clientId={d.client.id} visitId={d.visitId} originalAmount={d.originalAmount} paidAmount={d.paidAmount} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
