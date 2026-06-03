'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { X, Lock, Plus } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

interface BlockedTime { id: string; startAt: string; endAt: string; reason: string | null; isVacation: boolean }

export function BlockedTimesManager() {
  const [blocked, setBlocked] = useState<BlockedTime[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ startDate: '', startTime: '09:00', endDate: '', endTime: '18:00', reason: '', isVacation: false })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/blocked-times').then(r => r.json()).then(setBlocked)
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const res = await fetch('/api/blocked-times', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startAt: new Date(`${form.startDate}T${form.startTime}:00`).toISOString(),
        endAt: new Date(`${form.endDate}T${form.endTime}:00`).toISOString(),
        reason: form.reason || null,
        isVacation: form.isVacation,
      }),
    })
    const data = await res.json()
    setBlocked(prev => [...prev, data].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()))
    setLoading(false)
    setShowForm(false)
    setForm({ startDate: '', startTime: '09:00', endDate: '', endTime: '18:00', reason: '', isVacation: false })
  }

  async function handleDelete(id: string) {
    await fetch(`/api/blocked-times/${id}`, { method: 'DELETE' })
    setBlocked(prev => prev.filter(b => b.id !== id))
  }

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
  const upcoming = blocked.filter(b => new Date(b.endAt) > new Date())
  const past = blocked.filter(b => new Date(b.endAt) <= new Date())

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-brand-900 flex items-center gap-2"><Lock size={16} /> זמנים חסומים</h3>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 text-sm bg-brand-500 hover:bg-brand-600 text-white font-medium px-3 py-2 rounded-xl transition">
          <Plus size={14} /> חסימה חדשה
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5">
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-brand-800 mb-1">מתאריך</label>
                <input type="date" required value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value, endDate: p.endDate || e.target.value }))} className={inputClass} dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-800 mb-1">משעה</label>
                <input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} className={inputClass} dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-800 mb-1">עד תאריך</label>
                <input type="date" required value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} className={inputClass} dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-800 mb-1">עד שעה</label>
                <input type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} className={inputClass} dir="ltr" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-800 mb-1">סיבה (אופציונלי)</label>
              <input value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} className={inputClass} placeholder="חופשה, הכשרה..." />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isVacation} onChange={e => setForm(p => ({ ...p, isVacation: e.target.checked }))} className="w-4 h-4 rounded accent-brand-500" />
              <span className="text-sm text-brand-800">חופשה / יום חופש</span>
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition text-sm">
                {loading ? 'שומרת...' : 'הוספת חסימה'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 border border-brand-200 text-brand-700 hover:bg-brand-50 rounded-xl transition text-sm">ביטול</button>
            </div>
          </form>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted font-medium uppercase px-1">קרובות</p>
          {upcoming.map(b => (
            <div key={b.id} className={`flex items-center gap-3 bg-white rounded-xl border p-3 ${b.isVacation ? 'border-orange-200 bg-orange-50' : 'border-red-100 bg-red-50'}`}>
              <div className={`w-2 h-8 rounded-full shrink-0 ${b.isVacation ? 'bg-orange-400' : 'bg-red-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-900">
                  {b.isVacation ? '🏖️ ' : '🔒 '}{b.reason ?? (b.isVacation ? 'חופשה' : 'חסום')}
                </p>
                <p className="text-xs text-muted">{formatDateTime(b.startAt)} — {formatDateTime(b.endAt)}</p>
              </div>
              <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded-lg hover:bg-white/60 text-muted hover:text-red-500 transition">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {upcoming.length === 0 && !showForm && (
        <p className="text-sm text-muted text-center py-3">אין זמנים חסומים</p>
      )}

      {/* Past */}
      {past.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted hover:text-brand-600 transition px-1">הצגת היסטוריה ({past.length})</summary>
          <div className="mt-2 space-y-1">
            {past.map(b => (
              <div key={b.id} className="flex items-center gap-2 opacity-50 text-xs text-muted bg-gray-50 rounded-lg px-3 py-2">
                <span>{b.reason ?? 'חסום'}</span>
                <span>·</span>
                <span>{formatDateTime(b.startAt)}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
