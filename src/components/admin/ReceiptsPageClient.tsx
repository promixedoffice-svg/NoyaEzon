'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AddReceiptForm } from './AddReceiptForm'

interface Client { id: string; fullName: string }

export function ReceiptsPageClient({ clients }: { clients: Client[] }) {
  const [showForm, setShowForm] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2.5 rounded-xl transition shadow-sm text-sm"
      >
        <Plus size={16} /> הפקת קבלה
      </button>
      {showForm && <AddReceiptForm clients={clients} onClose={() => setShowForm(false)} />}
    </>
  )
}
