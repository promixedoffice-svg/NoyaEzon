'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, FileText, UserPlus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

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

export function CompleteReceiptModal({
  appointmentId, clientId: initialClientId, clientName, clientPhone, guestEmail, treatmentName, price, onComplete, onClose
}: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'confirm' | 'create-client'>('confirm')
  const [loading, setLoading] = useState(false)
  const [newClient, setNewClient] = useState({
    fullName: clientName,
    phone: clientPhone ?? '',
    email: guestEmail ?? '',
  })

  async function patchComplete() {
    await fetch(`/api/appointments/${appointmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', completedAt: new Date().toISOString() }),
    })
  }

  async function handleCompleteOnly() {
    setLoading(true)
    await patchComplete()
    setLoading(false)
    onComplete()
  }

  async function navigateToReceipt(clientId: string | null) {
    await patchComplete()
    const params = new URLSearchParams({ new: '1' })
    if (clientId) params.set('clientId', clientId)
    params.set('clientName', clientName)
    params.set('service', treatmentName)
    if (price) params.set('amount', String(price))
    router.push(`/admin/receipts?${params.toString()}`)
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
    await fetch(`/api/appointments/${appointmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: client.id }),
    })
    await navigateToReceipt(client.id)
    setLoading(false)
  }

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

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
              {initialClientId ? (
                <button
                  onClick={() => { setLoading(true); navigateToReceipt(initialClientId) }}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-semibold rounded-xl transition"
                >
                  <FileText size={16} /> {loading ? 'מעבד...' : 'סיים והפק קבלה'}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setStep('create-client')}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition"
                  >
                    <UserPlus size={16} /> הוסיפי לכרטיסיות והפיקי קבלה
                  </button>
                  <button
                    onClick={() => { setLoading(true); navigateToReceipt(null) }}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-brand-300 text-brand-700 hover:bg-brand-50 font-medium rounded-xl transition text-sm"
                  >
                    <FileText size={14} /> {loading ? 'מעבד...' : 'הפיקי קבלה ללא כרטיס'}
                  </button>
                </>
              )}
              <button
                onClick={handleCompleteOnly}
                disabled={loading}
                className="w-full py-2.5 border border-brand-100 text-muted hover:bg-gray-50 font-medium rounded-xl transition text-sm"
              >
                {loading ? 'מסיים...' : 'סיים ללא קבלה'}
              </button>
            </div>
            <button onClick={onClose} className="text-xs text-muted hover:text-brand-600 transition">ביטול</button>
          </div>
        )}

        {/* Step 2: Create client */}
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
      </div>
    </div>
  )
}
