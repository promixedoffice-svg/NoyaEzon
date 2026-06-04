'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Trash2, ChevronDown, TrendingDown } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

type ExpenseCategory =
  | 'materials' | 'equipment' | 'furniture' | 'marketing'
  | 'training' | 'utilities' | 'rent' | 'taxes' | 'hygiene' | 'other'

const CATEGORIES: { value: ExpenseCategory; label: string; emoji: string; examples: string }[] = [
  { value: 'materials', label: 'חומרים ומוצרים', emoji: '💅', examples: 'לק ג׳ל, אקריל, טופ קוט, בייס קוט, מסיר, גל, צבעים, ניל ארט' },
  { value: 'equipment', label: 'ציוד מקצועי', emoji: '🔧', examples: 'מנורת LED/UV, מכשיר חשמלי, קבצים, פוצרים, מדחן, כלי עבודה' },
  { value: 'hygiene', label: 'היגיינה ובריאות', emoji: '🧤', examples: 'כפפות, מסכות, חומרי חיטוי, אלכוהול, מגבוניות, נייר חד פעמי' },
  { value: 'furniture', label: 'ריהוט ועיצוב', emoji: '🛋️', examples: 'שולחן עבודה, כורסא, תאורה, מדפים, קישוטים, ספה ללקוחות' },
  { value: 'marketing', label: 'שיווק ופרסום', emoji: '📣', examples: 'אינסטגרם, טיקטוק, עיצוב גרפי, צילום, כרטיסי ביקור, ביוסייט' },
  { value: 'training', label: 'הכשרה וקורסים', emoji: '🎓', examples: 'קורסי ג׳ל, הכשרות מקצועיות, וובינרים, תעודות, ספרים מקצועיים' },
  { value: 'utilities', label: 'חשמל ותשתיות', emoji: '⚡', examples: 'חשמל, אינטרנט, טלפון, מים, עמלת אשראי' },
  { value: 'rent', label: 'שכירות', emoji: '🏠', examples: 'שכירות מקום עבודה, ועד בית, חנייה' },
  { value: 'taxes', label: 'מיסים וביטוח', emoji: '📋', examples: 'ביטוח לאומי, מס הכנסה, מע"מ, ביטוח מקצועי, רואה חשבון' },
  { value: 'other', label: 'אחר', emoji: '📦', examples: 'הוצאות שונות' },
]

const categoryMap = Object.fromEntries(CATEGORIES.map(c => [c.value, c]))

interface Expense {
  id: string
  category: ExpenseCategory
  description: string
  amount: number
  date: Date | string
  notes: string | null
}

interface Props {
  initialExpenses: Expense[]
  yearTotal: number
  currentMonth: string
}

