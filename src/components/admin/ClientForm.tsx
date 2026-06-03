'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ClientData {
  id?: string
  fullName: string
  phone?: string | null
  email?: string | null
  city?: string | null
  address?: string | null
  notes?: string | null
  preferences?: string | null
  sensitivities?: string | null
  status: string
}

interface Props {
  client?: ClientData
}

export function ClientForm({ client }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    fullName: client?.fullName ?? '',
    phone: client?.phone ?? '',
    email: client?.email ?? '',
    city: client?.city ?? '',
    address: client?.address ?? '',
    notes: client?.notes ?? '',
    preferences: client?.preferences ?? '',
    sensitivities: client?.sensitivities ?? '',
    status: client?.status ?? 'new',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const url = client?.id ? `/api/clients/${client.id}` : '/api/clients'
    const method = client?.id ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error ?? 'שגיאה בשמירה'); return }

    router.push(`/admin/clients/${data.id}`)
    router.refresh()
  }

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
  const labelClass = "block text-sm font-medium text-brand-800 mb-1.5"

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>שם מלא *</label>
          <input required value={form.fullName} onChange={e => set('fullName', e.target.value)} className={inputClass} placeholder="שם פרטי + משפחה" />
        </div>
        <div>
          <label className={labelClass}>טלפון</label>
          <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputClass} placeholder="050-0000000" dir="ltr" />
        </div>
        <div>
          <label className={labelClass}>אימייל</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputClass} placeholder="email@example.com" dir="ltr" />
        </div>
        <div>
          <label className={labelClass}>עיר</label>
          <input value={form.city} onChange={e => set('city', e.target.value)} className={inputClass} placeholder="עיר מגורים" />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>כתובת</label>
          <input value={form.address} onChange={e => set('address', e.target.value)} className={inputClass} placeholder="רחוב, מספר, עיר" />
        </div>
        <div>
          <label className={labelClass}>סטטוס</label>
          <select value={form.status} onChange={e => set('status', e.target.value)} className={inputClass}>
            <option value="new">חדשה</option>
            <option value="active">פעילה</option>
            <option value="inactive">לא פעילה</option>
            <option value="debt">חייבת</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>הערות כלליות</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className={inputClass} placeholder="הערות חופשיות..." />
      </div>
      <div>
        <label className={labelClass}>העדפות אישיות</label>
        <textarea value={form.preferences} onChange={e => set('preferences', e.target.value)} rows={2} className={inputClass} placeholder="צבעים, סגנונות, העדפות..." />
      </div>
      <div>
        <label className={labelClass}>רגישויות ואלרגיות</label>
        <textarea value={form.sensitivities} onChange={e => set('sensitivities', e.target.value)} rows={2} className={inputClass} placeholder="אלרגיות, רגישויות לחומרים..." />
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 border border-red-100">{error}</div>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-semibold rounded-xl transition">
          {loading ? 'שומרת...' : client ? 'שמירת שינויים' : 'יצירת לקוחה'}
        </button>
        <button type="button" onClick={() => router.back()} className="px-6 py-3 border border-brand-200 text-brand-700 hover:bg-brand-50 font-medium rounded-xl transition">ביטול</button>
      </div>
    </form>
  )
}
