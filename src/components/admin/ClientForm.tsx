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
  birthDate?: string | Date | null
  customAnswers?: Record<string, string | string[]> | null
}

interface CustomQuestion {
  id: string
  label: string
  type: 'single' | 'multi'
  options: string[]
}

interface Props {
  client?: ClientData
  customQuestions?: CustomQuestion[]
}

export function ClientForm({ client, customQuestions = [] }: Props) {
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
    birthDate: client?.birthDate ? new Date(client.birthDate).toISOString().split('T')[0] : '',
  })
  const [customAnswers, setCustomAnswers] = useState<Record<string, string | string[]>>(client?.customAnswers ?? {})

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function setSingleAnswer(questionId: string, value: string) {
    setCustomAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  function toggleMultiAnswer(questionId: string, value: string) {
    setCustomAnswers(prev => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] as string[] : []
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
      return { ...prev, [questionId]: next }
    })
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
      body: JSON.stringify({ ...form, birthDate: form.birthDate || null, customAnswers }),
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
        <div>
          <label className={labelClass}>תאריך לידה</label>
          <input type="date" value={form.birthDate} onChange={e => set('birthDate', e.target.value)} className={inputClass} dir="ltr" />
          <p className="text-xs text-muted mt-1">לא חובה - שנדע להגיד מזל טוב 🎂</p>
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

      {customQuestions.length > 0 && (
        <div className="space-y-4 pt-2 border-t border-brand-50">
          {customQuestions.map(q => (
            <div key={q.id}>
              <label className={labelClass}>{q.label}</label>
              {q.type === 'single' ? (
                <div className="flex flex-wrap gap-2">
                  {q.options.map(opt => (
                    <label key={opt} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-200 bg-brand-50 text-sm cursor-pointer">
                      <input type="radio" name={`cq-${q.id}`} checked={customAnswers[q.id] === opt} onChange={() => setSingleAnswer(q.id, opt)} className="accent-brand-500" />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {q.options.map(opt => (
                    <label key={opt} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-200 bg-brand-50 text-sm cursor-pointer">
                      <input type="checkbox" checked={Array.isArray(customAnswers[q.id]) && (customAnswers[q.id] as string[]).includes(opt)} onChange={() => toggleMultiAnswer(q.id, opt)} className="accent-brand-500" />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
