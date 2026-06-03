'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

export function ReceiptActions({ receiptId, receiptNumber }: { receiptId: string; receiptNumber: number }) {
  const router = useRouter()
  const [showCancel, setShowCancel] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCancel() {
    if (!reason.trim()) return
    setLoading(true)
    await fetch(`/api/receipts/${receiptId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    setLoading(false)
    router.refresh()
  }

  if (showCancel) return (
    <div className="flex items-center gap-2">
      <input
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder="סיבת ביטול..."
        className="px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-red-300"
        autoFocus
      />
      <button onClick={handleCancel} disabled={loading || !reason.trim()} className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition disabled:opacity-50">
        {loading ? 'מבטלת...' : 'אשרי ביטול'}
      </button>
      <button onClick={() => setShowCancel(false)} className="p-2 text-muted hover:text-brand-600 transition"><X size={16} /></button>
    </div>
  )

  return (
    <button
      onClick={() => setShowCancel(true)}
      className="bg-red-50 hover:bg-red-100 text-red-600 font-medium px-4 py-2.5 rounded-xl transition text-sm"
    >
      ביטול קבלה #{receiptNumber}
    </button>
  )
}
