import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { formatDate, formatCurrency, paymentMethodLabel } from '@/lib/utils'
import { ReceiptActions } from '@/components/admin/ReceiptActions'

export default async function ReceiptPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: { client: { select: { fullName: true, phone: true, email: true } } },
  })
  if (!receipt) notFound()

  const settings = await prisma.businessSettings.findFirst()
  const addonsList = Array.isArray(receipt.addons) ? (receipt.addons as { name: string; price: number }[]) : []
  const addonsTotal = addonsList.reduce((s, a) => s + (a.price ?? 0), 0)
  const baseAmount = receipt.amount + receipt.discountAmount - addonsTotal

  return (
    <div className="max-w-2xl space-y-4">
      {/* Actions (no-print) */}
      <div className="flex items-center gap-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="bg-brand-500 hover:bg-brand-600 text-white font-medium px-5 py-2.5 rounded-xl transition text-sm"
        >
          🖨️ הדפסה
        </button>
        {receipt.status === 'active' && (
          <ReceiptActions receiptId={receipt.id} receiptNumber={receipt.receiptNumber} />
        )}
        <a href="/admin/receipts" className="text-sm text-muted hover:text-brand-600 transition">
          ← חזרה לקבלות
        </a>
      </div>

      {/* Receipt */}
      <div
        id="receipt"
        className={`bg-white rounded-2xl border border-brand-100 shadow-sm p-8 print:shadow-none print:border-none ${receipt.status === 'cancelled' ? 'opacity-60' : ''}`}
        dir="rtl"
      >
        {receipt.status === 'cancelled' && (
          <div className="text-center text-red-500 font-bold text-xl border-2 border-red-400 rounded-xl py-2 mb-6 rotate-[-2deg]">
            ⚠️ קבלה מבוטלת
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-brand-900">
              {settings?.businessName || 'העסק שלי'}
            </h1>
            {settings?.ownerName && <p className="text-muted text-sm">{settings.ownerName}</p>}
            {settings?.address && <p className="text-muted text-sm">{settings.address}</p>}
            {settings?.phone && <p className="text-muted text-sm">{settings.phone}</p>}
            {settings?.businessNumber && (
              <p className="text-muted text-sm">עוסק מורשה: {settings.businessNumber}</p>
            )}
          </div>
          <div className="text-left">
            <p className="text-3xl font-bold text-brand-500">קבלה</p>
            <p className="text-muted text-sm mt-1">מספר: <span className="font-bold text-brand-900">#{receipt.receiptNumber}</span></p>
            <p className="text-muted text-sm">תאריך: {formatDate(receipt.issuedAt)}</p>
          </div>
        </div>

        {/* Client */}
        <div className="bg-brand-50 rounded-xl p-4 mb-6">
          <p className="text-xs text-muted uppercase font-semibold mb-2">לקוחה</p>
          <p className="font-semibold text-brand-900">{receipt.clientName}</p>
          {receipt.client?.phone && <p className="text-sm text-muted">{receipt.client.phone}</p>}
        </div>

        {/* Service */}
        <table className="w-full mb-6">
          <thead>
            <tr className="border-b-2 border-brand-200">
              <th className="text-right pb-2 text-sm font-semibold text-brand-800">שירות</th>
              <th className="text-left pb-2 text-sm font-semibold text-brand-800">סכום</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-brand-50">
              <td className="py-3 text-brand-900">{receipt.serviceDescription}</td>
              <td className="py-3 text-left font-semibold text-brand-900">{formatCurrency(baseAmount)}</td>
            </tr>
            {addonsList.map((a, i) => (
              <tr key={i} className="border-b border-brand-50">
                <td className="py-2 text-muted text-sm">+ {a.name}</td>
                <td className="py-2 text-left text-sm text-muted">{formatCurrency(a.price)}</td>
              </tr>
            ))}
            {receipt.discountLabel && receipt.discountAmount > 0 && (
              <tr className="border-b border-brand-50">
                <td className="py-2 text-amber-700 text-sm">{receipt.discountLabel}</td>
                <td className="py-2 text-left text-sm text-amber-700">-{formatCurrency(receipt.discountAmount)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-4 font-bold text-brand-900 text-lg">סה״כ לתשלום</td>
              <td className="pt-4 text-left font-bold text-brand-500 text-xl">{formatCurrency(receipt.amount)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Payment */}
        <div className="bg-brand-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-muted">
            שולם ב: <span className="font-semibold text-brand-800">{paymentMethodLabel(receipt.method)}</span>
          </p>
        </div>

        {/* Footer */}
        {settings?.receiptFooterText && (
          <p className="text-center text-muted text-sm mt-8 pt-4 border-t border-brand-100">
            {settings.receiptFooterText}
          </p>
        )}
      </div>
    </div>
  )
}
