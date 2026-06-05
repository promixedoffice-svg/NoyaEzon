'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { AddReceiptForm } from './AddReceiptForm'

interface Client { id: string; fullName: string }

interface Prefill {
  clientId?: string
  clientName?: string
  service?: string
  amount?: string
}

export function ReceiptsPageClient({
  clients,
  prefill,
}: {
  clients: Client[]
  prefill?: Prefill | null
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(!!prefill)

  function handleClose() {
    setShowForm(false)
    // Clean URL params if we came from a prefill
    if (prefill) router.replace('/admin/receipts')
  }

  return (
    <>
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2.5 rounded-xl transition shadow-sm text-sm"
      >
        <Plus size={16} /> הפקת קבלה
      </button>
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
