'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { Plus, Edit, Trash2, Check } from 'lucide-react'

interface Treatment {
  id: string
  name: string
  description: string | null
  defaultPrice: number
  durationMinutes: number
  bufferMinutes: number
  isActive: boolean
  color: string
  studentDiscountEnabled: boolean
  studentDiscountPercent: number
}

const COLORS = ['#d4605c', '#c084fc', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e', '#8b5cf6', '#06b6d4']

const defaultForm = { name: '', description: '', defaultPrice: 0, durationMinutes: 60, bufferMinutes: 15, isActive: true, color: COLORS[0], studentDiscountEnabled: false, studentDiscountPercent: 0 }

export function TreatmentsManager({ treatments: initial }: { treatments: Treatment[] }) {
  const router = useRouter()
  const [treatments, setTreatments] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Treatment | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function startNew() { setForm(defaultForm); setEditing(null); setShowForm(true) }
  function startEdit(t: Treatment) {
    setForm({ name: t.name, description: t.description ?? '', defaultPrice: t.defaultPrice, durationMinutes: t.durationMinutes, bufferMinutes: t.bufferMinutes, isActive: t.isActive, color: t.color, studentDiscountEnabled: t.studentDiscountEnabled, studentDiscountPercent: t.studentDiscountPercent })
    setEditing(t); setShowForm(true)
  }
  function set(field: string, value: string | number | boolean) { setForm(prev => ({ ...prev, [field]: value })) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const url = editing ? `/api/treatments/${editing.id}` : '/api/treatments'
    const method = editing ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'שגיאה'); return }
    if (editing) { setTreatments(prev => prev.map(t => t.id === editing.id ? data : t)) }
    else { setTreatments(prev => [...prev, data]) }
    setShowForm(false); setEditing(null)
  }

  async function toggleActive(t: Treatment) {
    const res = await fetch(`/api/treatments/${t.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !t.isActive }) })
    const data = await res.json()
    if (res.ok) setTreatments(prev => prev.map(tr => tr.id === t.id ? data : tr))
  }

  async function handleDelete(t: Treatment) {
    if (!confirm(`למחוק את "${t.name}"?`)) return
    await fetch(`/api/treatments/${t.id}`, { method: 'DELETE' })
    setTreatments(prev => prev.filter(tr => tr.id !== t.id))
  }

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
  const labelClass = "block text-sm font-medium text-brand-800 mb-1.5"

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={startNew} className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2.5 rounded-xl transition shadow-sm text-sm">
          <Plus size={16} /> טיפול חדש
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6">
          <h2 className="font-semibold text-brand-900 mb-4">{editing ? 'עריכת טיפול' : 'טיפול חדש'}</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className={labelClass}>שם הטיפול *</label><input required value={form.name} onChange={e => set('name', e.target.value)} className={inputClass} placeholder="לק ג׳ל..." /></div>
              <div><label className={labelClass}>מחיר (₪)</label><input type="number" value={form.defaultPrice} onChange={e => set('defaultPrice', parseFloat(e.target.value)||0)} className={inputClass} min="0" dir="ltr" /></div>
              <div><label className={labelClass}>משך (דקות)</label><input type="number" value={form.durationMinutes} onChange={e => set('durationMinutes', parseInt(e.target.value)||60)} className={inputClass} min="5" step="5" dir="ltr" /></div>
              <div><label className={labelClass}>מרווח (דקות)</label><input type="number" value={form.bufferMinutes} onChange={e => set('bufferMinutes', parseInt(e.target.value)||0)} className={inputClass} min="0" step="5" dir="ltr" /></div>
            </div>
            <div><label className={labelClass}>תיאור</label><textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className={inputClass} /></div>
            <div>
              <label className={labelClass}>צבע ביומן</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => set('color', c)} className="w-8 h-8 rounded-full transition hover:scale-110 shadow-sm" style={{ backgroundColor: c }}>
                    {form.color === c && <Check size={14} className="mx-auto text-white" />}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="w-4 h-4 rounded accent-brand-500" />
              <span className="text-sm font-medium text-brand-800">פעיל</span>
            </label>

            <div className="bg-brand-50 rounded-xl p-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.studentDiscountEnabled} onChange={e => set('studentDiscountEnabled', e.target.checked)} className="w-4 h-4 rounded accent-brand-500" />
                <span className="text-sm font-medium text-brand-800">אפשרי הנחת חיילת/סטודנטית בטיפול זה</span>
              </label>
              {form.studentDiscountEnabled && (
                <div>
                  <label className={labelClass}>אחוז הנחה (%)</label>
                  <input type="number" value={form.studentDiscountPercent} onChange={e => set('studentDiscountPercent', parseFloat(e.target.value) || 0)} className={inputClass} min="0" max="100" step="1" dir="ltr" />
                </div>
              )}
            </div>

            {error && <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 border border-red-100">{error}</div>}
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-semibold rounded-xl transition">{loading ? 'שומרת...' : editing ? 'שמירה' : 'הוספה'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null) }} className="px-5 py-3 border border-brand-200 text-brand-700 hover:bg-brand-50 font-medium rounded-xl transition">ביטול</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-2">
        {treatments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-brand-100 shadow-sm px-6 py-12 text-center"><div className="text-4xl mb-3">✂️</div><p className="text-brand-800 font-medium">אין טיפולים עדיין</p></div>
        ) : treatments.map(t => (
          <div key={t.id} className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-brand-900">{t.name}</p>
                {!t.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">לא פעיל</span>}
              </div>
              <div className="flex gap-4 text-xs text-muted mt-1 flex-wrap">
                <span>{t.durationMinutes} דק׳</span>
                <span>מרווח: {t.bufferMinutes} דק׳</span>
                <span className="font-medium text-brand-600">{formatCurrency(t.defaultPrice)}</span>
                {t.studentDiscountEnabled && (
                  <span className="text-amber-600 font-medium">הנחת חיילת/סטודנטית: {t.studentDiscountPercent}%</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => toggleActive(t)} className={`text-xs px-3 py-1.5 rounded-xl font-medium transition ${t.isActive ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>{t.isActive ? 'פעיל' : 'לא פעיל'}</button>
              <button onClick={() => startEdit(t)} className="p-2 rounded-xl hover:bg-brand-50 text-muted hover:text-brand-600 transition"><Edit size={15} /></button>
              <button onClick={() => handleDelete(t)} className="p-2 rounded-xl hover:bg-red-50 text-muted hover:text-red-500 transition"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
