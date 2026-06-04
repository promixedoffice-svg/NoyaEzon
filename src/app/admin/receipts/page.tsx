import { prisma } from '@/lib/prisma'
import { formatDate, formatCurrency, paymentMethodLabel } from '@/lib/utils'
import Link from 'next/link'
import { FileText, Printer } from 'lucide-react'
import { ReceiptsPageClient } from '@/components/admin/ReceiptsPageClient'
import { ReceiptRowActions } from '@/components/admin/ReceiptRowActions'

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>
}) {
  const { show } = await searchParams
  const showDeleted = show === 'deleted'
  const showCancelled = show === 'cancelled'

  const [receipts, activeCount, cancelledCount, deletedCount, clients] = await Promise.all([
    prisma.receipt.findMany({
      where: showDeleted
        ? { deletedAt: { not: null } }
        : showCancelled
          ? { deletedAt: null, status: 'cancelled' }
          : { deletedAt: null, status: 'active' },
      include: { client: { select: { id: true, fullName: true, phone: true, email: true } } },
      orderBy: { receiptNumber: 'desc' },
      take: 100,
    }),
    prisma.receipt.count({ where: { deletedAt: null, status: 'active' } }),
    prisma.receipt.count({ where: { deletedAt: null, status: 'cancelled' } }),
    prisma.receipt.count({ where: { deletedAt: { not: null } } }),
    prisma.client.findMany({ select: { id: true, fullName: true }, orderBy: { fullName: 'asc' }, where: { deletedAt: null } }),
  ])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-900">קבלות</h1>
        <ReceiptsPageClient clients={clients} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Link href="/admin/receipts" className={`px-4 py-2 rounded-xl text-sm font-medium transition ${!show ? 'bg-brand-500 text-white' : 'bg-white border border-brand-100 text-brand-700 hover:bg-brand-50'}`}>
          פעילות ({activeCount})
        </Link>
        <Link href="/admin/receipts?show=cancelled" className={`px-4 py-2 rounded-xl text-sm font-medium transition ${showCancelled ? 'bg-amber-500 text-white' : 'bg-white border border-brand-100 text-brand-700 hover:bg-brand-50'}`}>
          מבוטלות ({cancelledCount})
        </Link>
        <Link href="/admin/receipts?show=deleted" className={`px-4 py-2 rounded-xl text-sm font-medium transition ${showDeleted ? 'bg-red-500 text-white' : 'bg-white border border-brand-100 text-brand-700 hover:bg-brand-50'}`}>
          🗑 סל מחזור ({deletedCount})
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
        {receipts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <FileText className="mx-auto mb-3 text-brand-200" size={40} />
            <p className="text-brand-800 font-medium">אין קבלות כאן</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-50 text-xs text-muted">
                  <th className="text-right px-4 py-3 font-medium">#</th>
                  <th className="text-right px-4 py-3 font-medium">תאריך</th>
                  <th className="text-right px-4 py-3 font-medium">לקוחה</th>
                  <th className="text-right px-4 py-3 font-medium">שירות</th>
                  <th className="text-right px-4 py-3 font-medium">סכום</th>
                  <th className="text-right px-4 py-3 font-medium">תשלום</th>
                  {(showCancelled || showDeleted) && <th className="text-right px-4 py-3 font-medium">סיבה</th>}
                  <th className="text-right px-4 py-3 font-medium">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map(r => (
                  <tr key={r.id} className={`border-b border-brand-50 hover:bg-brand-50/50 transition ${r.deletedAt || r.status === 'cancelled' ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3.5 font-mono font-medium text-brand-700">#{r.receiptNumber}</td>
                    <td className="px-4 py-3.5">{formatDate(r.issuedAt)}</td>
                    <td className="px-4 py-3.5">
                      <Link href={`/admin/clients/${r.client.id}`} className="text-brand-600 hover:text-brand-800 font-medium transition">{r.client.fullName}</Link>
                    </td>
                    <td className="px-4 py-3.5 max-w-[130px] truncate">{r.serviceDescription}</td>
                    <td className="px-4 py-3.5 font-semibold">{formatCurrency(r.amount)}</td>
                    <td className="px-4 py-3.5">{paymentMethodLabel(r.method)}</td>
                    {(showCancelled || showDeleted) && (
                      <td className="px-4 py-3.5 text-muted text-xs max-w-[100px] truncate">
                        {r.cancellationReason ?? '—'}
                      </td>
                    )}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        {!r.deletedAt && (
                          <Link href={`/admin/receipts/${r.id}`} className="flex items-center gap-1 text-brand-500 hover:text-brand-700 text-xs font-medium transition">
                            <Printer size={12} />
                          </Link>
                        )}
                        <ReceiptRowActions
                          receiptId={r.id}
                          receiptNumber={r.receiptNumber}
                          isDeleted={!!r.deletedAt}
                          isCancelled={r.status === 'cancelled'}
                          clientPhone={r.client.phone}
                          clientEmail={r.client.email}
                          amount={r.amount}
                          serviceDescription={r.serviceDescription}
                          clientName={r.client.fullName}
                        />
                      </div>
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
