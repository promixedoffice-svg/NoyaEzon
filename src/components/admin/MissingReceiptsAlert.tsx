'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Check, X, FileText } from 'lucide-react'
import { formatDateTime, formatCurrency } from '@/lib/utils'

interface Appointment {
  id: string
  startAt: string | Date
  price: number | null
  clientName: string
  treatmentName: string
  clientId: string | null
}

export function MissingReceiptsAlert({ appointments }: { appointments: Appointment[] }) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState<string[]>([])
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const visible = appointments.filter(a => !dismissed.includes(a.id))
  if (visible.length === 0) return null

  async function markNoTreatment(id: string) {
    setLoadingId(id)
    await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled', cancelledReason: 'הטיפול לא התקיים' }),
    })
    setLoadingId(null)
    setDismissed(prev => [...prev, id])
    router.refresh()
  }

  return (
    <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 bg-orange-100/50">
        <AlertTriangle size={18} className="text-orange-500 shrink-0" />
        <p className="font-semibold text-orange-800 text-sm">{visible.length} טיפולים שהסתיימו ללא קבלה</p>
      </div>
      <div className="divide-y divide-orange-100">
        {visible.map(appt => (
          <div key={appt.id} className="flex items-center gap-3 px-5 py-3.5 bg-white/60">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-brand-900 text-sm truncate">{appt.clientName}</p>
              <p className="text-xs text-muted">{appt.treatmentName} · {formatDateTime(appt.startAt)}</p>
              {appt.price && <p className="text-xs font-medium text-brand-600">{formatCurrency(appt.price)}</p>}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={(() => {
                  const p = new URLSearchParams({ new: '1', clientName: appt.clientName, service: appt.treatmentName })
                  if (appt.clientId) p.set('clientId', appt.clientId)
                  if (appt.price) p.set('amount', String(appt.price))
                  return `/admin/receipts?${p.toString()}`
                })()}
                className="flex items-center gap-1 text-xs bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-lg transition font-medium"
              >
                <FileText size={11} /> קבלה
              </a>
              <button
                onClick={() => markNoTreatment(appt.id)}
                disabled={loadingId === appt.id}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg transition font-medium"
              >
                {loadingId === appt.id ? '...' : 'לא התקיים'}
              </button>
              <button onClick={() => setDismissed(prev => [...prev, appt.id])} className="text-muted hover:text-brand-600 transition">
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