const emptyForm = { category: 'materials' as ExpenseCategory, description: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' }

export function ExpensesManager({ initialExpenses, yearTotal, currentMonth }: Props) {
  const router = useRouter()
  const [expenses, setExpenses] = useState(initialExpenses)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [showCategoryGuide, setShowCategoryGuide] = useState(false)

  const monthTotal = expenses.reduce((s, e) => s + e.amount, 0)

  const byCategory = CATEGORIES.map(cat => ({
    ...cat,
    total: expenses.filter(e => e.category === cat.value).reduce((s, e) => s + e.amount, 0),
    count: expenses.filter(e => e.category === cat.value).length,
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  async function fetchMonth(month: string) {
    setSelectedMonth(month)
    const res = await fetch(`/api/expenses?month=${month}`)
    const data = await res.json()
    setExpenses(data)
  }

  function startEdit(e: Expense) {
    setForm({
      category: e.category,
      description: e.description,
      amount: String(e.amount),
      date: new Date(e.date).toISOString().split('T')[0],
      notes: e.notes ?? '',
    })
    setEditingId(e.id)
    setShowForm(true)
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setLoading(true)

    const url = editingId ? `/api/expenses/${editingId}` : '/api/expenses'
    const method = editingId ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)

    if (editingId) {
      setExpenses(prev => prev.map(e => e.id === editingId ? data : e))
    } else {
      const eMonth = new Date(form.date).toISOString().substring(0, 7)
      if (eMonth === selectedMonth) setExpenses(prev => [data, ...prev])
    }

    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('למחוק הוצאה זו?')) return
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
  const monthName = new Date(selectedMonth + '-01').toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={16} className="text-red-400" />
            <span className="text-xs text-muted">הוצאות {monthName}</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(monthTotal)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={16} className="text-orange-400" />
            <span className="text-xs text-muted">הוצאות השנה</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(yearTotal)}</p>
        </div>
      </div>

      {/* By category summary */}
      {byCategory.length > 0 && (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-muted uppercase mb-3">לפי קטגוריה — {monthName}</p>
          <div className="space-y-2">
            {byCategory.map(cat => {
              const pct = monthTotal > 0 ? (cat.total / monthTotal * 100) : 0
              return (
                <div key={cat.value}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-brand-900">{cat.emoji} {cat.label}</span>
                    <span className="text-red-600 font-semibold">{formatCurrency(cat.total)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-300 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <input type="month" value={selectedMonth} onChange={e => fetchMonth(e.target.value)}
          className="px-3 py-2 rounded-xl border border-brand-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition" dir="ltr" />
        <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(!showForm) }}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2.5 rounded-xl transition text-sm">
          <Plus size={16} /> הוצאה חדשה
        </button>
        <button onClick={() => setShowCategoryGuide(!showCategoryGuide)}
          className="text-sm text-muted hover:text-brand-600 transition flex items-center gap-1">
          מה להכניס? <ChevronDown size={14} className={`transition-transform ${showCategoryGuide ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Category guide */}
      {showCategoryGuide && (
        <div className="bg-brand-50 rounded-2xl border border-brand-100 p-4 grid sm:grid-cols-2 gap-2">
          {CATEGORIES.map(cat => (
            <div key={cat.value} className="text-xs">
              <span className="font-semibold text-brand-800">{cat.emoji} {cat.label}:</span>
              <span className="text-muted ml-1">{cat.examples}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5">
          <h3 className="font-semibold text-brand-900 mb-4">{editingId ? 'עריכת הוצאה' : 'הוצאה חדשה'}</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-brand-700 mb-1">קטגוריה *</label>
              <select required value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as ExpenseCategory }))} className={inputClass}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-700 mb-1">תיאור *</label>
              <input required value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className={inputClass} placeholder={`לדוגמה: ${categoryMap[form.category]?.examples.split(',')[0]}`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">סכום (₪) *</label>
                <input required type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  className={inputClass} min="0" step="0.01" dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">תאריך</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className={inputClass} dir="ltr" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-700 mb-1">הערות</label>
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={inputClass} placeholder="פרטים נוספים..." />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-semibold rounded-xl transition text-sm">
                {loading ? 'שומרת...' : editingId ? 'שמירת שינויים' : 'הוספת הוצאה'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm) }}
                className="px-4 py-2.5 border border-brand-200 text-brand-700 hover:bg-brand-50 rounded-xl transition text-sm">ביטול</button>
            </div>
          </form>
        </div>
      )}

      {/* Expenses list */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
        {expenses.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-brand-800 font-medium">אין הוצאות ב{monthName}</p>
            <p className="text-muted text-sm mt-1">הוסיפי הוצאה ראשונה</p>
          </div>
        ) : (
          <div className="divide-y divide-brand-50">
            {expenses.map(e => {
              const cat = categoryMap[e.category]
              return (
                <div key={e.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-brand-50/30 transition">
                  <span className="text-xl shrink-0">{cat?.emoji ?? '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-brand-900 text-sm truncate">{e.description}</p>
                    <div className="flex gap-2 text-xs text-muted mt-0.5">
                      <span className="bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded-md">{cat?.label}</span>
                      <span>{formatDate(e.date)}</span>
                      {e.notes && <span className="italic truncate max-w-[120px]">{e.notes}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-red-600 text-sm">{formatCurrency(e.amount)}</span>
                    <button onClick={() => startEdit(e)} className="p-1.5 rounded-lg hover:bg-brand-50 text-muted hover:text-brand-600 transition"><Edit size={13} /></button>
                    <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted hover:text-red-500 transition"><Trash2 size={13} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
