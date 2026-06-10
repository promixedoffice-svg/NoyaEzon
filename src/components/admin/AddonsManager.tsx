'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { Plus, Edit, Trash2 } from 'lucide-react'

interface Addon {
  id: string
  name: string
  price: number
  isActive: boolean
}

const defaultForm = { name: '', price: 0 }

export function AddonsManager({ addons: initial }: { addons: Addon[] }) {
  const [addons, setAddons] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Addon | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function startNew() { setForm(defaultForm); setEditing(null); setShowForm(true) }
  function startEdit(a: Addon) {
    setForm({ name: a.name, price: a.price })
    setEditing(a); setShowForm(true)
  }
  function set(field: string, value: string | number) { setForm(prev => ({ ...prev, [field]: value })) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const url = editing ? `/api/addons/${editing.id}` : '/api/addons'
    const method = editing ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'שגיאה'); return }
    if (editing) { setAddons(prev => prev.map(a => a.id === editing.id ? data : a)) }
    else { setAddons(prev => [...prev, data]) }
    setShowForm(false); setEditing(null)
  }

  async function toggleActive(a: Addon) {
    const res = await fetch(`/api/addons/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !a.isActive }) })
    const data = await res.json()
    if (res.ok) setAddons(prev => prev.map(ad => ad.id === a.id ? data : ad))
  }

  async function handleDelete(a: Addon) {
    if (!confirm(`למחוק את "${a.name}"?`)) return
    await fetch(`/api/addons/${a.id}`, { method: 'DELETE' })
    setAddons(prev => prev.filter(ad => ad.id !== a.id))
  }

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
  const labelClass = "block text-sm font-medium text-brand-800 mb-1.5"

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted -mt-2">תוספות שיופיעו לבחירה ללקוחה בעת קביעת תור, בנוסף למחיר הטיפול.</p>
      <div className="flex justify-end">
        <button onClick={startNew} className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2.5 rounded-xl transition shadow-sm text-sm">
          <Plus size={16} /> תוספת חדשה
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6">
          <h3 className="font-semibold text-brand-900 mb-4">{editing ? 'עריכת תוספת' : 'תוספת חדשה'}</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className={labelClass}>שם התוספת *</label><input required value={form.name} onChange={e => set('name', e.target.value)} className={inputClass} placeholder="עיצוב ציפורן..." /></div>
              <div><label className={labelClass}>מחיר (₪)</label><input type="number" value={form.price} onChange={e => set('price', parseFloat(e.target.value) || 0)} className={inputClass} min="0" step="0.5" dir="ltr" /></div>
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
        {addons.length === 0 ? (
          <div className="bg-white rounded-2xl border border-brand-100 shadow-sm px-6 py-8 text-center"><p className="text-brand-800 font-medium">אין תוספות עדיין</p></div>
        ) : addons.map(a => (
          <div key={a.id} className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-brand-900">{a.name}</p>
                {!a.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">לא פעיל</span>}
              </div>
              <p className="text-xs font-medium text-brand-600 mt-1">{formatCurrency(a.price)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => toggleActive(a)} className={`text-xs px-3 py-1.5 rounded-xl font-medium transition ${a.isActive ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>{a.isActive ? 'פעיל' : 'לא פעיל'}</button>
              <button onClick={() => startEdit(a)} className="p-2 rounded-xl hover:bg-brand-50 text-muted hover:text-brand-600 transition"><Edit size={15} /></button>
              <button onClick={() => handleDelete(a)} className="p-2 rounded-xl hover:bg-red-50 text-muted hover:text-red-500 transition"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
