'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { X } from 'lucide-react'

interface Treatment { id: string; name: string; defaultPrice: number; durationMinutes: number; bufferMinutes: number; color: string }
interface Client { id: string; fullName: string; phone: string | null }
interface Props { treatments: Treatment[]; clients: Client[]; defaultTime?: Date | null; onClose: () => void; onSaved: () => void }

export function AppointmentModal({ treatments, clients, defaultTime, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const defaultDate = defaultTime ? format(defaultTime, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  const defaultHour = defaultTime ? format(defaultTime, 'HH:mm') : '10:00'

  const [form, setForm] = useState({ clientId: '', treatmentId: treatments[0]?.id ?? '', date: defaultDate, startTime: defaultHour, notes: '', price: String(treatments[0]?.defaultPrice ?? 0) })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (field === 'treatmentId') {
      const t = treatments.find(t => t.id === value)
      if (t) setForm(prev => ({ ...prev, treatmentId: value, price: String(t.defaultPrice) }))
    }
  }

  const selectedTreatment = treatments.find(t => t.id === form.treatmentId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const startAt = new Date(`${form.date}T${form.startTime}:00`)
    const endAt = new Date(startAt.getTime() + (selectedTreatment?.durationMinutes ?? 60) * 60000)

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: form.clientId || null, treatmentId: form.treatmentId || null, startAt: startAt.toISOString(), endAt: endAt.toISOString(), price: parseFloat(form.price) || null, notes: form.notes || null, status: 'confirmed' }),
    })

    setLoading(false)
    if (!res.ok) { setError('שגיאה ביצירת תור'); return }
    onSaved()
  }

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
  const labelClass = "block text-sm font-medium text-brand-800 mb-1.5"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-50">
          <h2 className="font-bold text-brand-900 text-lg">תור חדש</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-brand-50 text-muted transition"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className={labelClass}>לקוחה</label>
            <select value={form.clientId} onChange={e => set('clientId', e.target.value)} className={inputClass}>
              <option value="">בחרי לקוחה...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
            </select>
          </div>
          <div><label className={labelClass}>סוג טיפול *</label>
            <select value={form.treatmentId} onChange={e => set('treatmentId', e.target.value)} required className={inputClass}>
              {treatments.map(t => <option key={t.id} value={t.id}>{t.name} ({t.durationMinutes} דק׳)</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>תאריך *</label><input type="date" required value={form.date} onChange={e => set('date', e.target.value)} className={inputClass} dir="ltr" /></div>
            <div><label className={labelClass}>שעה *</label><input type="time" required value={form.startTime} onChange={e => set('startTime', e.target.value)} className={inputClass} dir="ltr" /></div>
          </div>
          {selectedTreatment && <div className="bg-brand-50 rounded-xl px-4 py-3 text-sm text-brand-700">משך: {selectedTreatment.durationMinutes} דקות + {selectedTreatment.bufferMinutes} דק׳ מרווח</div>}
          <div><label className={labelClass}>מחיר (₪)</label><input type="number" value={form.price} onChange={e => set('price', e.target.value)} className={inputClass} min="0" step="0.01" dir="ltr" /></div>
          <div><label className={labelClass}>הערות</label><textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={inputClass} /></div>
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 border border-red-100">{error}</div>}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-semibold rounded-xl transition">{loading ? 'שומרת...' : 'יצירת תור'}</button>
            <button type="button" onClick={onClose} className="px-5 py-3 border border-brand-200 text-brand-700 hover:bg-brand-50 font-medium rounded-xl transition">ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}
