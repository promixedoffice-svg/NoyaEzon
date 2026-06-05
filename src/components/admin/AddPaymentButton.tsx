'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'

interface Client { id: string; fullName: string }

export function AddPaymentButton({ clients }: { clients: Client[] }) {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ clientId: '', amount: '', method: 'cash', notes: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: form.clientId, amount: parseFloat(form.amount), method: form.method, notes: form.notes || null }),
    })
    setLoading(false)
    setShow(false)
    setForm({ clientId: '', amount: '', method: 'cash', notes: '' })
    router.refresh()
  }

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"

  return (
    <>
      <button onClick={() => setShow(true)} className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2.5 rounded-xl transition text-sm">
        <Plus size={16} /> תשלום חדש
      </button>

      {show && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40" onClick={() => setShow(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-brand-900">רישום תשלום</h3>
              <button onClick={() => setShow(false)} className="p-1 rounded-lg hover:bg-brand-50 text-muted"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">לקוחה</label>
                <select value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))} className={inputClass}>
                  <option value="">בחרי לקוחה...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-brand-700 mb-1">סכום (₪) *</label>
                  <input required type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className={inputClass} min="0" step="0.01" dir="ltr" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-700 mb-1">אמצעי תשלום</label>
                  <select value={form.method} onChange={e => setForm(p => ({ ...p, method: e.target.value }))} className={inputClass}>
                    <option value="cash">מזומן</option><option value="bit">ביט</option>
                    <option value="paybox">פייבוקס</option><option value="credit">אשראי</option>
                    <option value="transfer">העברה</option><option value="check">צ׳ק</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">הערות</label>
                <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={inputClass} placeholder="פרטים..." />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={loading} className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-semibold rounded-xl transition text-sm">
                  {loading ? 'שומרת...' : 'רשמי תשלום'}
                </button>
                <button type="button" onClick={() => setShow(false)} className="px-4 py-3 border border-brand-200 text-brand-700 hover:bg-brand-50 rounded-xl transition text-sm">ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
