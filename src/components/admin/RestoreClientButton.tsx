'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'

export function RestoreClientButton({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleRestore() {
    setLoading(true)
    await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deletedAt: null }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <button onClick={handleRestore} disabled={loading}
      className="flex items-center gap-1.5 text-xs bg-green-50 hover:bg-green-100 text-green-700 font-medium px-3 py-1.5 rounded-xl transition disabled:opacity-50">
      <RotateCcw size={12} />
      {loading ? '...' : 'שחזור'}
    </button>
  )
}
