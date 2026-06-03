'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { Check, X, Clock, ChevronDown, MessageSquare } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Appointment {
  id: string
  guestName: string | null
  guestPhone: string | null
  guestEmail: string | null
  startAt: Date | string
  endAt: Date | string
  price: number | null
  notes: string | null
  treatment: { name: string; color: string } | null
}

export function PendingApprovals({ appointments }: { appointments: Appointment[] }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(true)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [localAppts, setLocalAppts] = useState(appointments)

  async function handleApprove(id: string) {
    setLoading(id)
    await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'confirmed', confirmedAt: new Date().toISOString() }),
    })
    setLocalAppts(prev => prev.filter(a => a.id !== id))
    setLoading(null)
    router.refresh()
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) return
    setLoading(id)
    const appt = localAppts.find(a => a.id === id)

    await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledReason: rejectReason,
      }),
    })

    // Send rejection email if email exists
    if (appt?.guestEmail) {
      await fetch('/api/appointments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: id, action: 'reject', reason: rejectReason }),
      })
    }

    setLocalAppts(prev => prev.filter(a => a.id !== id))
    setRejectingId(null)
    setRejectReason('')
    setLoading(null)
    router.refresh()
  }

  if (localAppts.length === 0) return null

  return (
    <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-amber-100/50 transition"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center">
            <Clock size={16} className="text-white" />
          </div>
          <div className="text-right">
            <p className="font-bold text-amber-900">{localAppts.length} בקשות ממתינות לאישור</p>
            <p className="text-xs text-amber-700">לחצי לאישור או דחייה</p>
          </div>
        </div>
        <ChevronDown size={18} className={`text-amber-600 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="divide-y divide-amber-200">
          {localAppts.map(appt => (
            <div key={appt.id} className="px-5 py-4 bg-white/60">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-1.5 h-10 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: appt.treatment?.color ?? '#d4605c' }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-brand-900">{appt.guestName ?? 'לקוחה'}</p>
                  <p className="text-sm text-muted">{appt.treatment?.name}</p>
                  <p className="text-sm font-medium text-brand-700 mt-0.5">
                    📅 {format(new Date(appt.startAt), 'EEEE, d MMMM · HH:mm', { locale: he })}
                  </p>
                  {appt.guestPhone && <p className="text-xs text-muted mt-0.5">📱 {appt.guestPhone}</p>}
                  {appt.price && <p className="text-xs text-brand-600 font-medium mt-0.5">{formatCurrency(appt.price)}</p>}
                  {appt.notes && (
                    <div className="mt-2 bg-brand-50 rounded-lg px-3 py-2 flex items-start gap-1.5">
                      <MessageSquare size={12} className="text-brand-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-brand-700 italic">"{appt.notes}"</p>
                    </div>
                  )}
                </div>
              </div>

              {rejectingId === appt.id ? (
                <div className="space-y-2">
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="סיבת הדחייה (תישלח ללקוחה)..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReject(appt.id)}
                      disabled={!rejectReason.trim() || loading === appt.id}
                      className="flex-1 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
                    >
                      {loading === appt.id ? 'שולחת...' : 'שלחי דחייה'}
                    </button>
                    <button
                      onClick={() => { setRejectingId(null); setRejectReason('') }}
                      className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm rounded-xl transition"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(appt.id)}
                    disabled={loading === appt.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
                  >
                    <Check size={15} /> אישור תור
                  </button>
                  <button
                    onClick={() => setRejectingId(appt.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-xl transition border border-red-100"
                  >
                    <X size={15} /> דחייה
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
