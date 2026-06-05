'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

interface Client { id: string; fullName: string }

interface DefaultValues {
  clientId?: string
  clientName?: string
  service?: string
  amount?: string
}

export function AddReceiptForm({
  clients,
  defaultValues,
  onClose,
}: {
  clients: Client[]
  defaultValues?: DefaultValues | null
  onClose: () => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    clientId: defaultValues?.clientId ?? '',
    serviceDescription: defaultValues?.service ?? '',
    amount: defaultValues?.amount ?? '',
    method: 'cash' as const,
  })

  function set(field: string, value: string) { setForm(p => ({ ...p, [field]: value })) }

  const selectedClient = clients.find(c => c.id === form.clientId)
  const clientName = selectedClient?.fullName ?? defaultValues?.clientName ?? ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clientId || !form.serviceDescription || !form.amount) return
    setLoading(true); setError('')

    const res = await fetch('/api/receipts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: form.clientId,
        serviceDescription: form.serviceDescription,
        amount: parseFloat(form.amount),
        method: form.method,
        clientName,
      }),
    })

    setLoading(false)
    if (!res.ok) { setError('שגיאה בהפקת קבלה'); return }
    router.push('/admin/receipts')
    onClose()
  }

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
  const labelClass = "block text-sm font-medium text-brand-800 mb-1.5"

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-50 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-brand-900">הפקת קבלה</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-brand-50 text-muted transition"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelClass}>לקוחה *</label>
            <select value={form.clientId} onChange={e => set('clientId', e.target.value)} required className={inputClass}>
              <option value="">בחרי לקוחה...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>תיאור שירות *</label>
            <input
              value={form.serviceDescription}
              onChange={e => set('serviceDescription', e.target.value)}
              required
              className={inputClass}
              placeholder="לק ג׳ל, מניקור..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>סכום (₪) *</label>
              <input
                type="number"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                required
                className={inputClass}
                min="0"
                step="0.01"
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelClass}>אמצעי תשלום</label>
              <select value={form.method} onChange={e => set('method', e.target.value)} className={inputClass}>
                <option value="cash">מזומן</option>
                <option value="bit">ביט</option>
                <option value="paybox">פייבוקס</option>
                <option value="credit">אשראי</option>
                <option value="transfer">העברה</option>
                <option value="check">צ׳ק</option>
              </select>
            </div>
          </div>
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 border border-red-100">{error}</div>}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-semibold rounded-xl transition">
              {loading ? 'מפיקה...' : 'הפקת קבלה'}
            </button>
            <button type="button" onClick={onClose} className="px-5 py-3 border border-brand-200 text-brand-700 hover:bg-brand-50 font-medium rounded-xl transition">ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}
