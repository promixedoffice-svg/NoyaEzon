'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, X } from 'lucide-react'

interface CustomQuestion {
  id: string
  label: string
  type: 'single' | 'multi'
  options: string[]
  isActive: boolean
}

type FormState = { label: string; type: 'single' | 'multi'; options: string[] }

const defaultForm: FormState = { label: '', type: 'single', options: ['', ''] }

export function CustomQuestionsManager({ questions: initial }: { questions: CustomQuestion[] }) {
  const [questions, setQuestions] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CustomQuestion | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function startNew() { setForm(defaultForm); setEditing(null); setShowForm(true) }
  function startEdit(q: CustomQuestion) {
    setForm({ label: q.label, type: q.type, options: q.options.length ? q.options : ['', ''] })
    setEditing(q); setShowForm(true)
  }

  function setOption(i: number, value: string) {
    setForm(prev => ({ ...prev, options: prev.options.map((o, idx) => idx === i ? value : o) }))
  }
  function addOption() { setForm(prev => ({ ...prev, options: [...prev.options, ''] })) }
  function removeOption(i: number) { setForm(prev => ({ ...prev, options: prev.options.filter((_, idx) => idx !== i) })) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const url = editing ? `/api/custom-questions/${editing.id}` : '/api/custom-questions'
    const method = editing ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'שגיאה'); return }
    if (editing) { setQuestions(prev => prev.map(q => q.id === editing.id ? data : q)) }
    else { setQuestions(prev => [...prev, data]) }
    setShowForm(false); setEditing(null)
  }

  async function toggleActive(q: CustomQuestion) {
    const res = await fetch(`/api/custom-questions/${q.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !q.isActive }) })
    const data = await res.json()
    if (res.ok) setQuestions(prev => prev.map(qq => qq.id === q.id ? data : qq))
  }

  async function handleDelete(q: CustomQuestion) {
    if (!confirm(`למחוק את השאלה "${q.label}"?`)) return
    await fetch(`/api/custom-questions/${q.id}`, { method: 'DELETE' })
    setQuestions(prev => prev.filter(qq => qq.id !== q.id))
  }

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
  const labelClass = "block text-sm font-medium text-brand-800 mb-1.5"

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted -mt-2">שאלות שיוצגו ללקוחה חדשה (בטופס ההזמנה ובכרטיס לקוחה חדשה במערכת), לדוגמה רגישויות, העדפות ועוד.</p>
      <div className="flex justify-end">
        <button onClick={startNew} className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2.5 rounded-xl transition shadow-sm text-sm">
          <Plus size={16} /> שאלה חדשה
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6">
          <h3 className="font-semibold text-brand-900 mb-4">{editing ? 'עריכת שאלה' : 'שאלה חדשה'}</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className={labelClass}>נוסח השאלה *</label>
              <input required value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} className={inputClass} placeholder="לדוגמה: האם יש לך רגישות לחומרים?" />
            </div>
            <div>
              <label className={labelClass}>סוג בחירה</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as 'single' | 'multi' }))} className={inputClass}>
                <option value="single">בחירה יחידה</option>
                <option value="multi">בחירה מרובה (אפשר לסמן כמה)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>אפשרויות בחירה *</label>
              <div className="space-y-2">
                {form.options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={opt} onChange={e => setOption(i, e.target.value)} className={inputClass} placeholder={`אפשרות ${i + 1}`} />
                    {form.options.length > 2 && (
                      <button type="button" onClick={() => removeOption(i)} className="p-2.5 rounded-xl hover:bg-red-50 text-muted hover:text-red-500 transition shrink-0"><X size={16} /></button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addOption} className="mt-2 text-sm text-brand-600 hover:text-brand-700 transition flex items-center gap-1"><Plus size={14} /> הוספת אפשרות</button>
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
        {questions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-brand-100 shadow-sm px-6 py-8 text-center"><p className="text-brand-800 font-medium">אין שאלות מותאמות אישית עדיין</p></div>
        ) : questions.map(q => (
          <div key={q.id} className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-brand-900">{q.label}</p>
                {!q.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">לא פעיל</span>}
              </div>
              <p className="text-xs text-muted mt-1">{q.type === 'multi' ? 'בחירה מרובה' : 'בחירה יחידה'} · {q.options.join(', ')}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => toggleActive(q)} className={`text-xs px-3 py-1.5 rounded-xl font-medium transition ${q.isActive ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>{q.isActive ? 'פעיל' : 'לא פעיל'}</button>
              <button onClick={() => startEdit(q)} className="p-2 rounded-xl hover:bg-brand-50 text-muted hover:text-brand-600 transition"><Edit size={15} /></button>
              <button onClick={() => handleDelete(q)} className="p-2 rounded-xl hover:bg-red-50 text-muted hover:text-red-500 transition"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
