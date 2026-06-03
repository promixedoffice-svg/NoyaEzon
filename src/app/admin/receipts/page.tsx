import { prisma } from '@/lib/prisma'
import { formatDate, formatCurrency, paymentMethodLabel } from '@/lib/utils'
import Link from 'next/link'
import { FileText, Printer, Plus } from 'lucide-react'
import { ReceiptsPageClient } from '@/components/admin/ReceiptsPageClient'

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>
}) {
  const { show } = await searchParams
  const showCancelled = show === 'cancelled'

  const [receipts, activeCount, cancelledCount, clients] = await Promise.all([
    prisma.receipt.findMany({
      where: { status: showCancelled ? 'cancelled' : 'active' },
      include: { client: { select: { id: true, fullName: true } } },
      orderBy: { receiptNumber: 'desc' },
      take: 100,
    }),
    prisma.receipt.count({ where: { status: 'active' } }),
    prisma.receipt.count({ where: { status: 'cancelled' } }),
    prisma.client.findMany({ select: { id: true, fullName: true }, orderBy: { fullName: 'asc' } }),
  ])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-900">קבלות</h1>
        <ReceiptsPageClient clients={clients} />
      </div>

      <div className="flex gap-2">
        <Link href="/admin/receipts"
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${!showCancelled ? 'bg-brand-500 text-white' : 'bg-white border border-brand-100 text-brand-700 hover:bg-brand-50'}`}>
          פעילות ({activeCount})
        </Link>
        <Link href="/admin/receipts?show=cancelled"
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${showCancelled ? 'bg-red-500 text-white' : 'bg-white border border-brand-100 text-brand-700 hover:bg-brand-50'}`}>
          🗑 מבוטלות ({cancelledCount})
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
        {receipts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <FileText className="mx-auto mb-3 text-brand-200" size={40} />
            <p className="text-brand-800 font-medium">{showCancelled ? 'אין קבלות מבוטלות' : 'אין קבלות'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-50 text-xs text-muted">
                  <th className="text-right px-5 py-3 font-medium">#</th>
                  <th className="text-right px-5 py-3 font-medium">תאריך</th>
                  <th className="text-right px-5 py-3 font-medium">לקוחה</th>
                  <th className="text-right px-5 py-3 font-medium">שירות</th>
                  <th className="text-right px-5 py-3 font-medium">סכום</th>
                  <th className="text-right px-5 py-3 font-medium">תשלום</th>
                  {showCancelled && <th className="text-right px-5 py-3 font-medium">סיבה</th>}
                  <th className="text-right px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {receipts.map(r => (
                  <tr key={r.id} className={`border-b border-brand-50 hover:bg-brand-50/50 transition ${r.status === 'cancelled' ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-4 font-mono font-medium text-brand-700">#{r.receiptNumber}</td>
                    <td className="px-5 py-4">{formatDate(r.issuedAt)}</td>
                    <td className="px-5 py-4">
                      <Link href={`/admin/clients/${r.client.id}`} className="text-brand-600 hover:text-brand-800 font-medium transition">{r.client.fullName}</Link>
                    </td>
                    <td className="px-5 py-4 max-w-[150px] truncate">{r.serviceDescription}</td>
                    <td className="px-5 py-4 font-semibold">{formatCurrency(r.amount)}</td>
                    <td className="px-5 py-4">{paymentMethodLabel(r.method)}</td>
                    {showCancelled && <td className="px-5 py-4 text-muted text-xs">{r.cancellationReason ?? '—'}</td>}
                    <td className="px-5 py-4">
                      <Link href={`/admin/receipts/${r.id}`} className="flex items-center gap-1 text-brand-500 hover:text-brand-700 text-xs font-medium transition whitespace-nowrap">
                        <Printer size={13} /> הדפסה
                      </Link>
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
