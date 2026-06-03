'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Plus } from 'lucide-react'

interface Props {
  debtId: string
  clientId: string
  visitId: string | null
  originalAmount: number
  paidAmount: number
}

export function DebtActions({ debtId, clientId, visitId, originalAmount, paidAmount }: Props) {
  const router = useRouter()
  const [showPartial, setShowPartial] = useState(false)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  async function markPaid() {
    if (!confirm('לסמן כשולם במלא?')) return
    setLoading(true)
    const balance = originalAmount - paidAmount
    await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, visitId, amount: balance, method: 'cash' }) })
    await fetch(`/api/debts/${debtId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'closed', paidAmount: originalAmount }) })
    setLoading(false); router.refresh()
  }

  async function addPartial() {
    const val = parseFloat(amount)
    if (!val || val <= 0) return
    setLoading(true)
    const newPaid = paidAmount + val
    const newStatus = newPaid >= originalAmount ? 'closed' : 'partial'
    await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, visitId, amount: val, method: 'cash' }) })
    await fetch(`/api/debts/${debtId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paidAmount: newPaid, status: newStatus }) })
    setLoading(false); setShowPartial(false); setAmount(''); router.refresh()
  }

  if (showPartial) return (
    <div className="flex items-center gap-2">
      <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-24 px-2 py-1.5 rounded-lg border border-brand-200 text-sm bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-400" placeholder="₪" min="0" dir="ltr" autoFocus />
      <button onClick={addPartial} disabled={loading} className="text-xs bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-lg transition font-medium">אשר</button>
      <button onClick={() => { setShowPartial(false); setAmount('') }} className="text-xs text-muted hover:text-brand-700 transition">ביטול</button>
    </div>
  )

  return (
    <div className="flex items-center gap-2">
      <button onClick={markPaid} disabled={loading} className="flex items-center gap-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg transition font-medium"><Check size={12} /> שולם</button>
      <button onClick={() => setShowPartial(true)} className="flex items-center gap-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg transition font-medium"><Plus size={12} /> חלקי</button>
    </div>
  )
}
