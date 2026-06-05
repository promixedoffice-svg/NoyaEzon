import { prisma } from '@/lib/prisma'
import { formatDate, formatCurrency, paymentMethodLabel } from '@/lib/utils'
import Link from 'next/link'
import { AddPaymentButton } from '@/components/admin/AddPaymentButton'

export default async function PaymentsPage() {
  const [payments, clients] = await Promise.all([
    prisma.payment.findMany({
      include: { client: { select: { id: true, fullName: true } } },
      orderBy: { paidAt: 'desc' },
      take: 100,
    }),
    prisma.client.findMany({
      where: { deletedAt: null },
      select: { id: true, fullName: true },
      orderBy: { fullName: 'asc' },
    }),
  ])

  const methodColors: Record<string, string> = {
    cash: 'bg-green-50 text-green-700 border-green-100',
    bit: 'bg-blue-50 text-blue-700 border-blue-100',
    paybox: 'bg-purple-50 text-purple-700 border-purple-100',
    credit: 'bg-amber-50 text-amber-700 border-amber-100',
    transfer: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    check: 'bg-gray-50 text-gray-700 border-gray-100',
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-900">תשלומים</h1>
        <div className="flex items-center gap-2">
          <Link href="/admin/reports" className="text-sm text-muted hover:text-brand-600 transition">
            סיכומים בדוחות ←
          </Link>
          <AddPaymentButton clients={clients} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-brand-50 flex items-center justify-between">
          <h2 className="font-semibold text-brand-900 text-sm">היסטוריית תשלומים</h2>
          <span className="text-xs text-muted">{payments.length} רשומות</span>
        </div>
        {payments.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted">
            <p className="text-4xl mb-3">💳</p>
            <p>אין תשלומים עדיין</p>
          </div>
        ) : (
          <>
            {/* Mobile: card layout */}
            <div className="md:hidden divide-y divide-brand-50">
              {payments.map(p => (
                <div key={p.id} className="px-4 py-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    {p.client ? (
                      <Link href={`/admin/clients/${p.client.id}`} className="font-medium text-brand-900 hover:text-brand-600 transition block truncate">
                        {p.client.fullName}
                      </Link>
                    ) : <span className="text-muted text-sm">—</span>}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted">{formatDate(p.paidAt)}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium border ${methodColors[p.method] ?? 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                        {paymentMethodLabel(p.method)}
                      </span>
                    </div>
                    {p.notes && <p className="text-xs text-muted italic mt-0.5 truncate">{p.notes}</p>}
                  </div>
                  <span className="font-bold text-green-700 text-sm shrink-0">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>

            {/* Desktop: table layout */}
            <div className="hidden md:block overflow-x-auto">
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
          </>
        )}
      </div>
    </div>
  )
}
