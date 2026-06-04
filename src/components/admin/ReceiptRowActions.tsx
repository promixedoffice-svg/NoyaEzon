'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, RotateCcw, X, MessageCircle, Mail } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Props {
  receiptId: string
  receiptNumber: number
  isDeleted: boolean
  isCancelled: boolean
  clientPhone: string | null
  clientEmail: string | null
  amount: number
  serviceDescription: string
  clientName: string
}

export function ReceiptRowActions({
  receiptId, receiptNumber, isDeleted, isCancelled,
  clientPhone, clientEmail, amount, serviceDescription, clientName
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  async function patch(action: string, extra?: object) {
    setLoading(true)
    await fetch(`/api/receipts/${receiptId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
    setLoading(false)
    router.refresh()
  }

  async function hardDelete() {
    setLoading(true)
    await fetch(`/api/receipts/${receiptId}`, { method: 'DELETE' })
    setLoading(false)
    router.refresh()
  }

  function getWhatsAppLink() {
    if (!clientPhone) return null
    const clean = clientPhone.replace(/\D/g, '').replace(/^0/, '972')
    const msg = encodeURIComponent(`שלום ${clientName}! 💅\nקבלה מספר #${receiptNumber}\nשירות: ${serviceDescription}\nסכום: ${formatCurrency(amount)}\nתודה!`)
    return `https://wa.me/${clean}?text=${msg}`
  }

  if (isDeleted) {
    return (
      <div className="flex items-center gap-1.5">
        <button onClick={() => patch('restore')} disabled={loading}
          className="flex items-center gap-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 px-2.5 py-1.5 rounded-lg transition font-medium">
          <RotateCcw size={11} /> שחזור
        </button>
        {showDeleteConfirm ? (
          <>
            <button onClick={hardDelete} disabled={loading}
              className="text-xs bg-red-500 hover:bg-red-600 text-white px-2.5 py-1.5 rounded-lg transition font-medium">
              {loading ? '...' : 'מחיקה'}
            </button>
            <button onClick={() => setShowDeleteConfirm(false)} className="text-xs text-muted hover:text-brand-600 transition">ביטול</button>
          </>
        ) : (
          <button onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 rounded-lg transition font-medium">
            <Trash2 size={11} /> מחיקה סופית
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Send WhatsApp */}
      {clientPhone && getWhatsAppLink() && (
        <a href={getWhatsAppLink()!} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 px-2.5 py-1.5 rounded-lg transition font-medium">
          <MessageCircle size={11} /> WhatsApp
        </a>
      )}

      {/* Cancel (accounting) */}
      {!isCancelled && (
        showCancel ? (
          <div className="flex items-center gap-1.5">
            <input value={cancelReason} onChange={e => setCancelReason(e.target.value)}
              placeholder="סיבת ביטול..." autoFocus
              className="text-xs px-2 py-1.5 rounded-lg border border-red-200 bg-red-50 w-28 focus:outline-none focus:ring-1 focus:ring-red-300" />
            <button onClick={() => { patch('cancel', { reason: cancelReason }); setShowCancel(false) }}
              disabled={!cancelReason.trim() || loading}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1.5 rounded-lg transition font-medium disabled:opacity-50">
              אשר
            </button>
            <button onClick={() => setShowCancel(false)} className="text-xs text-muted"><X size={12} /></button>
          </div>
        ) : (
          <button onClick={() => setShowCancel(true)}
            className="text-xs text-amber-600 hover:text-amber-800 transition font-medium">
            ביטול
          </button>
        )
      )}

      {/* Soft delete to recycle bin */}
      <button onClick={() => patch('delete')} disabled={loading}
        className="flex items-center gap-1 text-xs text-muted hover:text-red-500 transition">
        <Trash2 size={11} />
      </button>
    </div>
  )
}
