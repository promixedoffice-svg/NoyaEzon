import { prisma } from '@/lib/prisma'
import { formatDate, formatCurrency, paymentMethodLabel } from '@/lib/utils'
import Link from 'next/link'
import { FileText } from 'lucide-react'

export default async function ReceiptsPage() {
  const receipts = await prisma.receipt.findMany({
    include: { client: { select: { id: true, fullName: true } } },
    orderBy: { receiptNumber: 'desc' },
    take: 100,
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-900">קבלות</h1>
        <p className="text-muted text-sm">{receipts.length} קבלות</p>
      </div>
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
        {receipts.length === 0 ? (
          <div className="px-6 py-16 text-center"><FileText className="mx-auto mb-3 text-brand-200" size={40} /><p className="text-brand-800 font-medium">אין קבלות</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-brand-50 text-xs text-muted">
                <th className="text-right px-5 py-3 font-medium">#</th>
                <th className="text-right px-5 py-3 font-medium">תאריך</th>
                <th className="text-right px-5 py-3 font-medium">לקוחה</th>
                <th className="text-right px-5 py-3 font-medium">שירות</th>
                <th className="text-right px-5 py-3 font-medium">סכום</th>
                <th className="text-right px-5 py-3 font-medium">אמצעי תשלום</th>
                <th className="text-right px-5 py-3 font-medium">סטטוס</th>
              </tr></thead>
              <tbody>
                {receipts.map(r => (
                  <tr key={r.id} className={`border-b border-brand-50 hover:bg-brand-50/50 transition ${r.status === 'cancelled' ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-4 font-mono font-medium text-brand-700">#{r.receiptNumber}</td>
                    <td className="px-5 py-4">{formatDate(r.issuedAt)}</td>
                    <td className="px-5 py-4">
                      <Link href={`/admin/clients/${r.client.id}`} className="text-brand-600 hover:text-brand-800 font-medium transition">{r.client.fullName}</Link>
                    </td>
                    <td className="px-5 py-4 max-w-xs truncate">{r.serviceDescription}</td>
                    <td className="px-5 py-4 font-semibold">{formatCurrency(r.amount)}</td>
                    <td className="px-5 py-4">{paymentMethodLabel(r.method)}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 line-through'}`}>
                        {r.status === 'active' ? 'פעילה' : 'מבוטלת'}
                      </span>
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
