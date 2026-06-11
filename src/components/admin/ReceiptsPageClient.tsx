'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, FileText, Receipt as ReceiptIcon } from 'lucide-react'
import { AddReceiptForm } from './AddReceiptForm'
import { formatDateTime, formatCurrency } from '@/lib/utils'

interface Client { id: string; fullName: string }

interface PendingAppointment {
  id: string
  startAt: string | Date
  price: number | null
  clientName: string
  treatmentName: string
  clientId: string | null
}

interface Prefill {
  clientId?: string
  clientName?: string
  service?: string
  amount?: string
  addons?: { name: string; price: number }[]
  discountAmount?: string
  discountLabel?: string
}

export function ReceiptsPageClient({
  clients,
  pendingAppointments,
  prefill,
}: {
  clients: Client[]
  pendingAppointments: PendingAppointment[]
  prefill?: Prefill | null
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(!!prefill)
  const [showPicker, setShowPicker] = useState(false)

  function handleClose() {
    setShowForm(false)
    // Clean URL params if we came from a prefill
    if (prefill) router.replace('/admin/receipts')
  }

  function pendingHref(appt: PendingAppointment) {
    const p = new URLSearchParams({ new: '1', clientName: appt.clientName, service: appt.treatmentName })
    if (appt.clientId) p.set('clientId', appt.clientId)
    if (appt.price) p.set('amount', String(appt.price))
    return `/admin/receipts?${p.toString()}`
  }

  return (
    <>
      <button
        onClick={() => setShowPicker(true)}
        className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2.5 rounded-xl transition shadow-sm text-sm"
      >
        <Plus size={16} /> הפקת קבלה
      </button>

      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40" onClick={() => setShowPicker(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-50 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-brand-900">בחרי טיפול שהסתיים</h2>
              <button onClick={() => setShowPicker(false)} className="p-1.5 rounded-lg hover:bg-brand-50 text-muted transition"><X size={18} /></button>
            </div>
            {pendingAppointments.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <ReceiptIcon className="mx-auto mb-3 text-brand-200" size={36} />
                <p className="text-brand-800 font-medium text-sm">אין טיפולים שהסתיימו וממתינים לקבלה</p>
                <p className="text-xs text-muted mt-1">קבלה ניתן להפיק רק לאחר שהטיפול הסתיים</p>
              </div>
            ) : (
              <div className="divide-y divide-brand-50">
                {pendingAppointments.map(appt => (
                  <a key={appt.id} href={pendingHref(appt)} className="flex items-center gap-3 px-6 py-3.5 hover:bg-brand-50/60 transition">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-brand-900 text-sm truncate">{appt.clientName}</p>
                      <p className="text-xs text-muted">{appt.treatmentName} · {formatDateTime(appt.startAt)}</p>
                    </div>
                    {appt.price != null && <span className="text-sm font-medium text-brand-600 shrink-0">{formatCurrency(appt.price)}</span>}
                    <FileText size={14} className="text-brand-400 shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <AddReceiptForm
          clients={clients}
          defaultValues={prefill}
          onClose={handleClose}
        />
      )}
    </>
  )
}
