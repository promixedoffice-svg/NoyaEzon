'use client'

import { useState } from 'react'
import { Check, X, FileText, MessageCircle, UserPlus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useBusinessSettings, buildWhatsAppMessage, getFirstName } from '@/lib/useBusinessSettings'

interface Props {
  appointmentId: string
  clientId: string | null
  clientName: string
  clientPhone?: string | null
  guestEmail?: string | null
  treatmentName: string
  price: number | null
  onComplete: () => void
  onClose: () => void
}

type Step = 'confirm' | 'create-client' | 'receipt' | 'done'

export function CompleteReceiptModal({
  appointmentId, clientId: initialClientId, clientName, clientPhone, guestEmail, treatmentName, price, onComplete, onClose
}: Props) {
  const { businessName, ownerName } = useBusinessSettings()
  const [step, setStep] = useState<Step>('confirm')
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(initialClientId)
  const [resolvedClientPhone, setResolvedClientPhone] = useState(clientPhone)
  const [issuedReceiptNumber, setIssuedReceiptNumber] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const [newClient, setNewClient] = useState({
    fullName: clientName,
    phone: clientPhone ?? '',
    email: guestEmail ?? '',
  })

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

  async function handleCreateClient(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: newClient.fullName,
        phone: newClient.phone || null,
        email: newClient.email || null,
      }),
    })
    const client = await res.json()
    // Link appointment to new client
    await fetch(`/api/appointments/${appointmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: client.id }),
    })
    setResolvedClientId(client.id)
    setResolvedClientPhone(newClient.phone || null)
    setLoading(false)
    setStep('receipt')
  }

  async function handleCompleteAndReceipt(e: React.FormEvent) {
    e.preventDefault()
    if (!resolvedClientId) { await handleCompleteOnly(); return }
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
        clientId: resolvedClientId,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Step 1: Confirm completion */}
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
              {resolvedClientId ? (
                /* Client exists — go straight to receipt */
                <button onClick={() => setStep('receipt')}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition">
                  <FileText size={16} /> סיים והפק קבלה
                </button>
              ) : (
                /* Guest — offer to create client card */
                <>
                  <button onClick={() => setStep('create-client')}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition">
                    <UserPlus size={16} /> הוסיפי לכרטיסיות והפיקי קבלה
                  </button>
                  <button onClick={() => setStep('receipt')}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-brand-300 text-brand-700 hover:bg-brand-50 font-medium rounded-xl transition text-sm">
                    <FileText size={14} /> הפיקי קבלה ללא כרטיס
                  </button>
                </>
              )}
              <button onClick={handleCompleteOnly} disabled={loading}
                className="w-full py-2.5 border border-brand-100 text-muted hover:bg-gray-50 font-medium rounded-xl transition text-sm">
                {loading ? 'מסיים...' : 'סיים ללא קבלה'}
              </button>
            </div>
            <button onClick={onClose} className="text-xs text-muted hover:text-brand-600 transition">ביטול</button>
          </div>
        )}

        {/* Step 1b: Create client */}
        {step === 'create-client' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-brand-900 flex items-center gap-2"><UserPlus size={16} /> יצירת כרטיס לקוחה</h3>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-brand-50 text-muted"><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateClient} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">שם מלא *</label>
                <input required value={newClient.fullName} onChange={e => setNewClient(p => ({ ...p, fullName: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">טלפון</label>
                <input type="tel" value={newClient.phone} onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))} className={inputClass} dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">אימייל</label>
                <input type="email" value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))} className={inputClass} dir="ltr" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={loading}
                  className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-semibold rounded-xl transition text-sm">
                  {loading ? 'יוצרת...' : 'צרי כרטיס ← הפיקי קבלה'}
                </button>
                <button type="button" onClick={() => setStep('confirm')}
                  className="px-4 py-3 border border-brand-200 text-brand-700 hover:bg-brand-50 rounded-xl transition text-sm">
                  חזרה
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: Receipt form */}
        {step === 'receipt' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-brand-900">הפקת קבלה</h3>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-brand-50 text-muted"><X size={16} /></button>
            </div>
            {!resolvedClientId && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-3 text-xs text-amber-800">
                ⚠️ הקבלה תופק ללא קישור לכרטיס לקוחה
              </div>
            )}
            <form onSubmit={resolvedClientId ? handleCompleteAndReceipt : async (e) => {
              e.preventDefault()
              // Issue receipt for guest without client card using a temporary flow
              setLoading(true)
              await fetch(`/api/appointments/${appointmentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'completed', completedAt: new Date().toISOString() }),
              })
              setLoading(false)
              onComplete()
            }} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">שירות</label>
                <input value={receiptForm.serviceDescription} onChange={e => setReceiptForm(p => ({ ...p, serviceDescription: e.target.value }))} className={inputClass} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-brand-700 mb-1">סכום (₪)</label>
                  <input type="number" value={receiptForm.amount} onChange={e => setReceiptForm(p => ({ ...p, amount: e.target.value }))} className={inputClass} required min="0" step="0.01" dir="ltr" />
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

        {/* Step 3: Done */}
        {step === 'done' && (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check size={26} className="text-green-500" />
            </div>
            <div>
              <h3 className="font-bold text-brand-900">הטיפול הסתיים!</h3>
              <p className="text-sm text-muted mt-1">קבלה #{issuedReceiptNumber} הופקה בהצלחה</p>
            </div>

            {resolvedClientPhone && (
              <a href={(() => {
                const clean = resolvedClientPhone.replace(/\D/g, '').replace(/^0/, '972')
                const msg = encodeURIComponent(buildWhatsAppMessage({
                  clientFirstName: getFirstName(clientName),
                  type: 'receipt',
                  treatmentName: receiptForm.serviceDescription,
                  amount: formatCurrency(parseFloat(receiptForm.amount)),
                  receiptNumber: issuedReceiptNumber ?? undefined,
                  businessName,
                  ownerName,
                }))
                return `https://wa.me/${clean}?text=${msg}`
              })()} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition text-sm">
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
