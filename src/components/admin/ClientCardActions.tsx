'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, RotateCcw, FileText, ChevronDown } from 'lucide-react'
import { formatCurrency, paymentMethodLabel } from '@/lib/utils'

interface Visit {
  id: string
  treatmentName: string
  visitedAt: string | Date
  price: number
}

interface Props {
  clientId: string
  clientName: string
  lastVisit: Visit | null
  isDeleted: boolean
}

export function ClientCardActions({ clientId, clientName, lastVisit, isDeleted }: Props) {
  const router = useRouter()
  const [showReceiptForm, setShowReceiptForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  // Receipt form state
  const [receiptForm, setReceiptForm] = useState({
    serviceDescription: lastVisit?.treatmentName ?? '',
    amount: String(lastVisit?.price ?? ''),
    method: 'cash' as string,
  })

  async function handleSoftDelete() {
    setLoading(true)
    await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deletedAt: new Date().toISOString() }),
    })
    setLoading(false)
    router.push('/admin/clients')
    router.refresh()
  }

  async function handleRestore() {
    setLoading(true)
    await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deletedAt: null }),
    })
    setLoading(false)
    router.refresh()
  }

  async function handleIssueReceipt(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/receipts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        clientName,
        serviceDescription: receiptForm.serviceDescription,
        amount: parseFloat(receiptForm.amount),
        method: receiptForm.method,
      }),
    })
    setLoading(false)
    setShowReceiptForm(false)
    router.refresh()
  }

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"

  if (isDeleted) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-xl font-medium">🗑 בסל מחזור</span>
        <button onClick={handleRestore} disabled={loading}
          className="flex items-center gap-1.5 text-sm bg-green-50 hover:bg-green-100 text-green-700 font-medium px-4 py-2 rounded-xl transition">
          <RotateCcw size={14} /> שחזור
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Issue receipt */}
      <button
        onClick={() => setShowReceiptForm(!showReceiptForm)}
        className="flex items-center gap-1.5 text-sm bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2 rounded-xl transition"
      >
        <FileText size={15} /> הפקת קבלה
        <ChevronDown size={13} className={`transition-transform ${showReceiptForm ? 'rotate-180' : ''}`} />
      </button>

      {/* Delete to recycle bin */}
      {showDeleteConfirm ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-600">להעביר לסל מחזור?</span>
          <button onClick={handleSoftDelete} disabled={loading}
            className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium transition">
            {loading ? '...' : 'אישור'}
          </button>
          <button onClick={() => setShowDeleteConfirm(false)} className="text-xs text-muted hover:text-brand-600 transition">ביטול</button>
        </div>
      ) : (
        <button onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center gap-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-600 font-medium px-3 py-2 rounded-xl transition">
          <Trash2 size={14} /> סל מחזור
        </button>
      )}

      {/* Receipt form */}
      {showReceiptForm && (
        <div className="w-full mt-2 bg-brand-50 border border-brand-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-brand-900 mb-3">הפקת קבלה ל-{clientName}</p>
          <form onSubmit={handleIssueReceipt} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-brand-700 mb-1">תיאור שירות *</label>
              <input
                required
                value={receiptForm.serviceDescription}
                onChange={e => setReceiptForm(p => ({ ...p, serviceDescription: e.target.value }))}
                className={inputClass}
                placeholder="לק ג׳ל, מניקור..."
              />
            </div>
            {lastVisit && (
              <button type="button"
                onClick={() => setReceiptForm(p => ({ ...p, serviceDescription: lastVisit.treatmentName, amount: String(lastVisit.price) }))}
                className="text-xs text-brand-500 hover:text-brand-700 transition">
                ← מלאי מהטיפול האחרון: {lastVisit.treatmentName} ({formatCurrency(lastVisit.price)})
              </button>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">סכום (₪) *</label>
                <input required type="number" value={receiptForm.amount}
                  onChange={e => setReceiptForm(p => ({ ...p, amount: e.target.value }))}
                  className={inputClass} min="0" step="0.01" dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">אמצעי תשלום</label>
                <select value={receiptForm.method} onChange={e => setReceiptForm(p => ({ ...p, method: e.target.value }))} className={inputClass}>
                  <option value="cash">מזומן</option>
                  <option value="bit">ביט</option>
                  <option value="paybox">פייבוקס</option>
                  <option value="credit">אשראי</option>
                  <option value="transfer">העברה</option>
                  <option value="check">צ׳ק</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-semibold rounded-xl transition text-sm">
                {loading ? 'מפיקה...' : 'הפקת קבלה'}
              </button>
              <button type="button" onClick={() => setShowReceiptForm(false)}
                className="px-4 py-2.5 border border-brand-200 text-brand-700 hover:bg-white font-medium rounded-xl transition text-sm">
                ביטול
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
