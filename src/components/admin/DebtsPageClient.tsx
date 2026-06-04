'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatCurrency, debtStatusLabel } from '@/lib/utils'
import { Plus, Edit, Trash2, Check, ChevronDown, ChevronUp, X } from 'lucide-react'

interface Debt {
  id: string
  originalAmount: number
  paidAmount: number
  status: string
  notes: string | null
  createdAt: Date | string
  client: { id: string; fullName: string; phone: string | null; email: string | null }
  visit: { treatmentName: string; visitedAt: Date | string } | null
}

interface Client { id: string; fullName: string }

interface Props {
  debts: Debt[]
  clients: Client[]
  closedCount: number
}

export function DebtsPageClient({ debts: initialDebts, clients, closedCount }: Props) {
  const router = useRouter()
  const [debts, setDebts] = useState(initialDebts)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  // Add form
  const [addForm, setAddForm] = useState({ clientId: '', originalAmount: '', notes: '' })

  // Payment form
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash' })

  // Edit form
  const [editForm, setEditForm] = useState({ originalAmount: '', notes: '' })

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading('add')
    const res = await fetch('/api/debts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: addForm.clientId,
        originalAmount: parseFloat(addForm.originalAmount),
        notes: addForm.notes || null,
      }),
    })
    const data = await res.json()
    setLoading(null)
    setShowAddForm(false)
    setAddForm({ clientId: '', originalAmount: '', notes: '' })
    router.refresh()
  }

  async function handlePayment(debtId: string, debt: Debt) {
    const val = parseFloat(payForm.amount)
    if (!val || val <= 0) return
    setLoading(debtId)
    const newPaid = debt.paidAmount + val
    await fetch(`/api/debts/${debtId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paidAmount: newPaid,
        paymentAmount: val,
        paymentMethod: payForm.method,
      }),
    })
    setLoading(null)
    setPayingId(null)
    setPayForm({ amount: '', method: 'cash' })
    router.refresh()
  }

  async function handleClose(debtId: string, debt: Debt) {
    setLoading(debtId)
    await fetch(`/api/debts/${debtId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'closed', paidAmount: debt.originalAmount }),
    })
    setLoading(null)
    router.refresh()
  }

  async function handleEdit(debtId: string) {
    setLoading(debtId)
    await fetch(`/api/debts/${debtId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalAmount: parseFloat(editForm.originalAmount),
        notes: editForm.notes || null,
      }),
    })
    setLoading(null)
    setEditingId(null)
    router.refresh()
  }

  async function handleDelete(debtId: string) {
    if (!confirm('למחוק את החוב?')) return
    setLoading(debtId)
    await fetch(`/api/debts/${debtId}`, { method: 'DELETE' })
    setLoading(null)
    router.refresh()
  }

  const inputClass = "w-full px-3 py-2 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"

  return (
    <div className="space-y-4">
      {/* Add debt button */}
      <div className="flex items-center gap-2">
        <button onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2.5 rounded-xl transition text-sm">
          <Plus size={16} /> חוב חדש
        </button>
        {closedCount > 0 && (
          <Link href="/admin/debts?show=closed"
            className="text-sm text-muted hover:text-brand-600 transition">
            היסטוריה ({closedCount} סגורים) →
          </Link>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5">
          <h3 className="font-semibold text-brand-900 mb-4">הוספת חוב חדש</h3>
          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-brand-700 mb-1">לקוחה *</label>
              <select required value={addForm.clientId} onChange={e => setAddForm(p => ({ ...p, clientId: e.target.value }))} className={inputClass}>
                <option value="">בחרי לקוחה...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">סכום חוב (₪) *</label>
                <input required type="number" value={addForm.originalAmount} onChange={e => setAddForm(p => ({ ...p, originalAmount: e.target.value }))} className={inputClass} min="0" step="0.01" dir="ltr" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-700 mb-1">הערות</label>
              <input value={addForm.notes} onChange={e => setAddForm(p => ({ ...p, notes: e.target.value }))} className={inputClass} placeholder="פרטים..." />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading === 'add'}
                className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-medium rounded-xl transition text-sm">
                {loading === 'add' ? 'שומרת...' : 'הוספת חוב'}
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2.5 border border-brand-200 text-brand-700 hover:bg-brand-50 rounded-xl transition text-sm">ביטול</button>
            </div>
          </form>
        </div>
      )}

      {/* Debts list */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
        {debts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-brand-800 font-medium">אין חובות פתוחים</p>
          </div>
        ) : (
          <div className="divide-y divide-brand-50">
            {debts.map(d => {
              const balance = d.originalAmount - d.paidAmount
              const days = Math.floor((Date.now() - new Date(d.createdAt).getTime()) / (1000 * 60 * 60 * 24))
              const isEditing = editingId === d.id
              const isPaying = payingId === d.id

              return (
                <div key={d.id} className="p-4 hover:bg-brand-50/30 transition">
                  <div className="flex items-start gap-3">
                    {/* Client + info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/admin/clients/${d.client.id}`} className="font-semibold text-brand-900 hover:text-brand-600 transition">
                          {d.client.fullName}
                        </Link>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {debtStatusLabel(d.status as any)}
                        </span>
                        <span className={`text-xs font-medium ${days > 30 ? 'text-red-500' : days > 7 ? 'text-amber-500' : 'text-muted'}`}>
                          {days} ימים
                        </span>
                      </div>
                      {d.visit && (
                        <p className="text-xs text-muted mt-0.5">{d.visit.treatmentName} · {formatDate(d.visit.visitedAt)}</p>
                      )}
                      {d.notes && <p className="text-xs text-muted italic mt-0.5">{d.notes}</p>}
                      <div className="flex gap-3 mt-1.5 text-sm">
                        <span className="text-muted">חוב: <span className="font-medium text-brand-900">{formatCurrency(d.originalAmount)}</span></span>
                        {d.paidAmount > 0 && <span className="text-green-600">שולם: {formatCurrency(d.paidAmount)}</span>}
                        <span className="font-bold text-red-600">{formatCurrency(balance)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => { setPayingId(isPaying ? null : d.id); setPayForm({ amount: '', method: 'cash' }) }}
                        className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition ${isPaying ? 'bg-brand-500 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                        {isPaying ? 'ביטול' : <><Check size={11} className="inline ml-1" />תשלום</>}
                      </button>
                      <button onClick={() => handleClose(d.id, d)} disabled={loading === d.id}
                        className="text-xs px-2.5 py-1.5 rounded-lg font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 transition">
                        סגור
                      </button>
                      <button onClick={() => { setEditingId(isEditing ? null : d.id); setEditForm({ originalAmount: String(d.originalAmount), notes: d.notes ?? '' }) }}
                        className="p-1.5 rounded-lg hover:bg-brand-50 text-muted hover:text-brand-600 transition">
                        <Edit size={13} />
                      </button>
                      <button onClick={() => handleDelete(d.id)} disabled={loading === d.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-muted hover:text-red-500 transition">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Payment form */}
                  {isPaying && (
                    <div className="mt-3 flex items-center gap-2 bg-green-50 rounded-xl p-3">
                      <input type="number" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
                        placeholder="סכום ₪" className="flex-1 px-3 py-2 rounded-xl border border-green-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition" min="0" dir="ltr" autoFocus />
                      <select value={payForm.method} onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))}
                        className="px-3 py-2 rounded-xl border border-green-200 bg-white text-sm focus:outline-none">
                        <option value="cash">מזומן</option>
                        <option value="bit">ביט</option>
                        <option value="paybox">פייבוקס</option>
                        <option value="credit">אשראי</option>
                        <option value="transfer">העברה</option>
                      </select>
                      <button onClick={() => handlePayment(d.id, d)} disabled={!payForm.amount || loading === d.id}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-medium rounded-xl transition text-sm">
                        {loading === d.id ? '...' : 'אשרי'}
                      </button>
                    </div>
                  )}

                  {/* Edit form */}
                  {isEditing && (
                    <div className="mt-3 flex items-center gap-2 bg-brand-50 rounded-xl p-3">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input type="number" value={editForm.originalAmount} onChange={e => setEditForm(p => ({ ...p, originalAmount: e.target.value }))}
                          placeholder="סכום חוב ₪" className="px-3 py-2 rounded-xl border border-brand-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition" dir="ltr" />
                        <input value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                          placeholder="הערות..." className="px-3 py-2 rounded-xl border border-brand-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition" />
                      </div>
                      <button onClick={() => handleEdit(d.id)} disabled={loading === d.id}
                        className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-medium rounded-xl transition text-sm">
                        {loading === d.id ? '...' : 'שמור'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
