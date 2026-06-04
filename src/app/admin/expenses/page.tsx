import { prisma } from '@/lib/prisma'
import { ExpensesManager } from '@/components/admin/ExpensesManager'

export default async function ExpensesPage() {
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
  const yearStart = new Date(today.getFullYear(), 0, 1)

  const [monthExpenses, yearTotal] = await Promise.all([
    prisma.expense.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
      orderBy: { date: 'desc' },
    }),
    prisma.expense.aggregate({
      where: { date: { gte: yearStart } },
      _sum: { amount: true },
    }),
  ])

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold text-brand-900">הוצאות</h1>
      <ExpensesManager
        initialExpenses={monthExpenses}
        yearTotal={yearTotal._sum.amount ?? 0}
        currentMonth={`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`}
      />
    </div>
  )
}
