'use client'

import { useState } from 'react'
import { Check, X, FileText, MessageCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Props {
  appointmentId: string
  clientId: string | null
  clientName: string
  clientPhone?: string | null
  treatmentName: string
  price: number | null
  onComplete: () => void
  onClose: () => void
}

export function CompleteReceiptModal({
  appointmentId, clientId, clientName, clientPhone, treatmentName, price, onComplete, onClose
}: Props) {
  const [step, setStep] = useState<'confirm' | 'receipt' | 'done'>('confirm')
  const [issuedReceiptNumber, setIssuedReceiptNumber] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [receiptForm, setReceiptForm] = useState({
    serviceDescription: treatmentName,
    amount: String(price ?? ''),
    method: 'cash',
  })

  async function handleCompleteOnly() {
    setLoading(true)
    await fetch(`/api/appointments/${appointmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', completedAt: new Date().toISOString() }),
    })
    setLoading(false)
    onComplete()
  }

  async function handleCompleteAndReceipt(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) { await handleCompleteOnly(); return }
    setLoading(true)

    await fetch(`/api/appointments/${appointmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', completedAt: new Date().toISOString() }),
    })

    const receiptRes = await fetch('/api/receipts', {
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
    const receiptData = await receiptRes.json()
    setIssuedReceiptNumber(receiptData.receiptNumber)

    setLoading(false)
    setStep('done')
  }

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>

        {step === 'confirm' && (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check size={26} className="text-green-500" />
            </div>
            <div>
              <h3 className="font-bold text-brand-900 text-lg">סיום טיפול</h3>
              <p className="text-muted text-sm mt-1">{clientName} · {treatmentName}</p>
              {price && <p className="font-semibold text-brand-600 mt-1">{formatCurrency(price)}</p>}
            </div>

            <div className="space-y-2">
              {clientId ? (
                <button
                  onClick={() => setStep('receipt')}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition"
                >
                  <FileText size={16} /> סיים והפק קבלה
                </button>
              ) : (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-xl p-2">לא ניתן להפיק קבלה — לקוחה לא מקושרת לכרטיס</p>
              )}
              <button
                onClick={handleCompleteOnly}
                disabled={loading}
                className="w-full py-2.5 border border-brand-200 text-brand-700 hover:bg-brand-50 font-medium rounded-xl transition text-sm"
              >
                {loading ? 'מסיים...' : 'סיים ללא קבלה'}
              </button>
            </div>
            <button onClick={onClose} className="text-xs text-muted hover:text-brand-600 transition">ביטול</button>
          </div>
        )}

        {step === 'receipt' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-brand-900">הפקת קבלה</h3>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-brand-50 text-muted"><X size={16} /></button>
            </div>
            <form onSubmit={handleCompleteAndReceipt} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">שירות</label>
                <input value={receiptForm.serviceDescription} onChange={e => setReceiptForm(p => ({ ...p, serviceDescription: e.target.value }))}
                  className={inputClass} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-brand-700 mb-1">סכום (₪)</label>
                  <input type="number" value={receiptForm.amount} onChange={e => setReceiptForm(p => ({ ...p, amount: e.target.value }))}
                    className={inputClass} required min="0" step="0.01" dir="ltr" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-700 mb-1">תשלום</label>
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
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={loading}
                  className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-semibold rounded-xl transition text-sm">
                  {loading ? 'מפיקה...' : '✓ סיים והפק קבלה'}
                </button>
                <button type="button" onClick={() => setStep('confirm')}
                  className="px-4 py-3 border border-brand-200 text-brand-700 hover:bg-brand-50 rounded-xl transition text-sm">
                  חזרה
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 'done' && (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check size={26} className="text-green-500" />
            </div>
            <div>
              <h3 className="font-bold text-brand-900">הטיפול הסתיים!</h3>
              <p className="text-sm text-muted mt-1">קבלה #{issuedReceiptNumber} הופקה בהצלחה</p>
            </div>

            {/* Send options */}
            {clientPhone && (
              <a
                href={(() => {
                  const clean = clientPhone.replace(/\D/g, '').replace(/^0/, '972')
                  const msg = encodeURIComponent(`שלום ${clientName}! 💅\nקבלה מספר #${issuedReceiptNumber}\nשירות: ${receiptForm.serviceDescription}\nסכום: ${formatCurrency(parseFloat(receiptForm.amount))}\nתודה על הביקור!`)
                  return `https://wa.me/${clean}?text=${msg}`
                })()}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition text-sm"
              >
                <MessageCircle size={16} /> שלחי קבלה ב-WhatsApp
              </a>
            )}

            <button onClick={onComplete}
              className="w-full py-2.5 border border-brand-200 text-brand-700 hover:bg-brand-50 font-medium rounded-xl transition text-sm">
              סגרי
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
