import { prisma } from '@/lib/prisma'
import { formatDate, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { DebtsPageClient } from '@/components/admin/DebtsPageClient'

export default async function DebtsPage() {
  const [debts, closedDebts, clients] = await Promise.all([
    prisma.debt.findMany({
      where: { status: { in: ['open', 'partial'] } },
      include: {
        client: { select: { id: true, fullName: true, phone: true, email: true } },
        visit: { select: { treatmentName: true, visitedAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.debt.count({ where: { status: 'closed' } }),
    prisma.client.findMany({
      where: { deletedAt: null },
      select: { id: true, fullName: true },
      orderBy: { fullName: 'asc' },
    }),
  ])

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

      <DebtsPageClient debts={debts} clients={clients} closedCount={closedDebts} />
    </div>
  )
}
